# Supabase — schema e migrations

As migrations em `supabase/migrations/` são a **única fonte de verdade** do
schema. Alteração feita direto no dashboard não é fonte de verdade e não
deve ser usada (D-01/D-02/D-09 §14.3.20).

Convenção de nome: `<AAAAMMDDHHMMSS>_<descricao>.sql`, aplicadas em ordem
lexicográfica.

## Regra que vale para toda migration

RLS é habilitada **na mesma migration** que cria a tabela, nunca em uma
posterior (§7.3.2, AA-20).

## Estado atual — Fase 1A

| Migration | Conteúdo |
|---|---|
| `20260811020000_profiles.sql` | `public.profiles` + RLS + políticas |
| `20260811020100_consent_records.sql` | `public.consent_records` + RLS + políticas |
| `20260811020200_consent_invariant.sql` | view `consent_invariant_violations` |

A Fase 1B — `recovery_goals`, `gambling_history`, `commitments` — está
bloqueada por P-01 e P-02 (§11.4) e não possui migration.

## Aplicar num projeto Supabase

Ainda **não aplicado** a nenhum projeto Supabase. O passo de aplicação é
deliberadamente separado da Fase 1A e depende de decisão explícita, porque
existe um único projeto e ele não tem ambiente de staging.

Não há `config.toml` neste diretório: a Supabase CLI não está instalada no
ambiente de desenvolvimento usado, e escrever um arquivo de configuração
não verificável seria pior do que não tê-lo. Ao instalar a CLI, rode
`supabase init` e depois `supabase link` + `supabase db push`.

## Ambiente dos testes

Os testes de RLS **não** usam Supabase. Eles sobem um cluster PostgreSQL
local e efêmero, aplicam um shim mínimo do contrato de auth e depois estas
mesmas migrations. A RLS é exercitada pelo próprio PostgreSQL, com papel
`authenticated` e `request.jwt.claims` reais.

Dependências do ambiente e limites do que é coberto estão documentados em
`tests/support/local-db.mjs` e `tests/support/supabase-auth-shim.sql`.

Rodar: `npm test`.
