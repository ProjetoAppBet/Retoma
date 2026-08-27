import { createClient } from "@/lib/supabase/server";

/**
 * Leitura de `recovery_goals` — o objetivo corrente e a motivação.
 *
 * Op. §8 ("Plano individual de recuperação") lista seis componentes:
 * Objetivo, Motivação, Plano de ação, Plano de enfrentamento, Estratégias
 * pessoais e Revisão. **Só os dois primeiros existem** como dado: são as
 * Etapas 1 e 6 do onboarding, gravadas em `recovery_goals` (§11.2). Os
 * outros quatro não têm entidade, e §11.3 os mantém fora do núcleo mínimo.
 *
 * `commitments` NÃO entra aqui. Q-07 fixa que compromisso é independente de
 * plano e que o vínculo é opcional — e, como §11.3 mantém planos fora do
 * núcleo mínimo, esse vínculo não tem contraparte. Exibir compromissos como
 * se fossem plano afirmaria uma relação que o modelo não tem.
 *
 * A RLS limita a leitura ao dono (§7.3): não há filtro por `user_id` no
 * código porque pedir o que não é seu devolve conjunto vazio.
 */

export type ObjetivoCorrente = {
  /** Q-02: um entre interromper, reduzir, ainda não decidido. */
  goalType: string;
  /** Etapa 6 do onboarding, texto livre da pessoa. */
  goalDeclaration: string | null;
  /** Etapa 1 do onboarding, texto livre da pessoa. */
  motivationDeclaration: string | null;
  declaradoEm: string;
};

export type LeituraDoObjetivo = {
  objetivo: ObjetivoCorrente | null;
  /** A consulta falhou. Distinto de "não há objetivo declarado". */
  erro: boolean;
};

type Linha = {
  goal_type: string;
  goal_declaration: string | null;
  motivation_declaration: string | null;
  recorded_at: string;
};

/**
 * Objetivo corrente.
 *
 * Q-01 fixa um objetivo ativo por usuário, e o objetivo ativo é **derivado**:
 * é a linha mais recente, nunca uma coluna `is_active` — §6.2.4 e §8.2 já
 * fixam que estado duplicado é estado que diverge.
 *
 * Ordenação canônica (L-04): `recorded_at` sozinho não desempata, porque
 * `now()` devolve o horário da TRANSAÇÃO. O desempate por `id` é técnico —
 * torna a leitura única e estável, e não afirma cronologia.
 */
export async function carregarObjetivoCorrente(): Promise<LeituraDoObjetivo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recovery_goals")
    .select("goal_type, goal_declaration, motivation_declaration, recorded_at")
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) return { objetivo: null, erro: true };

  const linha = (data ?? [])[0] as Linha | undefined;
  if (!linha) return { objetivo: null, erro: false };

  return {
    objetivo: {
      goalType: linha.goal_type,
      goalDeclaration: linha.goal_declaration,
      motivationDeclaration: linha.motivation_declaration,
      declaradoEm: linha.recorded_at,
    },
    erro: false,
  };
}
