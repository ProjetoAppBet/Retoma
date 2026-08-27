import { readFile } from "node:fs/promises";
import path from "node:path";

import { VERSAO_ACEITE_PRINCIPAL } from "./versao";

/**
 * Carrega o documento de aceite a partir do arquivo versionado em `docs/`.
 *
 * §10.2 exige que, a partir de um registro de consentimento, se recupere
 * exatamente o texto que aquele usuário viu. Por isso a tela lê o próprio
 * arquivo imutável em vez de manter uma cópia do texto no código: duas cópias
 * divergem, e uma cópia divergente esvazia a auditoria.
 *
 * O arquivo é incluído no bundle de servidor por `outputFileTracingIncludes`
 * em `next.config.ts`.
 */

export type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "secao"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; ordenada: boolean; itens: string[] };

export function caminhoDoDocumento(versao = VERSAO_ACEITE_PRINCIPAL) {
  return path.join(process.cwd(), "docs", "consentimento", `${versao}.md`);
}

/** Remove marcadores inline; o texto de aceite não depende de ênfase. */
function limpar(linha: string) {
  return linha.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();
}

/**
 * Converte o markdown do documento nos blocos que a tela renderiza.
 *
 * As linhas de citação (`>`) são notas normativas internas — procedência,
 * imutabilidade, pendência jurídica — e não fazem parte do que se apresenta ao
 * usuário. A linha do identificador também não: ela é gravada no registro, não
 * exibida como texto de aceite.
 */
export function analisar(markdown: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      blocos.push({ tipo: "paragrafo", texto: limpar(paragrafo.join(" ")) });
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      blocos.push({ tipo: "lista", ...lista });
      lista = null;
    }
  };
  const fechar = () => {
    fecharParagrafo();
    fecharLista();
  };

  for (const bruta of markdown.split("\n")) {
    const linha = bruta.trim();

    if (linha === "" || linha === "---" || linha.startsWith(">")) {
      fechar();
      continue;
    }
    if (linha.startsWith("**Identificador de versão:**")) {
      fechar();
      continue;
    }
    if (linha.startsWith("## ")) {
      fechar();
      blocos.push({ tipo: "secao", texto: limpar(linha.slice(3)) });
      continue;
    }
    if (linha.startsWith("# ")) {
      fechar();
      blocos.push({ tipo: "titulo", texto: limpar(linha.slice(2)) });
      continue;
    }

    const numerado = linha.match(/^(\d+)\.\s+(.*)$/);
    const marcado = linha.match(/^-\s+(.*)$/);
    if (numerado || marcado) {
      fecharParagrafo();
      const ordenada = Boolean(numerado);
      const item = limpar((numerado ? numerado[2] : marcado![1]) ?? "");
      if (lista && lista.ordenada === ordenada) lista.itens.push(item);
      else {
        fecharLista();
        lista = { ordenada, itens: [item] };
      }
      continue;
    }

    // Continuação de item de lista quebrado em várias linhas.
    if (lista) lista.itens[lista.itens.length - 1] += ` ${limpar(linha)}`;
    else paragrafo.push(linha);
  }

  fechar();
  return blocos;
}

export async function carregarDocumento(versao = VERSAO_ACEITE_PRINCIPAL) {
  return analisar(await readFile(caminhoDoDocumento(versao), "utf8"));
}
