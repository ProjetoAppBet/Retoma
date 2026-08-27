"use server";

import { revalidatePath } from "next/cache";

import { exigirAceite } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

/**
 * Resultado de um compromisso.
 *
 * Q-11 (§18.1): o "Hoje" registra o resultado **de um compromisso**, não o
 * resultado de um dia. Não existe entidade de registro diário, e criar uma
 * está vedado por §14.4.25 enquanto CF-11 (§18.7) não for resolvido.
 *
 * Q-13 (§18.3): "Depois" **não passa por aqui**. Adiar não grava nada — não
 * há ação de servidor para ele, e é por isso que este arquivo expõe uma
 * única função.
 *
 * §19.1: a gravação é supersessão append-only, feita pela função
 * transacional. `insert` direto em `commitments` foi revogado do papel do
 * cliente (§19.1.2), e a identidade vem de `auth.uid()` dentro da função —
 * nunca daqui (§19.2.1).
 *
 * §18.5: `sem_resposta` não é aceito. Ele designa ausência de resposta e não
 * tem produtor persistente enquanto P-29 estiver aberta.
 *
 * §18.1.1 autoriza o "Hoje" a oferecer a declaração de um compromisso quando
 * não há ativo — daí a segunda ação deste arquivo. `p_due_at` vai NULO por
 * decisão consciente: ver a nota em `declararCompromisso`.
 */

export type Resultado = { erro: string } | { ok: true };

/** Q-06, menos `sem_resposta`: ver P-29 acima. */
const RESULTADOS_ACEITOS = ["cumprido", "não_cumprido"] as const;

export type ResultadoDeclarado = (typeof RESULTADOS_ACEITOS)[number];

export async function registrarResultado(entrada: {
  commitmentId: string;
  outcome: string;
}): Promise<Resultado> {
  await exigirAceite();

  if (!(RESULTADOS_ACEITOS as readonly string[]).includes(entrada.outcome)) {
    return { erro: "Resultado fora do domínio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_resultado_do_compromisso", {
    p_commitment_id: entrada.commitmentId,
    p_outcome: entrada.outcome,
  });

  if (error) {
    // §18.2: já respondido ou já superado é estado esperado, não falha —
    // acontece com dois envios do mesmo formulário.
    if (error.code === "23505") {
      return { erro: "Esse compromisso já foi respondido." };
    }
    return { erro: "Não foi possível guardar agora. Tente de novo." };
  }

  revalidatePath("/hoje");
  revalidatePath("/trajetoria");
  return { ok: true };
}

/**
 * Declaração de compromisso a partir do "Hoje".
 *
 * §18.1.1: "Em um momento sem compromisso ativo, o Hoje não pergunta cumpriu
 * ou não cumpriu — não há sujeito para a pergunta. O que ele pode oferecer é
 * declarar um compromisso."
 *
 * §19.1: a escrita passa pela função transacional, que toma a trava por
 * usuário antes de verificar Q-12. Verificar aqui não seria garantia: duas
 * requisições simultâneas leriam "nenhum ativo" e ambas passariam.
 *
 * PRAZO VAI NULO, e isso é deliberado. Op. §12 fixa 24 horas para o
 * compromisso INICIAL — o do fim do onboarding —, e nada no repositório
 * define horizonte para os seguintes; §19 da migration registra isso
 * explicitamente ("nenhuma duração é imposta aqui"). Enviar 24 horas daqui
 * afirmaria um prazo que o produto nunca decidiu. O schema admite `due_at`
 * nulo, e um compromisso sem prazo é exatamente o que a ausência de decisão
 * descreve. Ver P-31 na seção 13 do documento normativo.
 */
export async function declararCompromisso(entrada: {
  commitmentDeclaration: string;
}): Promise<Resultado> {
  await exigirAceite();

  const declaracao = entrada.commitmentDeclaration.trim();
  if (!declaracao) {
    return { erro: "Escreva o que você quer fazer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("declarar_compromisso", {
    p_commitment_declaration: declaracao,
    p_due_at: null,
  });

  if (error) {
    // §18.2 / Q-12: já existe ativo. Estado esperado — acontece com dois
    // envios do mesmo formulário, ou com duas abas abertas.
    if (error.code === "23505") {
      return { erro: "Você já tem um compromisso em aberto." };
    }
    return { erro: "Não foi possível guardar agora. Tente de novo." };
  }

  revalidatePath("/hoje");
  revalidatePath("/trajetoria");
  return { ok: true };
}
