import { createClient } from "@/lib/supabase/server";

import {
  type CadeiaDeCompromisso,
  type LinhaDeCompromisso,
  reconstruirCadeias,
} from "./cadeia";

export type { CadeiaDeCompromisso, ResultadoDoCompromisso } from "./cadeia";

/**
 * Leitura de `commitments` — o compromisso ativo e o histórico.
 *
 * Uma consulta só. O agrupamento em cadeias vive em `cadeia.ts`, separado
 * justamente para poder ser testado sem banco.
 *
 * O que este módulo NÃO faz, e é deliberado:
 * - não infere aposta, recaída, abstinência nem estado clínico;
 * - não deriva "dia sem aposta" — não existe fonte (§18.1.3);
 * - não pontua, não calcula média, não compara períodos.
 *
 * Tudo o que sai daqui está gravado no banco. A RLS limita a leitura ao dono
 * (§7.3): não há filtro por `user_id` no código porque pedir o que não é seu
 * devolve conjunto vazio.
 */

export type CompromissoAtivo = {
  id: string;
  commitment_declaration: string | null;
  due_at: string | null;
};

/** As colunas usadas — nenhuma além destas, e nenhuma inventada. */
const COLUNAS =
  "id, commitment_declaration, due_at, outcome, recorded_at, supersedes_id";

/**
 * Compromisso ativo, na definição de §18.2: do usuário, `outcome` nulo e
 * **não superado** por outra versão.
 *
 * A definição é deliberadamente independente de recência — não é "o mais
 * recente". Satisfeita a cardinalidade de Q-12, existe no máximo uma linha
 * que atende aos três critérios.
 *
 * "Não superado" é propriedade da CADEIA, não da linha: por isso a leitura
 * traz as linhas do usuário e descarta as que aparecem como `supersedes_id`
 * de alguma outra.
 */
export async function carregarCompromissoAtivo(): Promise<CompromissoAtivo | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("commitments").select(COLUNAS);

  const linhas = (data ?? []) as LinhaDeCompromisso[];
  const superadas = new Set(
    linhas.map((l) => l.supersedes_id).filter((v): v is string => v !== null),
  );

  const ativo = linhas.find((l) => l.outcome === null && !superadas.has(l.id));
  if (!ativo) return null;

  return {
    id: ativo.id,
    commitment_declaration: ativo.commitment_declaration,
    due_at: ativo.due_at,
  };
}

export type Historico = {
  cadeias: CadeiaDeCompromisso[];
  /** A consulta falhou. Distinto de "não há histórico". */
  erro: boolean;
};

/**
 * Histórico completo, agrupado por cadeia.
 *
 * UMA consulta. A reconstrução é feita em memória porque "quem supera quem"
 * é relação entre linhas do próprio conjunto — resolvê-la no banco custaria
 * uma recursiva por cadeia, e o conjunto de uma identidade é pequeno.
 */
export async function carregarHistoricoDeCompromissos(): Promise<Historico> {
  const supabase = await createClient();

  // Ordenação canônica (L-04): `recorded_at` sozinho não desempata, porque
  // `now()` devolve o horário da TRANSAÇÃO — duas linhas gravadas juntas
  // recebem o mesmo instante. O desempate por `id` é técnico: torna a
  // leitura única e estável, e não afirma cronologia (uuid v4 é aleatório).
  const { data, error } = await supabase
    .from("commitments")
    .select(COLUNAS)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) return { cadeias: [], erro: true };

  return {
    cadeias: reconstruirCadeias((data ?? []) as LinhaDeCompromisso[]),
    erro: false,
  };
}
