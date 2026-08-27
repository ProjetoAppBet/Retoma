-- =============================================================
-- Fase 1A · postura de privilégios (convergência)
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §8.2  (append-only)
--   §3.2  (o papel do usuário é authenticated)
--   §12.5 (RLS desde a criação das tabelas)
--
-- Critérios de aceite envolvidos: AA-15, AA-16, AA-21, AA-22.
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- As migrations 20260811020000, 20260811020100 e 20260811020200 já
-- estabelecem a postura correta de privilégios no momento em que criam
-- cada objeto. Isso cobre a instalação limpa.
--
-- Não cobre, porém, um banco onde aquelas três já tenham sido aplicadas
-- na versão anterior — que revogava apenas UPDATE e DELETE, e apenas de
-- authenticated, deixando TRUNCATE concedido a anon e a authenticated.
-- Como TRUNCATE não é submetido a RLS, esse banco teria uma tabela de
-- auditoria destrutível.
--
-- Esta migration reafirma a postura de forma idempotente. Em instalação
-- limpa é inócua — reaplica o que já vale. Em banco já migrado, corrige.
-- Nos dois casos o estado final é idêntico e determinístico, e não depende
-- de nenhum ajuste manual no painel do Supabase.
--
-- REVOKE ALL / GRANT são idempotentes por natureza: executá-los mais de
-- uma vez produz sempre o mesmo estado final.
-- =============================================================

-- Tabelas de dados de usuário: anon sem privilégio algum; authenticated
-- apenas com SELECT e INSERT. Sem UPDATE, sem DELETE, sem TRUNCATE.
revoke all on public.profiles from anon, authenticated;
grant select, insert on public.profiles to authenticated;

revoke all on public.consent_records from anon, authenticated;
grant select, insert on public.consent_records to authenticated;

-- View de verificação: artefato de operação, fora do alcance da aplicação.
revoke all on public.consent_invariant_violations from anon, authenticated;
