-- =============================================================
-- Fase 1B · extensão da verificação do invariante
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §9.2   ("Vale para profiles, para TODA ENTIDADE DE DOMÍNIO, para
--            telemetria vinculada à identidade, e para toda tabela criada
--            em qualquer fase futura")
--   §9.3.1 (consulta de invariante, executável em CI)
--
-- Critérios de aceite: AA-08, AA-09, AA-19.
--
-- As três entidades da Fase 1B são entidades de domínio, logo o invariante
-- alcança suas linhas. Sem esta migration a consulta continuaria verificando
-- apenas profiles e daria conjunto vazio mesmo com linha de domínio gravada
-- antes do aceite — um falso negativo.
--
-- §9.1 e §14.3.21 seguem valendo: nenhum trigger é criado. Esta view apenas
-- verifica.
-- =============================================================

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
  'Consulta de invariante (D-02.9 §9.3.1), cobrindo profiles e as entidades de dominio da Fase 1B. Resultado esperado: conjunto vazio, sempre.';

-- Artefato de verificação e operação, fora do alcance da aplicação.
revoke all on public.consent_invariant_violations from anon, authenticated;
