/**
 * Testes da camada visual — identidade de marca.
 *
 * Estes testes verificam as regras que o Brand Book chama de "cinco regras que
 * não se quebram", mais a especificação geométrica dos ícones. São regras de
 * marca, não de estilo: quebrá-las descaracteriza o produto.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { RAIZ } from "./support/local-db.mjs";

const ler = (caminho) => readFileSync(`${RAIZ}/${caminho}`, "utf8");

/**
 * Fonte sem comentários. As regras da marca são sobre o que o código USA;
 * um comentário que explica "Brasa é reservada a segurança" não é um uso de
 * Brasa, e confundir os dois faz o teste passar ou falhar pelo motivo errado.
 */
const codigo = (caminho) =>
  ler(caminho)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/** As 11 cores oficiais. Nenhuma outra pode existir no produto. */
const PALETA = [
  "#0f1719", "#1c282c", "#223035", "#e9e7e2", "#c9c6bf", "#6f7d82",
  "#5a82a6", "#7fa6c8", "#3f6485", "#b8792f", "#a24a45",
];

describe("paleta · nenhuma cor fora das 11 oficiais", () => {
  it("tokens.css declara exatamente a paleta oficial", () => {
    const tokens = ler("src/styles/tokens.css");
    const literais = [...tokens.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) =>
      m[0].toLowerCase(),
    );
    for (const cor of literais) {
      assert.ok(PALETA.includes(cor), `cor fora da paleta oficial: ${cor}`);
    }
    for (const cor of PALETA) {
      assert.ok(literais.includes(cor), `cor oficial ausente: ${cor}`);
    }
  });

  it("nenhum componente introduz cor literal", () => {
    for (const arquivo of [
      "src/components/ui/botao.tsx",
      "src/components/ui/aviso.tsx",
      "src/components/marca/icones.tsx",
      "src/components/marca/linha.tsx",
    ]) {
      assert.doesNotMatch(
        codigo(arquivo),
        /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/,
        `${arquivo} deve usar tokens, nunca cor literal`,
      );
    }
  });

  it("não existe verde de sucesso nem vermelho de erro", () => {
    for (const arquivo of [
      "src/components/ui/aviso.tsx",
      "src/components/ui/botao.tsx",
      "src/components/marca/linha.tsx",
    ]) {
      assert.doesNotMatch(
        codigo(arquivo),
        /\b(green|emerald|lime|red|rose|success|danger)\b/i,
        `${arquivo}: a identidade não tem cor de sucesso nem de erro`,
      );
    }
  });

  it("Âmbar-Sinal e Brasa não aparecem fora de segurança", () => {
    // P-05 está aberta: nenhuma tela de segurança existe, logo nenhuma das
    // duas cores pode estar em uso em lugar algum.
    for (const arquivo of [
      "src/components/ui/aviso.tsx",
      "src/components/ui/botao.tsx",
      "src/components/ui/card.tsx",
      "src/components/marca/linha.tsx",
      "src/components/marca/icones.tsx",
    ]) {
      assert.doesNotMatch(
        codigo(arquivo),
        /ambar-sinal|brasa/i,
        `${arquivo}: Âmbar-Sinal e Brasa são exclusivos de segurança e crise`,
      );
    }
  });
});

describe("ícones · grade 24, traço 2, só ângulos retos", () => {
  const fonte = ler("src/components/marca/icones.tsx");
  const paths = [...fonte.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);

  it("os oito ícones existem", () => {
    for (const nome of [
      "IconeCheckIn", "IconeTrajetoria", "IconePlano", "IconeFissura",
      "IconeGatilho", "IconeFolego", "IconeRede", "IconeRetomar",
    ]) {
      assert.match(fonte, new RegExp(`export function ${nome}\\(`), nome);
    }
    assert.equal(paths.length, 8, "deve haver exatamente oito paths");
  });

  it("grade 24 e traço 2, com terminação e junção arredondadas", () => {
    assert.match(fonte, /viewBox="0 0 24 24"/);
    assert.match(fonte, /strokeWidth="2"/);
    assert.match(fonte, /strokeLinecap="round"/);
    assert.match(fonte, /strokeLinejoin="round"/);
  });

  it("nenhuma diagonal: só comandos M, H, V e Z", () => {
    for (const d of paths) {
      const comandos = [...d.matchAll(/[A-Za-z]/g)].map((m) => m[0]);
      for (const c of comandos) {
        assert.ok(
          ["M", "H", "V", "Z"].includes(c.toUpperCase()),
          `comando "${c}" permite diagonal ou curva — proibido em "${d}"`,
        );
      }
    }
  });

  it("nenhum círculo, elipse ou curva", () => {
    assert.doesNotMatch(fonte, /<circle|<ellipse|rx=|ry=/);
  });

  it("todo traço cabe na área ativa de 18 × 18", () => {
    for (const d of paths) {
      for (const [, n] of d.matchAll(/(-?\d+(?:\.\d+)?)/g)) {
        const v = Number(n);
        assert.ok(v >= 3 && v <= 21, `coordenada ${v} fora da área ativa em "${d}"`);
      }
    }
  });
});

describe("A Linha · as regras que não se quebram", () => {
  const fonte = ler("src/components/marca/linha.tsx");

  it("a base é um traço único, independente dos dados", () => {
    // A base é <line> desenhada uma vez; nenhum estado de dia a altera.
    const bases = [...fonte.matchAll(/<line\b/g)];
    assert.equal(bases.length, 1, "a base deve ser um traço só");
    const trecho = fonte.slice(fonte.indexOf("<line"), fonte.indexOf("/>", fonte.indexOf("<line")));
    assert.doesNotMatch(trecho, /dia|estado|map/, "a base não pode depender dos dias");
  });

  it("a altura das marcas não varia com desempenho", () => {
    // Uma única constante de altura, e um único caso previsto de exceção.
    assert.match(fonte, /const ALTURA_MARCA = \d+/);
    assert.match(fonte, /const ALTURA_SEM_REGISTRO = \d+/);
    const alturas = [...fonte.matchAll(/^const ALTURA_[A-Z_]* = /gm)];
    assert.equal(alturas.length, 2, "só pode haver duas alturas: a marca e o dia sem registro");
    assert.match(
      fonte,
      /dia\.estado === "sem-registro"\s*\?\s*ALTURA_SEM_REGISTRO\s*:\s*ALTURA_MARCA/,
      "a altura só pode depender de haver ou não registro",
    );
  });

  it("o dia com aposta é vazado, nunca preenchido", () => {
    assert.match(fonte, /const vazado = dia\.estado === "com-aposta"/);
    assert.match(fonte, /fill=\{vazado \? "none" :/);
  });

  it("hoje usa Mineral Claro, e só hoje", () => {
    assert.match(fonte, /ehHoje \? "var\(--color-mineral-claro\)"/);
    assert.equal(
      [...fonte.matchAll(/mineral-claro/g)].length,
      1,
      "Mineral Claro marca a posição atual e nada mais",
    );
  });

  it("é puro: não lê banco, não emite evento, não cria entidade", () => {
    assert.doesNotMatch(fonte, /supabase|createClient|fetch\(|"use server"|insert|from\(/);
  });

  it("os dados de exemplo cobrem os três estados", () => {
    for (const estado of ["com-registro", "sem-registro", "com-aposta"]) {
      assert.ok(
        fonte.includes(`estado: "${estado}"`),
        `os dados de demonstração devem exercitar "${estado}"`,
      );
    }
  });
});

describe("símbolo · geometria imutável", () => {
  it("viewBox e path oficiais, sem preenchimento", () => {
    const fonte = ler("src/components/marca/simbolo.tsx");
    assert.match(fonte, /viewBox="13 28 70 40"/);
    assert.match(fonte, /d="M 19 62 L 43 62 L 43 34 L 77 34"/);
    assert.match(fonte, /fill="none"/);
    assert.match(fonte, /strokeWidth="12"/);
  });
});

describe("botão · contraste e alvo de toque", () => {
  const fonte = ler("src/components/ui/botao.tsx");

  it("altura de 48 px, o alvo mínimo de toque", () => {
    assert.match(fonte, /h-12/);
  });

  it("o primário é Cal sobre Ardósia, nunca Mineral", () => {
    assert.match(fonte, /bg-botao-primario/);
    assert.doesNotMatch(fonte, /bg-mineral/);
  });

  it("existe variante secundária de peso equivalente", () => {
    assert.match(fonte, /secundario:/);
    assert.match(fonte, /border border-borda/);
  });
});
