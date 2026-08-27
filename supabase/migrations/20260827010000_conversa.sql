-- =============================================================
-- Fase 4 · conversa e mensagens — fundação persistente
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §7.1, §7.2, §7.3  (propriedade por user_id -> auth.users; RLS na mesma
--                      migration; nomes proibidos de identidade)
--   §9.2, §9.3.1      (invariante do consentimento alcança toda tabela de
--                      qualquer fase futura; a consulta precisa cobri-la)
--   §12.1, §12.2      (nada antes do aceite; mutação no servidor)
--   §14.4.25          (exceção NOMINAL de §20.2: conversa e mensagem)
--   §20               (emenda E-07 — remoção do bloqueio de existência)
--   §20.3             (o que a conversa herda sem exceção)
--   §20.4             (o que E-07 NÃO autoriza — nada disso aparece aqui)
--   Op. §13, §14      (primeira conversa; conversa profunda)
--   Op. §15           ("não guardar indiscriminadamente toda conversa")
--
-- O QUE ESTA MIGRATION NÃO CRIA, e é o ponto:
--   - nenhuma tabela de MEMÓRIA ou de PADRÕES. §20.4.5 mantém "padrões e
--     memória" vedados; são item separado de §11.3 e exigem emenda própria.
--     Nada aqui deriva fato, hipótese ou padrão a partir da conversa.
--   - nenhuma coluna de risco, crise ou estado clínico. §14.3.23 e P-05.
--   - nenhuma coluna de retenção, expurgo ou base legal. P-04 aberta, e
--     §12.6 proíbe decisão de LGPD inventada.
--   - nenhuma referência a provedor, modelo ou custo. §14.4.30 e D-04/P-07.
--   - nenhum resumo, rótulo, título ou classificação da conversa: qualquer
--     um deles seria inferência gravada como fato, contra Op. §2.
-- =============================================================

-- -------------------------------------------------------------
-- conversations · o fio
--
-- Existe para agrupar mensagens; nada mais. Sem título, sem estado, sem
-- resumo — cada um deles seria decisão de produto ou inferência.
--
-- SEM restrição de unicidade por usuário, deliberadamente: fixar "uma
-- conversa para sempre" ou "uma por sessão" é decisão de produto que
-- nenhum documento tomou. A aplicação obtém a mais recente ou cria a
-- primeira, e o schema não impede nenhum dos dois futuros.
-- -------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),

  -- §7.1: padrão único e obrigatório. §7.2 proíbe owner_id/account_id/
  -- profile_id como referência à identidade.
  user_id uuid not null references auth.users (id),

  -- §9.2 / AA-09: o invariante compara este instante com o do aceite.
  created_at timestamptz not null default now()
);

comment on table public.conversations is
  'Fio de conversa do usuario. Agrupa mensagens e nada mais (secao 20, E-07).';

-- Alvo da chave composta de mensagens: prende a mensagem à MESMA identidade
-- dona da conversa. Mesmo mecanismo da migration de R5.
alter table public.conversations
  add constraint conversations_user_id_id_key unique (user_id, id);

-- A aplicação busca a conversa corrente do usuário. Desempate por id pela
-- razão de L-04: now() é o horário da TRANSAÇÃO, então duas linhas podem
-- empatar em created_at e "a mais recente" ficaria ambígua.
create index conversations_user_created_at_idx
  on public.conversations (user_id, created_at desc, id desc);

-- -------------------------------------------------------------
-- messages · o que foi dito
-- -------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id),

  conversation_id uuid not null,

  -- Quem falou. Op. §2, §13 e §21 tratam "a IA" como interlocutor, então o
  -- domínio tem os dois lados desde já.
  --
  -- 'ia' NÃO TEM PRODUTOR nesta fase, e isso é intencional: §14.4.30 proíbe
  -- a chamada ao modelo enquanto D-04/P-07 estiver aberta. O valor existe
  -- no domínio para que a leitura da conversa não precise mudar de forma
  -- depois; nenhum caminho da aplicação o grava. Mesma situação registrada
  -- para 'sem_resposta' em §18.5.
  author text not null
    check (author in ('usuário', 'ia')),

  -- O que foi dito, como foi dito. Mensagem vazia não é mensagem.
  --
  -- Sem `information_nature` aqui, e isso é decisão de modelo: Q-09 separa
  -- declarado/observado/inferido/segurança para FATOS que o sistema guarda
  -- sobre a pessoa. Mensagem é conteúdo bruto de conversa, não fato
  -- extraído — Op. §15 separa justamente as duas coisas, e extrair fato é
  -- memória, que §20.4.5 mantém vedada.
  --
  -- A lista de caracteres é explícita porque `btrim(x)` sem lista remove
  -- APENAS espaços: uma mensagem só de quebras de linha passaria pelo CHECK.
  content text not null
    check (btrim(content, E' \t\n\r') <> ''),

  -- §9.2 / AA-09.
  --
  -- clock_timestamp(), não now(): now() devolve o horário da TRANSAÇÃO, e
  -- duas mensagens gravadas na mesma transação — pergunta e resposta, no dia
  -- em que houver resposta — receberiam o MESMO instante. A ordem do diálogo
  -- passaria a depender do desempate por uuid v4, que é aleatório: metade
  -- das vezes a resposta apareceria antes da pergunta. É a lição de L-04
  -- aplicada onde a ordem é o próprio significado.
  created_at timestamptz not null default clock_timestamp(),

  -- A conversa pertence a quem escreve a mensagem. A chave é COMPOSTA pela
  -- mesma razão de R5: `with check (user_id = auth.uid())` confere de quem é
  -- a linha, mas não de quem é a conversa apontada. Sem isto, uma identidade
  -- conseguiria pendurar mensagem própria no fio de outra.
  constraint messages_conversation_fkey
    foreign key (user_id, conversation_id)
    references public.conversations (user_id, id)
);

comment on table public.messages is
  'Mensagens da conversa. Conteudo bruto, nunca fato extraido: memoria e padroes seguem vedados (secao 20.4).';

-- Leitura do fio, em ordem. O desempate por id acompanha created_at pela
-- razão de L-04 — a garantia vem da cláusula ORDER BY, não do índice.
create index messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at, id);

-- -------------------------------------------------------------
-- §7.3 / §12.5 · RLS na MESMA migration que cria a tabela
-- -------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select_own
  on public.conversations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy conversations_insert_own
  on public.conversations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy messages_select_own
  on public.messages
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy messages_insert_own
  on public.messages
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Sem UPDATE e sem DELETE, como nas demais entidades de usuário. Editar ou
-- apagar mensagem é decisão de produto que nenhum documento tomou, e
-- retenção/exclusão depende de P-04.
--
-- `revoke all` antes do grant: no Supabase, toda tabela em `public` nasce
-- com o conjunto COMPLETO de privilégios para anon e authenticated por
-- default privileges — incluindo TRUNCATE, que não é submetido a RLS.
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

-- -------------------------------------------------------------
-- §9.2 / §9.3.1 · o invariante alcança "toda tabela criada em qualquer
-- fase futura". §20.3.3 exige que a consulta passe a cobrir a conversa.
-- Sem isto, uma mensagem gravada antes do aceite não seria acusada.
-- -------------------------------------------------------------
create or replace view public.consent_invariant_violations
with (security_invoker = true) as
  with dados_de_usuario as (
    select 'public.profiles'::text          as source, p.user_id, p.created_at  as row_recorded_at
      from public.profiles p
    union all
    select 'public.recovery_goals'::text,   g.user_id, g.recorded_at
      from public.recovery_goals g
    union all
    select 'public.gambling_history'::text, h.user_id, h.recorded_at
      from public.gambling_history h
    union all
    select 'public.commitments'::text,      c.user_id, c.recorded_at
      from public.commitments c
    union all
    select 'public.conversations'::text,    v.user_id, v.created_at
      from public.conversations v
    union all
    select 'public.messages'::text,         m.user_id, m.created_at
      from public.messages m
  )
  -- AA-09: linha de dados de usuário sem aceite principal anterior ou igual.
  select
    d.source,
    d.user_id,
    d.row_recorded_at,
    'linha de dados de usuario sem aceite principal anterior ou igual'::text
      as violation
  from dados_de_usuario d
  where not exists (
    select 1
    from public.consent_records c
    where c.user_id = d.user_id
      and c.consent_type = 'C-PRINCIPAL'
      and c.state = 'concedido'
      and c.recorded_at <= d.row_recorded_at
  )

  union all

  -- AA-08: identidade em auth.users sem registro de aceite principal.
  select
    'auth.users'::text,
    u.id,
    u.created_at,
    'identidade sem registro de aceite principal'::text
  from auth.users u
  where not exists (
    select 1
    from public.consent_records c
    where c.user_id = u.id
      and c.consent_type = 'C-PRINCIPAL'
      and c.state = 'concedido'
  );

comment on view public.consent_invariant_violations is
  'Consulta de invariante (D-02.9 secao 9.3.1), cobrindo profiles, as entidades de dominio da Fase 1B e a conversa. Resultado esperado: conjunto vazio, sempre.';

revoke all on public.consent_invariant_violations from anon, authenticated;
