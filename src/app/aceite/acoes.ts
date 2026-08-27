"use server";

import { redirect } from "next/navigation";

import { VERSAO_ACEITE_PRINCIPAL } from "@/lib/consentimento/versao";
import { descartarCookiesDeSessao } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

/**
 * Fluxo de aceite e de recusa.
 *
 * Normativo: D-01/D-02/D-09 §5.1 (fluxo canônico), §5.2 (recusa), §5.4 e
 * §17.3 (P-14 — falha do registro), §17.1 (P-27 — atomicidade), §12.2 (toda
 * mutação passa por caso de uso no servidor).
 */

export type ResultadoAceite = { erro: string } | undefined;

/**
 * Ato explícito de aceite. É este o marco a partir do qual o sistema pode
 * gravar (§5.1): antes dele não existe identidade, cookie nem evento.
 */
export async function aceitar(): Promise<ResultadoAceite> {
  const supabase = await createClient();

  // §5.1: a identidade só nasce depois do ato. Se já houver sessão (o usuário
  // voltou à tela), ela é reaproveitada — §12.10 proíbe recriar identidade sem
  // ato explícito do usuário.
  const { data: sessao } = await supabase.auth.getUser();
  let usuario = sessao.user ?? null;

  if (!usuario) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      return { erro: "Não foi possível iniciar agora. Tente de novo." };
    }
    usuario = data.user;
  }

  // §17.1: profiles e o registro do aceite numa única transação. A função de
  // banco existe justamente porque duas chamadas daqui seriam duas transações.
  const { error } = await supabase.rpc("registrar_aceite_principal", {
    p_document_version_id: VERSAO_ACEITE_PRINCIPAL,
  });

  if (error) {
    // §5.4 e §17.3 (P-14): não pode restar identidade utilizável sem aceite.
    //
    // Remover a linha de auth.users exigiria credencial administrativa, que a
    // aplicação não possui e não deve possuir (§12.8, §14.3.19). A saída
    // prevista pela decisão é então invalidar a sessão. A identidade órfã
    // permanece em auth.users e é detectável pelo ramo AA-08 da consulta de
    // invariante; não há rotina de limpeza, e inventar uma não tem base
    // normativa. Limitação documentada em §17.3.
    const { error: erroSaida } = await supabase.auth.signOut();

    if (erroSaida) {
      // signOut falhou justamente no cenário em que o Supabase já demonstrou
      // instabilidade. Não dá para revogar o refresh token remotamente, mas dá
      // para derrubar a sessão NESTE navegador — que é a metade local do que
      // signOut faria. Sem isto o erro seria engolido em silêncio.
      await descartarCookiesDeSessao();
    }

    // A garantia de fundo não é esta limpeza: é `exigirAceite()`, que fecha as
    // áreas protegidas por AUSÊNCIA DE C-PRINCIPAL CONCEDIDO, e não por
    // ausência de sessão. Mesmo que um cookie sobreviva, nada com dado de
    // usuário abre.
    return { erro: "Não foi possível iniciar agora. Tente de novo." };
  }

  redirect("/onboarding");
}

/**
 * §5.2: recusar encerra o fluxo. Nenhuma identidade, nenhum dado, nenhum
 * evento vinculado. Sem modal de retenção e sem segunda tentativa de
 * convencimento — por isso esta ação não grava absolutamente nada.
 */
export async function recusar() {
  redirect("/aceite/recusa");
}
