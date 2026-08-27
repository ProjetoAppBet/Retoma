"use server";

import {
  CONSEQUENCIAS,
  ESTADOS_DE_RESPOSTA,
  FREQUENCIAS,
  HORIZONTE_DO_COMPROMISSO_MS,
  NATUREZA_DECLARADA,
  PERIODOS,
  TIPOS_DE_OBJETIVO,
} from "@/lib/onboarding/dominios";
import { exigirAceite } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

/**
 * Gravação das respostas do onboarding.
 *
 * Modelo B (decisão de persistência): a linha de cada entidade só é gravada
 * quando a entidade puder nascer **semanticamente completa**. As respostas
 * intermediárias vivem no estado do cliente e não tocam o banco.
 *
 * Consequências vinculantes dessa decisão:
 * - `recovery_goals` só na Etapa 6, porque `goal_type` é NOT NULL e a tabela
 *   não tem coluna de estado de resposta: gravar antes exigiria inventar uma
 *   declaração, contra §11.5.1.2.
 * - `gambling_history` numa única linha após a Etapa 5, reunindo as Etapas 2
 *   a 5.
 * - `supersedes_id` NÃO é usado aqui. Ele é o mecanismo de correção de Q-10;
 *   progresso de onboarding não é histórico de correção.
 * - `commitments` NÃO é escrita por insert direto: §19.1.2 revogou esse
 *   privilégio do cliente, e a escrita passa pela função transacional que
 *   impõe Q-12. As outras duas entidades seguem por insert.
 *
 * Normativo: §5.1 (ordem), §9.2 (invariante), §12.1 e §12.2 (nada antes do
 * aceite; mutação no servidor), §11.5.2, §11.6 (Q-02, Q-05, Q-09, Q-10),
 * Op. §12.
 */

export type Resultado = { erro: string } | { ok: true };

const emDominio = <T extends readonly string[]>(lista: T, valor: unknown) =>
  typeof valor === "string" && (lista as readonly string[]).includes(valor);

/**
 * O onboarding grava SEMPRE raiz de cadeia — nunca usa `supersedes_id`.
 * Rodá-lo duas vezes para a mesma identidade, portanto, não corrige nada:
 * grava a mesma declaração outra vez, com outro timestamp, e a versão
 * anterior deixa de ser corrente sem que nada registre que houve correção.
 *
 * §6.2.4 e §8.2 (estado duplicado é estado que diverge) e Q-10 (corrigir
 * preserva a declaração anterior, por supersessão) não admitem isso. Esta
 * guarda é a mesma ideia que Q-12 já impõe em `commitments`, aplicada às
 * outras duas entidades — que ainda escrevem por insert direto.
 */
async function jaDeclarou(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabela: "recovery_goals" | "gambling_history",
): Promise<boolean> {
  const { data } = await supabase
    .from(tabela)
    .select("id")
    .is("supersedes_id", null)
    .limit(1);

  // A RLS já restringe as linhas às do próprio usuário (§7.3).
  return (data?.length ?? 0) > 0;
}

/** Etapas 2 a 5 · uma única linha, gravada ao concluir a Etapa 5. */
export async function gravarHistorico(entrada: {
  frequencyCategory: string | null;
  frequencyResponseState: string;
  frequencyOriginalExpression: string | null;
  amountDeclared: number | null;
  amountPeriod: string | null;
  amountOriginalExpression: string | null;
  amountResponseState: string;
  consequenceCategories: string[];
  mainConsequenceCategory: string | null;
  mainConsequenceDeclaration: string | null;
  previousAttemptsDescription: string | null;
}): Promise<Resultado> {
  const usuario = await exigirAceite();

  // §11.5.2: o estado da resposta é obrigatório e fechado. Validado aqui e
  // novamente pelo CHECK da migration — nenhuma das duas barreiras é
  // dispensável.
  if (!emDominio(ESTADOS_DE_RESPOSTA, entrada.frequencyResponseState)) {
    return { erro: "Estado de resposta da frequência fora do domínio." };
  }
  if (!emDominio(ESTADOS_DE_RESPOSTA, entrada.amountResponseState)) {
    return { erro: "Estado de resposta do valor fora do domínio." };
  }
  if (
    entrada.frequencyCategory !== null &&
    !emDominio(FREQUENCIAS, entrada.frequencyCategory)
  ) {
    return { erro: "Frequência fora do domínio." };
  }
  if (entrada.amountPeriod !== null && !emDominio(PERIODOS, entrada.amountPeriod)) {
    return { erro: "Período fora do domínio." };
  }
  if (
    entrada.mainConsequenceCategory !== null &&
    !emDominio(CONSEQUENCIAS, entrada.mainConsequenceCategory)
  ) {
    return { erro: "Consequência principal fora do domínio." };
  }
  if (!entrada.consequenceCategories.every((c) => emDominio(CONSEQUENCIAS, c))) {
    return { erro: "Categoria de consequência fora do domínio." };
  }
  // §11.5.2: período "outro" exige preservar a expressão original.
  if (
    entrada.amountPeriod === "outro" &&
    !entrada.amountOriginalExpression?.trim()
  ) {
    return { erro: "Descreva o período com suas palavras." };
  }

  const supabase = await createClient();

  if (await jaDeclarou(supabase, "gambling_history")) {
    return { erro: "Seu histórico já foi registrado." };
  }

  const { error } = await supabase.from("gambling_history").insert({
    user_id: usuario.id,
    information_nature: NATUREZA_DECLARADA,
    frequency_category: entrada.frequencyCategory,
    frequency_response_state: entrada.frequencyResponseState,
    frequency_original_expression: entrada.frequencyOriginalExpression,
    amount_declared: entrada.amountDeclared,
    amount_period: entrada.amountPeriod,
    amount_original_expression: entrada.amountOriginalExpression,
    amount_response_state: entrada.amountResponseState,
    consequence_categories:
      entrada.consequenceCategories.length > 0
        ? entrada.consequenceCategories
        : null,
    main_consequence_category: entrada.mainConsequenceCategory,
    main_consequence_declaration: entrada.mainConsequenceDeclaration,
    // §11.5.1: a tentativa anterior de parar pertence a gambling_history.
    previous_attempts_relapse_description: entrada.previousAttemptsDescription,
  });

  if (error) return { erro: "Não foi possível guardar agora. Tente de novo." };
  return { ok: true };
}

/** Etapas 1 e 6 · uma única linha, gravada ao concluir a Etapa 6. */
export async function gravarObjetivo(entrada: {
  motivationDeclaration: string | null;
  goalDeclaration: string | null;
  goalType: string;
}): Promise<Resultado> {
  const usuario = await exigirAceite();

  // Q-02: domínio fechado. O valor vem de escolha explícita do usuário na
  // Etapa 6 — nunca de classificação do texto livre, que exigiria inferência.
  if (!emDominio(TIPOS_DE_OBJETIVO, entrada.goalType)) {
    return { erro: "Escolha o que você quer fazer com as apostas." };
  }

  const supabase = await createClient();

  if (await jaDeclarou(supabase, "recovery_goals")) {
    return { erro: "Seu objetivo já foi registrado." };
  }

  const { error } = await supabase.from("recovery_goals").insert({
    user_id: usuario.id,
    goal_type: entrada.goalType,
    goal_declaration: entrada.goalDeclaration,
    motivation_declaration: entrada.motivationDeclaration,
    information_nature: NATUREZA_DECLARADA,
    // supersedes_id fica nulo: esta é a primeira declaração, não correção.
  });

  if (error) return { erro: "Não foi possível guardar agora. Tente de novo." };
  return { ok: true };
}

/** Etapa final · compromisso mínimo para as próximas 24 horas (Op. §12). */
export async function gravarCompromisso(entrada: {
  commitmentDeclaration: string;
}): Promise<Resultado> {
  // §12.1: rota protegida. O identificador não é usado aqui — a função de
  // banco lê a identidade da própria sessão.
  await exigirAceite();

  if (!entrada.commitmentDeclaration.trim()) {
    return { erro: "Escreva o que você quer fazer nas próximas 24 horas." };
  }

  // §19.1.2: `insert` em `commitments` foi revogado do papel do cliente. A
  // escrita passa exclusivamente pela função transacional, que toma a trava
  // por usuário antes de verificar Q-12 — verificar aqui, na aplicação, não
  // seria garantia: duas requisições concorrentes leriam "nenhum ativo".
  //
  // A identidade NÃO é enviada: a função a lê de auth.uid() (§19.2.1).
  const supabase = await createClient();
  const { error } = await supabase.rpc("declarar_compromisso", {
    p_commitment_declaration: entrada.commitmentDeclaration.trim(),
    p_due_at: new Date(Date.now() + HORIZONTE_DO_COMPROMISSO_MS).toISOString(),
  });

  if (error) {
    // §18.2: a recusa por compromisso ativo é estado esperado, não falha.
    if (error.code === "23505") {
      return { erro: "Você já tem um compromisso em aberto." };
    }
    return { erro: "Não foi possível guardar agora. Tente de novo." };
  }
  return { ok: true };
}
