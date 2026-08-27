-- =============================================================
-- Fase 5 · compromisso ativo — imposição de Q-12 (P-30, Modelo A / A3)
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §11.6.3   (Q-06 domínio do resultado, Q-07 independência de planos)
--   §11.6.4   (Q-09 natureza declarada, Q-10 correção append-only)
--   §12.2     (toda mutação passa por caso de uso no servidor)
--   §18.1     (Q-11 — o "Hoje" registra resultado DE COMPROMISSO)
--   §18.2     (Q-12 — no máximo um compromisso ativo por usuário)
--   §18.3     (Q-13 — "Depois" não grava; sem_resposta não é adiamento)
--   §18.4.2   (Q-14 — anti-bifurcação em commitments e gambling_history)
--   §18.5     (P-29 — sem_resposta SEM produtor persistente; segue aberta)
--   §19       (E-06 — Modelo A / variante A3, e a ressalva de §19.2)
--
-- Por que função e não índice: §18.2 demonstrou que "não foi superada" é
-- propriedade da CADEIA, não da linha. Índice parcial, EXCLUDE e coluna
-- gerada não aceitam subconsulta, e os dois predicados locais possíveis
-- bloqueiam para sempre o compromisso seguinte — a linha-raiz permanece
-- com outcome nulo mesmo depois de respondida.
--
-- Por que a trava: sem ela, duas transações concorrentes leem "nenhum
-- ativo" e ambas inserem. A verificação sozinha NÃO é garantia. Isto vale
-- igualmente para trigger — a trava é que garante, não o invólucro.
--
-- Por que SECURITY DEFINER: §19.1.2 revoga `insert` da tabela para que as
-- funções sejam o único caminho de escrita. Uma função SECURITY INVOKER
-- roda com o papel do chamador e, sem o privilégio, também não escreveria.
-- A ressalva e suas seis condições cumulativas estão em §19.2 — e a
-- condição 3 é o motivo de cada função abaixo reconferir a posse: dentro
-- de SECURITY DEFINER a RLS não protege.
--
-- NENHUM TRIGGER É CRIADO. §9.1 e a proibição §14.3.21 permanecem íntegras.
-- =============================================================

-- -------------------------------------------------------------
-- Pré-voo (§19.3): a migration se recusa a aplicar sobre dados que já
-- violem o que ela passa a impor. Nada é apagado e nada é corrigido —
-- corrigir dado é decisão do responsável de produto, não do implementador.
-- -------------------------------------------------------------
do $$
declare
  v_multiplos_ativos int;
  v_bifurcacao_commitments int;
  v_bifurcacao_historico int;
begin
  select count(*) into v_multiplos_ativos
  from (
    select c.user_id
    from public.commitments c
    where c.outcome is null
      and not exists (
        select 1 from public.commitments s where s.supersedes_id = c.id
      )
    group by c.user_id
    having count(*) > 1
  ) t;

  select count(*) into v_bifurcacao_commitments
  from (
    select user_id, supersedes_id
    from public.commitments
    where supersedes_id is not null
    group by user_id, supersedes_id
    having count(*) > 1
  ) t;

  select count(*) into v_bifurcacao_historico
  from (
    select user_id, supersedes_id
    from public.gambling_history
    where supersedes_id is not null
    group by user_id, supersedes_id
    having count(*) > 1
  ) t;

  if v_multiplos_ativos > 0
     or v_bifurcacao_commitments > 0
     or v_bifurcacao_historico > 0 then
    raise exception using
      errcode = '23514',
      message = 'pre-voo reprovado: dados inconsistentes com Q-12/Q-14',
      detail  = format(
        'usuarios com mais de um compromisso ativo: %s; '
        'versoes bifurcadas em commitments: %s; '
        'versoes bifurcadas em gambling_history: %s',
        v_multiplos_ativos, v_bifurcacao_commitments, v_bifurcacao_historico),
      hint    = 'Nenhum dado foi alterado. A correcao e decisao do responsavel de produto (secao 19.3).';
  end if;
end
$$;

-- -------------------------------------------------------------
-- Q-14 (§18.4.2): a proteção anti-bifurcação de L-05, hoje só em
-- recovery_goals, estendida às outras duas entidades que usam
-- supersedes_id. Uma versão é superada no máximo uma vez pelo mesmo
-- usuário; sem isto a cadeia ganha duas cabeças e "a versão corrente"
-- deixa de ter leitura única.
--
-- supersedes_id NULL não é restringido: NULLs são distintos entre si num
-- índice único, então cada cadeia continua livre para nascer. §18.4.2
-- registra que isto NÃO limita o número de cadeias — quem limita é Q-12,
-- imposta pelas funções abaixo. São duas garantias diferentes.
-- -------------------------------------------------------------
alter table public.commitments
  add constraint commitments_uma_correcao_por_versao
  unique (user_id, supersedes_id);

alter table public.gambling_history
  add constraint gambling_history_uma_correcao_por_versao
  unique (user_id, supersedes_id);

-- -------------------------------------------------------------
-- A · declaração de compromisso
-- -------------------------------------------------------------
create function public.declarar_compromisso(
  p_commitment_declaration text,
  p_due_at timestamptz default null
)
returns public.commitments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_linha public.commitments;
begin
  -- §19.2.1: a identidade vem da sessão. NENHUM parâmetro de identidade
  -- existe nesta assinatura — do contrário um usuário declararia
  -- compromisso em nome de outro.
  if v_user_id is null then
    raise exception 'sem identidade autenticada' using errcode = '28000';
  end if;

  -- §19.2.4: parâmetros validados antes do uso.
  if p_commitment_declaration is null
     or btrim(p_commitment_declaration) = '' then
    raise exception 'declaracao do compromisso e obrigatoria'
      using errcode = '22023';
  end if;

  -- O prazo é opcional no schema; quando vier, precisa fazer sentido.
  -- Nenhuma duração é imposta aqui: Op. §12 fixa 24 horas para o
  -- compromisso INICIAL, não para todo compromisso.
  if p_due_at is not null and p_due_at <= pg_catalog.now() then
    raise exception 'prazo do compromisso precisa estar no futuro'
      using errcode = '22023';
  end if;

  -- §19.1.1: a trava vem ANTES da verificação. Sem ela, duas transações
  -- concorrentes leem "nenhum ativo" e ambas inserem.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  -- §18.2: ativo = do usuário, outcome nulo, e não superado por outra
  -- versão. O segundo termo é anti-join contra a própria tabela.
  if exists (
    select 1
    from public.commitments c
    where c.user_id = v_user_id
      and c.outcome is null
      and not exists (
        select 1 from public.commitments s where s.supersedes_id = c.id
      )
  ) then
    raise exception 'ja existe um compromisso ativo'
      using errcode = '23505';
  end if;

  insert into public.commitments (
    user_id, commitment_declaration, due_at, information_nature
  )
  values (
    v_user_id, btrim(p_commitment_declaration), p_due_at, 'declarado'
  )
  -- `outcome` fica nulo: o resultado entra como linha nova (Q-10),
  -- nunca por UPDATE. `supersedes_id` fica nulo: é raiz, não correção.
  returning * into v_linha;

  return v_linha;
end;
$$;

comment on function public.declarar_compromisso(text, timestamptz) is
  'Declara um compromisso impondo Q-12 (secao 18.2) com trava por usuario. SECURITY DEFINER sob a ressalva da secao 19.2: identidade so de auth.uid().';

-- -------------------------------------------------------------
-- B · registro do resultado
-- -------------------------------------------------------------
create function public.registrar_resultado_do_compromisso(
  p_commitment_id uuid,
  p_outcome text
)
returns public.commitments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_alvo public.commitments;
  v_linha public.commitments;
begin
  if v_user_id is null then
    raise exception 'sem identidade autenticada' using errcode = '28000';
  end if;

  if p_commitment_id is null then
    raise exception 'identificador do compromisso e obrigatorio'
      using errcode = '22023';
  end if;

  -- Q-06 fixa três valores, mas 'sem_resposta' NÃO tem produtor
  -- persistente enquanto P-29 (§18.5) estiver aberta: ele designa
  -- AUSÊNCIA de resposta e só pode ser derivado em leitura. Aceitá-lo
  -- aqui fecharia P-29 por implementação. §18.3 já proíbe que "Depois"
  -- o produza; esta função não o produz por caminho nenhum.
  if p_outcome is null or p_outcome not in ('cumprido', 'não_cumprido') then
    raise exception 'resultado invalido'
      using errcode = '22023',
            detail  = 'aceitos: cumprido, não_cumprido',
            hint    = 'sem_resposta nao tem produtor enquanto P-29 estiver aberta (secao 18.5).';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  -- §19.2.3: dentro de SECURITY DEFINER a RLS não protege. A posse é
  -- reconferida aqui, e é esta linha que impede acesso cruzado.
  -- A mensagem não distingue "não existe" de "não é sua": distinguir
  -- permitiria enumerar identificadores de outras identidades.
  select * into v_alvo
  from public.commitments c
  where c.id = p_commitment_id and c.user_id = v_user_id;

  if not found then
    raise exception 'compromisso nao encontrado para esta identidade'
      using errcode = '42501';
  end if;

  -- §18.2: só a versão ativa pode ser respondida. Isto cobre responder
  -- duas vezes, responder uma versão já corrigida e responder uma linha
  -- que já é resultado.
  if v_alvo.outcome is not null then
    raise exception 'este compromisso ja foi respondido'
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.commitments s where s.supersedes_id = v_alvo.id
  ) then
    raise exception 'esta versao do compromisso ja foi superada'
      using errcode = '23505';
  end if;

  -- §19.4: a linha de resultado NÃO repete a declaração nem o prazo.
  -- Repeti-los gravaria o mesmo fato declarado duas vezes, com dois
  -- timestamps — §8.2 e §6.2.4: estado duplicado é estado que diverge.
  --
  -- `recorded_at` usa o default: é o instante DESTE ato. O recorded_at da
  -- versão anterior permanece intacto — a linha anterior não é tocada.
  insert into public.commitments (
    user_id, outcome, information_nature, supersedes_id
  )
  values (
    v_user_id, p_outcome, 'declarado', v_alvo.id
  )
  returning * into v_linha;

  return v_linha;
end;
$$;

comment on function public.registrar_resultado_do_compromisso(uuid, text) is
  'Registra o resultado como nova versao append-only (secao 19.1). Recusa sem_resposta enquanto P-29 estiver aberta (secao 18.5).';

-- -------------------------------------------------------------
-- C e D · escrita exclusiva pelas funções (§19.1.2)
--
-- `insert` sai do papel do cliente. A leitura permanece sob RLS: a
-- política de select e o privilégio de select ficam como estão (§19.2.6).
-- Continua não havendo update nem delete (Q-10).
-- -------------------------------------------------------------
revoke insert on public.commitments from anon, authenticated;

-- A política `commitments_insert_own` NÃO é removida, e isso é deliberado:
-- sem o privilégio ela nunca chega a ser avaliada, mas se alguém reconceder
-- `insert` por engano numa fase futura, a política ainda limita a escrita à
-- própria identidade. Removê-la trocaria uma barreira inerte por nenhuma.

revoke all on function public.declarar_compromisso(text, timestamptz)
  from public, anon;
revoke all on function public.registrar_resultado_do_compromisso(uuid, text)
  from public, anon;

grant execute on function public.declarar_compromisso(text, timestamptz)
  to authenticated;
grant execute on function public.registrar_resultado_do_compromisso(uuid, text)
  to authenticated;

-- -------------------------------------------------------------
-- F · view de verificação (§19.1.4), no mesmo papel que §9.3.1 dá à
-- consulta de invariante: VERIFICAR, não impor. Resultado esperado:
-- conjunto vazio, sempre.
-- -------------------------------------------------------------
create or replace view public.commitment_invariant_violations
with (security_invoker = true) as
  -- Q-12: mais de um compromisso ativo para a mesma identidade.
  select
    'public.commitments'::text as source,
    c.user_id,
    pg_catalog.count(*) as ocorrencias,
    'mais de um compromisso ativo para a mesma identidade'::text as violation
  from public.commitments c
  where c.outcome is null
    and not exists (
      select 1 from public.commitments s where s.supersedes_id = c.id
    )
  group by c.user_id
  having pg_catalog.count(*) > 1

  union all

  -- Q-14: cadeia bifurcada em commitments.
  select
    'public.commitments'::text,
    user_id,
    pg_catalog.count(*),
    'mesma versao superada mais de uma vez'::text
  from public.commitments
  where supersedes_id is not null
  group by user_id, supersedes_id
  having pg_catalog.count(*) > 1

  union all

  -- Q-14: cadeia bifurcada em gambling_history.
  select
    'public.gambling_history'::text,
    user_id,
    pg_catalog.count(*),
    'mesma versao superada mais de uma vez'::text
  from public.gambling_history
  where supersedes_id is not null
  group by user_id, supersedes_id
  having pg_catalog.count(*) > 1;

comment on view public.commitment_invariant_violations is
  'Verificacao de Q-12 e Q-14 (secoes 18.2, 18.4.2, 19.1.4). Resultado esperado: conjunto vazio, sempre.';

-- Como em consent_invariant_violations: no Supabase a view NASCE com
-- select concedido a anon e authenticated por default privileges. Não
-- basta não conceder — é preciso revogar.
revoke all on public.commitment_invariant_violations from anon, authenticated;
