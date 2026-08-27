-- =============================================================
-- SHIM DE TESTE — NÃO É SCHEMA DE PRODUÇÃO
--
-- Em produção, o schema `auth`, a tabela `auth.users`, a função
-- `auth.uid()` e os papéis anon/authenticated/service_role são criados e
-- mantidos pelo Supabase Auth (GoTrue), nunca por migration deste projeto
-- (D-01 §3.3.1: não existe public.users; a identidade é auth.users).
--
-- Este arquivo reproduz o mínimo desse contrato para que as migrations do
-- repositório possam ser aplicadas num cluster PostgreSQL local e para que
-- a RLS seja exercitada de verdade — pelo próprio PostgreSQL, com papel e
-- claims reais de sessão. Nada aqui é aplicado ao projeto Supabase.
--
-- A definição de auth.uid() abaixo reproduz a do Supabase.
-- =============================================================

create schema if not exists auth;

-- Subconjunto de auth.users suficiente para as chaves estrangeiras e para
-- a consulta de invariante. A tabela real do Supabase tem muitas outras
-- colunas, irrelevantes para estes testes.
create table if not exists auth.users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  is_anonymous boolean not null default true
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Postura de privilégios do Supabase, reproduzida deliberadamente.
--
-- O projeto Supabase alvo tem, em pg_default_acl para o schema public e
-- objetos do tipo relação:
--
--   anon=arwdDxtm  authenticated=arwdDxtm  service_role=arwdDxtm
--
-- ou seja, toda tabela e toda view criada em public nasce com o conjunto
-- COMPLETO de privilégios para esses papéis — incluindo TRUNCATE (D), que
-- não é submetido a RLS.
--
-- Sem esta linha, o cluster local de teste seria mais restritivo que o
-- ambiente-alvo e a suíte passaria verde escondendo justamente a classe de
-- problema que precisa ser detectada. Executada como postgres, que é o
-- papel que aplica as migrations em seguida.
-- ---------------------------------------------------------------
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
