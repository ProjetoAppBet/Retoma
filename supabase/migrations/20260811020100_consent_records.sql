-- =============================================================
-- Fase 1A · registro de consentimento
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §4.2  (neutralidade jurídica obrigatória)
--   §4.3  (modelo de granularidade — tipos de consentimento)
--   §8    (entidade própria, comportamento append-only, atributos)
--   §10   (D-02.13 — versionamento do documento)
--
-- Critérios de aceite atendidos: AA-11, AA-12, AA-13, AA-15, AA-16,
-- AA-17, AA-20, AA-22.
-- =============================================================

-- §8.1: entidade própria. §14.2.11 proíbe representar consentimento como
-- booleano em profiles ou em qualquer outra entidade. §8.2: o estado
-- corrente é derivado do histórico, nunca armazenado em paralelo.
--
-- §4.2: terminologia deliberadamente neutra quanto à base legal. Nenhum
-- nome de coluna, comentário ou valor classifica juridicamente o ato.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),

  -- §8.3 / §7.1: todo registro vinculado a user_id -> auth.users(id).
  user_id uuid not null references auth.users (id),

  -- §8.3: tipo do consentimento (BR-09, AC-12 exigem distinguir a
  -- autorização de compartilhamento das demais). O domínio abaixo é
  -- transcrição literal dos quatro tipos definidos em §4.3; nenhum tipo
  -- foi inventado e nenhum dos fluxos correspondentes foi implementado.
  -- P-09 (C-CONTA) e P-10 (C-NOTIF) seguem abertas quanto a serem ou não
  -- registradas nesta entidade — permitir o valor não decide a pendência.
  consent_type text not null
    check (consent_type in ('C-PRINCIPAL', 'C-APOIO', 'C-NOTIF', 'C-CONTA')),

  -- §8.3: estado — concedido / revogado. Valores transcritos do documento.
  state text not null
    check (state in ('concedido', 'revogado')),

  -- §8.3 e §10.1: identificador de versão do documento aceito.
  -- §10.3 (P-08): o esquema de identificação — numérico, data ou hash — não
  -- está decidido e explicitamente NÃO bloqueia a Fase 1. A coluna é opaca
  -- de propósito: não presume esquema algum.
  -- §10.1 / AA-13: o texto integral do documento NÃO é armazenado aqui.
  document_version_id text not null,

  -- §8.3: timestamp do registro.
  recorded_at timestamptz not null default now(),

  -- §8.2 e §8.3: relação com o registro anterior, na revogação, "quando
  -- aplicável" — por isso opcional.
  previous_consent_id uuid references public.consent_records (id)
);

comment on table public.consent_records is
  'Historico append-only de consentimento. Metadado de auditoria, nao conteudo de usuario (D-02 §8.1).';

-- Suporta a derivação do estado corrente a partir do histórico (§8.2) e a
-- consulta de invariante (§9.3.1).
create index consent_records_user_type_recorded_at_idx
  on public.consent_records (user_id, consent_type, recorded_at desc);

-- §7.3.2 / AA-20: RLS habilitada na mesma migration que cria a tabela.
alter table public.consent_records enable row level security;

-- §8.2 / AA-22: o usuário lê apenas os próprios registros.
create policy consent_records_select_own
  on public.consent_records
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- §8.2: nova concessão, nova versão e revogação geram sempre NOVO registro.
create policy consent_records_insert_own
  on public.consent_records
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Privilégios de tabela — aqui está o que efetivamente sustenta o
-- append-only exigido por §8.2, AA-15 e AA-16.
--
-- RLS sozinha NÃO garante append-only. TRUNCATE não é submetido a row
-- level security: um papel que detenha o privilégio TRUNCATE esvazia a
-- tabela inteira com a RLS habilitada. E no Supabase toda tabela criada em
-- public nasce com o conjunto completo de privilégios para anon e
-- authenticated, por causa de `alter default privileges ... grant all on
-- tables`. Sem os revokes abaixo, o histórico de consentimento — que é
-- trilha de auditoria (§8.1) — seria destrutível.
--
-- `revoke all` em vez de lista enumerada: o conjunto de privilégios muda
-- entre versões do PostgreSQL (MAINTAIN existe no 17 e não no 16). Revogar
-- tudo e reconceder o mínimo é determinístico em qualquer versão.
--
-- anon não recebe privilégio algum. authenticated recebe apenas SELECT e
-- INSERT: sem UPDATE, sem DELETE e sem TRUNCATE, em nenhuma hipótese —
-- nem para o próprio dono (§8.2, AA-16, §14.2.10).
revoke all on public.consent_records from anon, authenticated;
grant select, insert on public.consent_records to authenticated;
