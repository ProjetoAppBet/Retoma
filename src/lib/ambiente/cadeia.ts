/**
 * Reconstrução das cadeias de `commitments` — lógica pura, sem banco.
 *
 * `commitments` é append-only com supersessão (Q-10, §19.1): uma mesma
 * promessa pode ocupar várias linhas — a declaração, suas correções e o
 * resultado. Tratar cada linha como um compromisso independente
 * multiplicaria na tela algo que a pessoa fez uma vez só.
 *
 * Está separado do módulo de leitura de propósito: sem `createClient` nem
 * `next/headers` aqui dentro, esta função roda em teste direto, com cadeias
 * montadas à mão. É a parte que pode errar em silêncio.
 */

/** Q-06, menos `sem_resposta` — sem produtor enquanto P-29 estiver aberta. */
export type ResultadoDoCompromisso = "cumprido" | "não_cumprido";

/** Uma linha crua de `commitments`, como vem do banco. */
export type LinhaDeCompromisso = {
  id: string;
  commitment_declaration: string | null;
  due_at: string | null;
  outcome: string | null;
  recorded_at: string;
  supersedes_id: string | null;
};

/** Uma cadeia inteira: a promessa, suas correções e o desfecho, se houver. */
export type CadeiaDeCompromisso = {
  /** Identificador da raiz — chave estável na lista. */
  id: string;
  /** A declaração CORRENTE: a última versão da cadeia que carrega uma. */
  declaracao: string | null;
  /** Quando a promessa foi feita — `recorded_at` da raiz. */
  declaradoEm: string;
  /** Prazo corrente, quando existe. Compromisso do Hoje nasce sem (P-31). */
  dueAt: string | null;
  /** Resultado declarado, ou null enquanto a cadeia estiver aberta. */
  outcome: ResultadoDoCompromisso | null;
  /** Quando o resultado foi registrado — `recorded_at` da linha de resultado. */
  respondidoEm: string | null;
  /** Quantas vezes a declaração foi corrigida por supersessão (Q-10). */
  correcoes: number;
  /** Quantas linhas a cadeia ocupa no banco. Nenhuma é escondida. */
  versoes: number;
};

/**
 * Agrupa as linhas em cadeias.
 *
 * `linhas` precisa vir na ordenação canônica de L-04 — `recorded_at desc,
 * id desc`. A ordem das cadeias devolvidas é a ordem em que as raízes
 * aparecem ali, então nada é reordenado aqui: a consulta já decidiu.
 */
export function reconstruirCadeias(
  linhas: LinhaDeCompromisso[],
): CadeiaDeCompromisso[] {
  // Quem supera quem. Q-14 garante que cada versão é superada no máximo uma
  // vez, então a sucessão é função, não relação — a cadeia é linear.
  const sucessora = new Map<string, LinhaDeCompromisso>();
  const existe = new Set(linhas.map((l) => l.id));
  for (const l of linhas) {
    if (l.supersedes_id !== null) sucessora.set(l.supersedes_id, l);
  }

  const cadeias: CadeiaDeCompromisso[] = [];

  for (const raiz of linhas) {
    // Linha cuja anterior não está no conjunto também conta como raiz. Isso
    // não deveria acontecer — a chave estrangeira composta de R5 prende a
    // cadeia à mesma identidade, e a RLS traz a identidade inteira —, mas
    // engolir a linha em silêncio seria esconder dado real da pessoa.
    if (raiz.supersedes_id !== null && existe.has(raiz.supersedes_id)) continue;

    const visitadas = new Set<string>();
    let atual: LinhaDeCompromisso | undefined = raiz;

    let declaracao = raiz.commitment_declaration;
    let dueAt = raiz.due_at;
    let outcome: ResultadoDoCompromisso | null = null;
    let respondidoEm: string | null = null;
    let correcoes = 0;
    let versoes = 0;

    // `visitadas` não é zelo supersticioso: sem ela, dado corrompido em ciclo
    // travaria a renderização da página inteira.
    while (atual && !visitadas.has(atual.id)) {
      visitadas.add(atual.id);
      versoes++;

      if (atual !== raiz && atual.commitment_declaration !== null) {
        // §19.4: a linha de resultado NÃO repete a declaração. Uma linha não
        // raiz que traz declaração é, portanto, correção (Q-10).
        correcoes++;
      }
      if (atual.commitment_declaration !== null) {
        declaracao = atual.commitment_declaration;
      }
      if (atual.due_at !== null) dueAt = atual.due_at;
      if (atual.outcome !== null) {
        outcome = atual.outcome as ResultadoDoCompromisso;
        respondidoEm = atual.recorded_at;
      }

      atual = sucessora.get(atual.id);
    }

    cadeias.push({
      id: raiz.id,
      declaracao,
      declaradoEm: raiz.recorded_at,
      dueAt,
      outcome,
      respondidoEm,
      correcoes,
      versoes,
    });
  }

  return cadeias;
}
