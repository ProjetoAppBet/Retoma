/**
 * Testes de higiene do segredo do provedor de IA.
 *
 * §12.8: "Segredos apenas no servidor. Nunca em variáveis `NEXT_PUBLIC_*`."
 *
 * Estes testes não exercitam funcionalidade — exercitam a ausência de um
 * vazamento. O prefixo `NEXT_PUBLIC_` é o que faz uma variável atravessar
 * para o bundle do navegador; a proteção principal é o nome não tê-lo, e o
 * teste mais importante aqui é justamente esse.
 *
 * NENHUM VALOR REAL DE CHAVE aparece neste arquivo, e nenhum é necessário:
 * o que se verifica é forma, nome e caminho de importação.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { RAIZ } from "./support/local-db.mjs";

const AMBIENTE_IA = "src/lib/ia/ambiente.ts";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** Todo arquivo de src/, para varreduras que precisam ser exaustivas. */
function fontes(dir = join(RAIZ, "src"), acc = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) fontes(caminho, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

describe("segredo · o nome nunca é público (§12.8)", () => {
  it("nenhuma variável NEXT_PUBLIC_ de provedor de IA existe", () => {
    for (const arquivo of fontes()) {
      const texto = readFileSync(arquivo, "utf8");
      assert.doesNotMatch(
        texto,
        /NEXT_PUBLIC_[A-Z_]*(OPENAI|ANTHROPIC|AI_|LLM|MODEL)/,
        `${arquivo} expõe segredo de IA ao navegador`,
      );
    }
  });

  it(".env.example documenta a variável sem prefixo público e sem valor", () => {
    const exemplo = readFileSync(`${RAIZ}/.env.example`, "utf8");
    const linhas = [...exemplo.matchAll(/^([A-Z_][A-Z_0-9]*)=(.*)$/gm)];
    const openai = linhas.filter(([, nome]) => nome.includes("OPENAI"));

    assert.equal(openai.length, 1, "a variável precisa estar documentada");
    assert.equal(openai[0][1], "OPENAI_API_KEY");
    assert.equal(openai[0][2], "", "o exemplo não pode conter valor");
    assert.doesNotMatch(openai[0][1], /^NEXT_PUBLIC_/);
  });

  it("todas as variáveis do exemplo são públicas OU declaradas segredo", () => {
    const exemplo = readFileSync(`${RAIZ}/.env.example`, "utf8");
    for (const [, nome, valor] of exemplo.matchAll(/^([A-Z_][A-Z_0-9]*)=(.*)$/gm)) {
      assert.equal(valor, "", `${nome} tem valor no arquivo versionado`);
      if (!nome.startsWith("NEXT_PUBLIC_")) {
        assert.match(
          exemplo,
          /SEGREDO DE SERVIDOR/,
          `${nome} não é pública e o arquivo não avisa que é segredo`,
        );
      }
    }
  });
});

describe("segredo · nada versionado", () => {
  const rastreados = () =>
    execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);

  it("nenhum arquivo .env está no git além do exemplo", () => {
    const envs = rastreados().filter((f) => /(^|\/)\.env/.test(f));
    assert.deepEqual(envs, [".env.example"]);
  });

  it(".env.local é ignorado pelo git", () => {
    const saida = execFileSync("git", ["check-ignore", "-v", ".env.local"], {
      cwd: RAIZ,
      encoding: "utf8",
    });
    assert.match(saida, /\.gitignore/);
  });

  it("nenhum arquivo rastreado contém algo com forma de chave", () => {
    // Formatos de chave da OpenAI (sk-..., sk-proj-...) e Bearer literal.
    const suspeitos = [];
    for (const arquivo of rastreados()) {
      let texto;
      try {
        texto = readFileSync(join(RAIZ, arquivo), "utf8");
      } catch {
        continue; // binário
      }
      if (/\bsk-[A-Za-z0-9_-]{20,}/.test(texto)) suspeitos.push(arquivo);
      if (/Bearer\s+[A-Za-z0-9_-]{20,}/.test(texto)) suspeitos.push(arquivo);
    }
    assert.deepEqual(suspeitos, []);
  });
});

describe("segredo · leitura só no servidor", () => {
  it("o módulo barra leitura no navegador", () => {
    const fonte = codigo(AMBIENTE_IA);
    assert.match(fonte, /typeof window !== "undefined"/);
    assert.match(fonte, /throw new Error/);
  });

  it("nenhum componente de cliente importa o módulo do segredo", () => {
    for (const arquivo of fontes()) {
      const texto = readFileSync(arquivo, "utf8");
      if (!/^\s*["']use client["']/m.test(texto)) continue;
      assert.doesNotMatch(
        texto,
        /from ["']@\/lib\/ia\/ambiente["']/,
        `${arquivo} é componente de cliente e importa o segredo`,
      );
    }
  });

  it("o valor nunca vai para log nem para mensagem de erro", () => {
    const fonte = codigo(AMBIENTE_IA);
    assert.doesNotMatch(fonte, /console\.(log|info|warn|error|debug)/);
    // As mensagens citam o NOME da variável, nunca o valor lido.
    for (const [, mensagem] of fonte.matchAll(/new Error\(([\s\S]*?)\);/g)) {
      assert.doesNotMatch(mensagem, /\$\{valor\}|\+ valor|valor\)/);
    }
  });

  it("existe verificação de presença que não revela o valor", () => {
    const fonte = codigo(AMBIENTE_IA);
    assert.match(fonte, /export function provedorDeIaConfigurado\(\): boolean/);
    const inicio = fonte.indexOf("provedorDeIaConfigurado");
    assert.match(fonte.slice(inicio), /return Boolean\(process\.env\[NOME\]\)/);
  });
});

describe("segredo · ainda não há chamada a modelo (§14.4.30)", () => {
  it("o módulo lê variável e nada mais", () => {
    const fonte = codigo(AMBIENTE_IA);
    for (const padrao of [
      /\bfetch\(/, /axios/, /https?:\/\//, /openai\./i,
      /completion/i, /prompt/i, /messages:/,
    ]) {
      assert.doesNotMatch(fonte, padrao, `${AMBIENTE_IA} faz mais que ler`);
    }
  });

  it("nenhuma dependência de provedor de IA foi instalada", () => {
    const pkg = JSON.parse(readFileSync(`${RAIZ}/package.json`, "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const termo of ["openai", "anthropic", "@ai-sdk", "langchain"]) {
      assert.ok(
        !deps.some((d) => d.includes(termo)),
        `dependência de IA instalada: ${termo}`,
      );
    }
  });

  it("nada na aplicação chama o leitor do segredo ainda", () => {
    const usos = fontes().filter(
      (a) =>
        !a.endsWith("ia/ambiente.ts") &&
        /chaveDoProvedorDeIa/.test(readFileSync(a, "utf8")),
    );
    assert.deepEqual(
      usos,
      [],
      "a chave só deve ser lida quando a chamada existir",
    );
  });
});
