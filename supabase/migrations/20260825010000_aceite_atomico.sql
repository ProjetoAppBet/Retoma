-- =============================================================
-- Fase 2 · registro atômico do aceite principal
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §5.1        (ordem auth.users -> profiles -> registro do aceite)
--   §9.2        (invariante: aceite com timestamp ANTERIOR OU IGUAL)
--   §17.1       (P-27 — os dois passos são uma única operação atômica)
--   §12.2       (toda mutação passa por caso de uso no servidor)
--
-- O problema que esta função resolve: executados em duas transações, os dois
-- passos produzem profiles.created_at < consent_records.recorded_at, e a
-- consulta de invariante acusa public.profiles. Numa única transação, now()
-- devolve o mesmo instante para os dois — e §9.2 admite a igualdade.
--
-- Duas chamadas sucessivas via PostgREST são duas transações. Por isso a
-- operação existe como função, e não como duas chamadas da aplicação.
--
-- SECURITY INVOKER, deliberadamente: a função roda com o papel de quem a
-- chama, então a RLS de profiles e consent_records continua valendo dentro
-- dela. Nada aqui contorna autorização (§14.3.19), e nada aqui é trigger
-- (§9.1, §14.3.21) — é o caso de uso da aplicação, executado atomicamente.
-- =============================================================

create function public.registrar_aceite_principal(p_document_version_id text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_consent_id uuid;
begin
  -- §5.1: sem identidade não há o que registrar. A identidade é lida da
  -- sessão, nunca recebida por parâmetro — do contrário um usuário poderia
  -- registrar aceite em nome de outro.
  if v_user_id is null then
    raise exception 'sem identidade autenticada'
      using errcode = '28000';
  end if;

  -- §17.2 / §10.2: o identificador da versão é obrigatório e é gravado
  -- exatamente como recebido.
  if p_document_version_id is null or btrim(p_document_version_id) = '' then
    raise exception 'identificador de versao do documento e obrigatorio'
      using errcode = '22023';
  end if;

  -- §5.1: profiles primeiro, como no fluxo canônico. on conflict do nothing
  -- porque a identidade pode já ter perfil (novo aceite após emenda do
  -- documento) — e §6 não admite duplicar perfil.
  insert into public.profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  -- §8: o registro do aceite. Mesma transação, logo mesmo now().
  insert into public.consent_records
    (user_id, consent_type, state, document_version_id)
  values
    (v_user_id, 'C-PRINCIPAL', 'concedido', p_document_version_id)
  returning id into v_consent_id;

  return v_consent_id;
end;
$$;

comment on function public.registrar_aceite_principal(text) is
  'Cria profiles e grava o aceite principal numa unica transacao (P-27, secao 17.1). SECURITY INVOKER: a RLS continua valendo dentro da funcao.';

-- Só quem tem sessão executa. anon não registra aceite: §5.1 exige que a
-- identidade exista antes.
revoke all on function public.registrar_aceite_principal(text) from public, anon;
grant execute on function public.registrar_aceite_principal(text) to authenticated;
