-- =============================================================
-- Fundação · a cadeia de supersessão não atravessa identidades (R5)
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §7.1, §7.3  (propriedade e isolamento por user_id)
--   §8.2        (previous_consent_id — append-only do consentimento)
--   §11.6.4     (Q-10 — correção preserva a declaração anterior)
--   §18.4.2     (Q-14 — uma versão é superada no máximo uma vez)
--
-- O buraco, verificado empiricamente antes desta migration: as chaves
-- estrangeiras de `supersedes_id` e `previous_consent_id` apontam apenas
-- para `(id)`. A RLS de INSERT confere `user_id = auth.uid()`, mas NÃO
-- confere a quem pertence a linha superada — de modo que uma identidade
-- conseguia gravar linha própria declarando superar linha de OUTRA
-- identidade. Não vazava leitura (a RLS de SELECT continua fechada), mas
-- produzia cadeia que atravessa contas, e §7.3 não admite isso.
--
-- A correção é estrutural: a chave estrangeira passa a ser COMPOSTA,
-- (user_id, supersedes_id) -> (user_id, id). Sendo MATCH SIMPLE — o padrão
-- —, a restrição é satisfeita quando qualquer coluna do par é nula, e
-- `supersedes_id` nulo continua sendo a raiz livre de cada cadeia. Nada
-- muda para dado existente que já esteja correto.
--
-- Isto NÃO substitui Q-14 nem Q-12: são três garantias distintas.
--   Q-12  — no máximo um compromisso ativo por identidade
--   Q-14  — uma versão é superada no máximo uma vez
--   R5    — a versão superada pertence à MESMA identidade
--
-- Aditiva: nenhuma tabela é recriada, nenhuma coluna é alterada, nenhum
-- dado é removido. As chaves antigas são substituídas por outras mais
-- estritas sobre as mesmas colunas.
-- =============================================================

-- Pré-voo: recusa aplicar sobre cadeia que já atravesse identidades.
do $$
declare
  v_total int := 0;
  v_parcial int;
begin
  select count(*) into v_parcial
  from public.commitments f join public.commitments p on p.id = f.supersedes_id
  where f.user_id <> p.user_id;
  v_total := v_total + v_parcial;

  select count(*) into v_parcial
  from public.recovery_goals f join public.recovery_goals p on p.id = f.supersedes_id
  where f.user_id <> p.user_id;
  v_total := v_total + v_parcial;

  select count(*) into v_parcial
  from public.gambling_history f join public.gambling_history p on p.id = f.supersedes_id
  where f.user_id <> p.user_id;
  v_total := v_total + v_parcial;

  select count(*) into v_parcial
  from public.consent_records f join public.consent_records p on p.id = f.previous_consent_id
  where f.user_id <> p.user_id;
  v_total := v_total + v_parcial;

  if v_total > 0 then
    raise exception using
      errcode = '23503',
      message = 'pre-voo reprovado: existem cadeias que atravessam identidades',
      detail  = format('linhas cuja versao anterior pertence a outra identidade: %s', v_total),
      hint    = 'Nenhum dado foi alterado. A correcao e decisao do responsavel de produto.';
  end if;
end
$$;

-- Alvo da chave composta. `id` já é chave primária; o par (user_id, id) é
-- o que permite à chave estrangeira exigir a identidade junto.
alter table public.commitments      add constraint commitments_user_id_id_key      unique (user_id, id);
alter table public.recovery_goals   add constraint recovery_goals_user_id_id_key   unique (user_id, id);
alter table public.gambling_history add constraint gambling_history_user_id_id_key unique (user_id, id);
alter table public.consent_records  add constraint consent_records_user_id_id_key  unique (user_id, id);

alter table public.commitments      drop constraint commitments_supersedes_id_fkey;
alter table public.recovery_goals   drop constraint recovery_goals_supersedes_id_fkey;
alter table public.gambling_history drop constraint gambling_history_supersedes_id_fkey;
alter table public.consent_records  drop constraint consent_records_previous_consent_id_fkey;

alter table public.commitments
  add constraint commitments_supersedes_id_fkey
  foreign key (user_id, supersedes_id)
  references public.commitments (user_id, id);

alter table public.recovery_goals
  add constraint recovery_goals_supersedes_id_fkey
  foreign key (user_id, supersedes_id)
  references public.recovery_goals (user_id, id);

alter table public.gambling_history
  add constraint gambling_history_supersedes_id_fkey
  foreign key (user_id, supersedes_id)
  references public.gambling_history (user_id, id);

alter table public.consent_records
  add constraint consent_records_previous_consent_id_fkey
  foreign key (user_id, previous_consent_id)
  references public.consent_records (user_id, id);
