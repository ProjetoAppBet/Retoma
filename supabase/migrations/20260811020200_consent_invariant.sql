-- =============================================================
-- Fase 1A · infraestrutura de verificação do invariante
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §9.2  (enunciado do invariante)
--   §9.3.1 (consulta de invariante, executável em CI)
--   §11.2 (infraestrutura de verificação de invariante integra o núcleo)
--
-- Critérios de aceite atendidos: AA-08, AA-09, AA-19.
--
-- §9.1 e §14.3.21: NÃO são criados triggers para impor o invariante nesta
-- etapa. A estratégia aprovada é RLS + constraints normais + testes
-- automatizados. Esta view é apenas leitura — não impõe nada, verifica.
-- =============================================================

-- §9.2: "Não pode existir nenhuma linha, em nenhuma tabela de dados de
-- usuário do Retoma, cujo user_id não possua um registro de aceite
-- principal com timestamp anterior ou igual ao da própria linha."
--
-- "Registro de aceite principal" é lido como um registro de tipo
-- C-PRINCIPAL em estado 'concedido' (§4.3 e §8.3). Um registro em estado
-- 'revogado' não é um aceite.
--
-- consent_records não é verificada contra o invariante: §8.1 define o
-- registro de consentimento como metadado de auditoria, não como dado de
-- usuário, e o próprio aceite não pode preceder a si mesmo. §9.2 nomeia
-- explicitamente profiles e as entidades de domínio.
--
-- security_invoker = true garante que a view jamais sirva de caminho para
-- contornar a RLS das tabelas subjacentes (§14.3.18, §14.3.19).
create view public.consent_invariant_violations
with (security_invoker = true) as
  -- AA-09: linha de dados de usuário sem aceite principal anterior ou igual.
  select
    'public.profiles'::text as source,
    p.user_id                as user_id,
    p.created_at             as row_recorded_at,
    'linha de dados de usuario sem aceite principal anterior ou igual'::text
                             as violation
  from public.profiles p
  where not exists (
    select 1
    from public.consent_records c
    where c.user_id = p.user_id
      and c.consent_type = 'C-PRINCIPAL'
      and c.state = 'concedido'
      and c.recorded_at <= p.created_at
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
  'Consulta de invariante (D-02.9 §9.3.1). Resultado esperado: conjunto vazio, sempre.';

-- A view é artefato de verificação e operação, não de aplicação: nenhum
-- privilégio é concedido a anon ou authenticated. Ela lê auth.users, que
-- não é legível por esses papéis.
