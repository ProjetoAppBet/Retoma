"use server";

import { redirect } from "next/navigation";

import { VERSAO_ACEITE_CONTA } from "@/lib/consentimento/versao";
import { createClient } from "@/lib/supabase/server";

/**
 * Encerrar sessão e converter para conta permanente.
 *
 * Normativo: D-01/D-02/D-09 §3.4 (continuidade e conversão), §3.5 (perda de
 * sessão), §4.3 (granularidade), §17.5 (P-13 — logout), §17.6 (P-09 —
 * C-CONTA), §12.2 e §12.10.
 */

export type Resultado = { erro: string } | undefined;

/**
 * §17.5 (P-13): o logout existe e, para identidade anônima, é irreversível.
 * A confirmação explícita é exigida aqui também, e não só na interface — uma
 * ação de servidor que encerra a identidade não pode depender apenas de um
 * botão para saber que houve confirmação.
 *
 * §12.10 é satisfeita justamente por isso: o único caminho que invalida a
 * identidade é o ato explícito do usuário.
 */
export async function sair(formData: FormData): Promise<Resultado> {
  if (formData.get("confirmacao") !== "confirmado") {
    return { erro: "Confirme que entendeu antes de sair." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { erro: "Não foi possível sair agora. Tente de novo." };

  redirect("/");
}

/**
 * §3.4: vincular credencial à identidade pseudônima corrente, tornando-a
 * permanente. O UUID não muda, e por isso nenhum dado é migrado ou
 * re-vinculado — os dados já pertencem a esta identidade.
 *
 * §17.6 (P-09): C-CONTA é consentimento próprio e auditável, registrado
 * explicitamente. §4.3 proíbe pré-marcá-lo, antecipá-lo ou agrupá-lo com o
 * aceite principal — daí a confirmação separada.
 */
export async function converterParaConta(formData: FormData): Promise<Resultado> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const consentiu = formData.get("consentimento") === "concedido";

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }
  if (!consentiu) {
    return { erro: "É preciso concordar em criar a conta permanente." };
  }

  const supabase = await createClient();

  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) {
    return { erro: "Sua sessão expirou. Não é possível criar a conta agora." };
  }

  // §3.4: se a credencial já pertence a outra conta, a operação FALHA — nada
  // é gravado e nada é mesclado. Nenhuma lógica de fusão é escrita aqui.
  const { error: erroCredencial } = await supabase.auth.updateUser({
    email,
    password: senha,
  });

  if (erroCredencial) {
    // §3.4: falha de vinculação preserva a sessão pseudônima intacta. Nunca
    // desconectar, nunca limpar cookie, nunca criar identidade nova.
    return {
      erro: "Não foi possível usar esse e-mail. A sua sessão atual continua ativa.",
    };
  }

  // §17.6: o registro de C-CONTA vem depois da vinculação bem-sucedida —
  // registrar antes afirmaria um consentimento para um ato que pode falhar.
  const { error: erroConsentimento } = await supabase
    .from("consent_records")
    .insert({
      user_id: sessao.user.id,
      consent_type: "C-CONTA",
      state: "concedido",
      document_version_id: VERSAO_ACEITE_CONTA,
    });

  if (erroConsentimento) {
    // A credencial já está vinculada e os dados seguem intactos. Diferente do
    // aceite principal (§5.4), aqui não existe identidade sem aceite: a
    // identidade já era legítima antes da conversão. O usuário é informado.
    return {
      erro: "A conta foi criada, mas não foi possível registrar o consentimento. Fale sobre isso antes de continuar.",
    };
  }

  redirect("/conta?convertida=1");
}
