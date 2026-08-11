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
