-- =============================================================
-- Fase 1B · recovery_goals
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §7.1, §7.3  (user_id -> auth.users(id); RLS na mesma migration)
--   §9.2        (invariante alcança toda entidade de domínio)
--   §11.2       (recebe Etapa 1 — motivação — e Etapa 6 — objetivo imediato)
--   §11.5.1.2   (a declaração original do usuário é preservada)
--   §11.6.1     (Q-01 cardinalidade, Q-02 tipo, Q-03 versionamento)
--   §11.6.4     (Q-09 natureza da informação, Q-10 correção append-only)
-- =============================================================

create table public.recovery_goals (
  id uuid primary key default gen_random_uuid(),

  -- §7.1 / AA-02. §14.1.3 proíbe owner_id, account_id ou profile_id.
  user_id uuid not null references auth.users (id),

  -- Q-02: domínio transcrito literalmente de §11.6.1. A proibição de meta
  -- numérica de redução na Fase 1B é cumprida pela ausência de qualquer
  -- coluna de meta — nenhuma foi criada.
  goal_type text not null
    check (goal_type in ('interromper', 'reduzir', 'ainda não decidido')),

  -- §11.2: Etapa 6 do onboarding (objetivo imediato) e Etapa 1 (motivação).
  -- §11.5.1.2 exige preservar a declaração original: as duas colunas guardam
  -- o que a pessoa disse, não uma classificação do que ela disse.
  -- Opcionais porque as duas etapas são respondidas em momentos distintos
  -- (Op. §12) e nenhuma fonte normativa exige que coexistam numa mesma linha.
  goal_declaration text,
  motivation_declaration text,

  -- Q-09: separação entre declarado, observado, inferido e segurança.
  -- Esta é uma entidade DECLARATIVA: guarda o que a pessoa disse sobre o
  -- próprio objetivo. Comportamento observado, inferência do sistema e sinal
  -- de segurança são naturezas distintas e NÃO entram aqui — admiti-las nesta
  -- tabela seria justamente a mistura que Q-09 proíbe. A coluna permanece
  -- explícita, e o CHECK a fixa: a natureza é declarada por construção.
  information_nature text not null
    check (information_nature = 'declarado'),

  -- §9.2 / AA-09: o invariante compara o timestamp da linha com o do aceite.
  recorded_at timestamptz not null default now(),

  -- Q-10: corrigir não apaga histórico. A declaração anterior permanece e o
  -- novo estado declarado entra como nova linha, ligada à anterior. Mesmo
  -- padrão de previous_consent_id em §8.3.
  supersedes_id uuid references public.recovery_goals (id),

  -- L-05: uma versão é superada no máximo uma vez pelo mesmo usuário. Sem
  -- isto, duas linhas podiam superar a MESMA anterior e a cadeia passava a ter
  -- duas cabeças simultâneas — e "o objetivo ativo" deixava de ter leitura
  -- única, contra Q-01.
  --
  -- supersedes_id NULL não é restringido: NULLs são distintos entre si num
  -- índice único, então a linha de origem de cada cadeia continua livre. Duas
  -- origens não bifurcam cadeia alguma, e o desempate de L-04 abaixo já define
  -- qual delas é a corrente.
  constraint recovery_goals_uma_correcao_por_versao
    unique (user_id, supersedes_id)
);

comment on table public.recovery_goals is
  'Objetivo de recuperacao. Append-only: o objetivo corrente e a linha mais recente do usuario (Q-01, Q-10).';

-- Q-01: um objetivo ativo por usuário. O objetivo ativo é DERIVADO — é a
-- linha mais recente do usuário —, nunca armazenado em paralelo. §8.2 e
-- §6.2.4 já fixam esse princípio: estado duplicado é estado que diverge.
-- Por isso não existe coluna is_active.
--
-- L-04: recorded_at sozinho não ordena de forma determinística. now() devolve
-- o horário da TRANSAÇÃO, então duas inserções na mesma transação recebem o
-- mesmo instante e "a mais recente" fica ambígua. O desempate é por id desc —
-- critério puramente técnico, para tornar a leitura única e estável.
-- O significado de recorded_at não muda: continua sendo quando a declaração
-- foi registrada, e id NÃO é ordem cronológica (uuid v4 é aleatório) — serve
-- só para escolher uma linha entre as empatadas, sempre a mesma.
--
-- A ordenação canônica do objetivo corrente é, portanto:
--   order by recorded_at desc, id desc limit 1
-- e este índice a atende integralmente.
create index recovery_goals_user_recorded_at_idx
  on public.recovery_goals (user_id, recorded_at desc, id desc);

-- §7.3.2 / AA-20.
alter table public.recovery_goals enable row level security;

create policy recovery_goals_select_own
  on public.recovery_goals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy recovery_goals_insert_own
  on public.recovery_goals
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Q-10: sem política de UPDATE e sem política de DELETE. Correção gera nova
-- linha; nada é sobrescrito nem removido.
-- Privilégios: mesma postura da Fase 1A. No Supabase toda tabela em public
-- nasce com o conjunto completo para anon e authenticated, TRUNCATE
-- incluído, e TRUNCATE não é submetido a RLS.
revoke all on public.recovery_goals from anon, authenticated;
grant select, insert on public.recovery_goals to authenticated;
