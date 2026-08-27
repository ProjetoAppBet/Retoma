/**
 * Testes do PLANO.
 *
 * O que esta rodada decidiu, e que os testes precisam travar: o Plano mostra
 * os DOIS componentes de Op. §8 que têm dado real — Objetivo e Motivação, das
 * Etapas 1 e 6 do onboarding, em `recovery_goals` — e não promete os quatro
 * que não têm entidade (Plano de ação, Plano de enfrentamento, Estratégias,
 * Revisão), que §11.3 mantém fora do núcleo mínimo.
 *
 * E o que ele NÃO faz: não usa `commitments`. Q-07 fixa que compromisso é
 * independente de plano, e o vínculo opcional não tem contraparte enquanto
 * planos estiverem fora do núcleo mínimo.
 *
 * Normativo: §7.3, §11.2, §11.3, Q-01, Q-02, Q-07, L-04, Op. §8.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  RAIZ,
  TABELAS_AUTORIZADAS,
  criarUsuarioComAceite,
  escreverComoUsuario,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
} from "./support/local-db.mjs";

const PAGINA = "src/app/(ambiente)/plano/page.tsx";
const LEITURA = "src/lib/ambiente/objetivo.ts";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** O que `gravarObjetivo` faz — insert direto, como na aplicação. */
function declararObjetivo(userId, { tipo, objetivo, motivacao }) {
  return escreverComoUsuario(
    userId,
    `insert into public.recovery_goals
       (user_id, goal_type, goal_declaration, motivation_declaration, information_nature)
     values (${literal(userId)}, ${literal(tipo)},
             ${objetivo === null ? "null" : literal(objetivo)},
             ${motivacao === null ? "null" : literal(motivacao)}, 'declarado')`,
  );
}

/** O que `carregarObjetivoCorrente()` devolve: Q-01 + ordenação de L-04. */
function objetivoCorrente(userId) {
  const linha = sql(
    `select goal_type || '|' || coalesce(goal_declaration, '(nulo)')
            || '|' || coalesce(motivation_declaration, '(nulo)')
     from public.recovery_goals
     where user_id = ${literal(userId)}
     order by recorded_at desc, id desc
     limit 1`,
  );
  return linha === "" ? null : linha;
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("PLANO · sem objetivo declarado", () => {
  it("identidade sem onboarding concluído não tem objetivo", () => {
    const u = criarUsuarioComAceite();
    assert.equal(objetivoCorrente(u), null);
  });

  it("a tela distingue vazio, erro e conteúdo", () => {
    const fonte = codigo(PAGINA);
    assert.match(fonte, /erro \?/, "erro é estado próprio");
    assert.match(fonte, /: !objetivo \?/, "vazio é estado próprio");
    assert.match(fonte, /<Vazio/, "usa o componente de vazio existente");
  });

  it("o vazio oferece caminho para Hoje, e não inventa plano", () => {
    const fonte = codigo(PAGINA);
    const inicio = fonte.indexOf("<Vazio");
    const bloco = fonte.slice(inicio, fonte.indexOf("</Vazio>"));
    assert.match(bloco, /href="\/hoje"/);
    assert.doesNotMatch(bloco, /criar|começar plano|adicionar/i);
  });
});

describe("PLANO · com objetivo declarado", () => {
  it("mostra objetivo e motivação reais", () => {
    const u = criarUsuarioComAceite();
    declararObjetivo(u, {
      tipo: "interromper",
      objetivo: "voltar a dormir tranquilo",
      motivacao: "minha filha perguntou o que estava acontecendo",
    });
    assert.equal(
      objetivoCorrente(u),
      "interromper|voltar a dormir tranquilo|minha filha perguntou o que estava acontecendo",
    );
  });

  it("Q-01/L-04: o objetivo corrente é a linha mais recente", () => {
    const u = criarUsuarioComAceite();
    // Duas versões, gravadas direto no banco: a guarda da aplicação impede
    // uma segunda RAIZ, mas correção por supersessão é legítima (Q-10) e a
    // leitura precisa mostrar a corrente, não a primeira.
    const raiz = sql("select gen_random_uuid()");
    sql(
      `insert into public.recovery_goals
         (id, user_id, goal_type, goal_declaration, information_nature)
       values (${literal(raiz)}, ${literal(u)}, 'reduzir', 'primeira versão', 'declarado')`,
    );
    sql(
      `insert into public.recovery_goals
         (user_id, goal_type, goal_declaration, information_nature, supersedes_id)
       values (${literal(u)}, 'interromper', 'versão corrigida', 'declarado', ${literal(raiz)})`,
    );
    assert.match(objetivoCorrente(u), /^interromper\|versão corrigida/);
    assert.equal(
      sql(
        `select count(*) from public.recovery_goals where user_id = ${literal(u)}`,
      ),
      "2",
      "Q-10: a declaração anterior continua gravada",
    );
  });

  it("a leitura usa a ordenação canônica e traz uma linha só", () => {
    const fonte = codigo(LEITURA);
    assert.match(fonte, /\.order\("recorded_at", \{ ascending: false \}\)/);
    assert.match(fonte, /\.order\("id", \{ ascending: false \}\)/);
    assert.match(fonte, /\.limit\(1\)/, "Q-01: uma consulta, uma linha");
  });

  it("objetivo sem texto livre não quebra a tela", () => {
    const u = criarUsuarioComAceite();
    declararObjetivo(u, {
      tipo: "ainda não decidido",
      objetivo: null,
      motivacao: null,
    });
    assert.equal(objetivoCorrente(u), "ainda não decidido|(nulo)|(nulo)");
    const fonte = codigo(PAGINA);
    assert.match(fonte, /objetivo\.goalDeclaration \?/, "trata declaração nula");
    assert.match(
      fonte,
      /objetivo\.motivationDeclaration &&/,
      "seção de motivação some quando não há motivação",
    );
  });

  it("Q-02: o tipo aparece como a pessoa escolheu, sem tradução", () => {
    const fonte = codigo(PAGINA);
    assert.match(fonte, /\{objetivo\.goalType\}/);
    // Nenhum mapa de rótulos: traduzir "reduzir" em outra palavra seria
    // reinterpretar a declaração.
    assert.doesNotMatch(fonte, /interromper|reduzir|ainda não decidido/);
  });
});

describe("PLANO · isolamento entre identidades", () => {
  it("A não enxerga o objetivo de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    declararObjetivo(b, { tipo: "reduzir", objetivo: "só de B", motivacao: null });

    assert.equal(
      escreverComoUsuario(a, "select count(*) from public.recovery_goals"),
      "0",
    );
    assert.equal(
      escreverComoUsuario(b, "select count(*) from public.recovery_goals"),
      "1",
    );
  });

  it("a leitura não filtra por user_id no código — é a RLS que protege", () => {
    const fonte = codigo(LEITURA);
    assert.match(fonte, /\.from\("recovery_goals"\)/);
    assert.doesNotMatch(fonte, /\.eq\("user_id"/);
  });

  it("sessão expirada: a rota inteira exige aceite", () => {
    assert.match(
      codigo("src/app/(ambiente)/layout.tsx"),
      /await exigirAceite\(\)/,
      "o layout do grupo guarda /plano",
    );
    const erro = falha(() =>
      sql(
        `begin; set local role authenticated;
         insert into public.recovery_goals (user_id, goal_type, information_nature)
         values (gen_random_uuid(), 'reduzir', 'declarado');
         rollback;`,
      ),
    );
    assert.ok(erro, "sem identidade, a escrita é recusada");
  });
});

describe("PLANO · ausência de conteúdo fictício", () => {
  it("nada de plano de ação, enfrentamento, estratégias ou revisão", () => {
    // Op. §8 lista seis componentes; quatro não têm entidade (§11.3). A tela
    // não pode nomeá-los como se existissem, nem prometê-los.
    const fonte = codigo(PAGINA);
    for (const termo of [
      "plano de ação", "plano de acao", "enfrentamento",
      "estratégia", "estrategia", "revisão", "revisao",
      "em breve", "em desenvolvimento", "próximos passos",
    ]) {
      assert.ok(
        !fonte.toLowerCase().includes(termo),
        `a tela promete "${termo}", que não tem entidade`,
      );
    }
  });

  it("nenhuma métrica: sem progresso, sem placar, sem sequência", () => {
    const fonte = (codigo(PAGINA) + codigo(LEITURA)).toLowerCase();
    // Palavra inteira, não substring: "meta" solto é métrica, mas `metadata`
    // é a API do Next. Um teste que confunde as duas obriga a contorná-lo,
    // e teste que se contorna deixa de proteger.
    const proibidos = [
      /\bprogresso\b/, /\bporcentagem\b/, /\bpercent/, /%/, /\bstreak\b/,
      /\bsequência\b/, /\bsequencia\b/, /\bpontuaç[ãa]o\b/, /\branking\b/,
      /\bmeta\b/, /\bmetas\b/, /\betapa\b/, /\bdias sem\b/,
      /\brecaída\b/, /\brecaida\b/, /\babstinência\b/, /\babstinencia\b/,
    ];
    for (const padrao of proibidos) {
      assert.doesNotMatch(fonte, padrao, `métrica indevida: ${padrao}`);
    }
  });

  it("Q-07: o Plano não LÊ commitments", () => {
    // O que Q-07 proíbe é tratar compromisso como plano — ou seja, ler a
    // tabela aqui. Citar a palavra ao apontar o caminho para Hoje é
    // navegação, não modelagem, e o teste não pode confundir as duas.
    for (const arquivo of [PAGINA, LEITURA]) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(fonte, /\.from\("commitments"\)/, arquivo);
      assert.doesNotMatch(
        fonte,
        /carregarCompromissoAtivo|carregarHistoricoDeCompromissos|reconstruirCadeias/,
        arquivo,
      );
      assert.doesNotMatch(
        fonte,
        /from "@\/lib\/ambiente\/(compromissos|cadeia)"/,
        `${arquivo} importa a leitura de compromissos`,
      );
    }
  });

  it("o Plano não escreve: nenhuma ação, nenhuma mutação", () => {
    for (const arquivo of [PAGINA, LEITURA]) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(fonte, /"use server"/);
      assert.doesNotMatch(fonte, /\.(insert|update|delete|upsert|rpc)\(/);
    }
  });

  it("nenhuma entidade nova: `recovery_plans` continua não existindo", () => {
    assert.equal(
      sql(
        `select string_agg(tablename, ',' order by tablename)
         from pg_tables where schemaname = 'public'`,
      ),
      TABELAS_AUTORIZADAS,
      "§11.3: planos seguem fora do núcleo mínimo",
    );
  });

  it("uma consulta por leitura", () => {
    const fonte = codigo(LEITURA);
    assert.equal(
      [...fonte.matchAll(/\.from\(/g)].length,
      1,
      "uma consulta basta para o objetivo corrente",
    );
  });
});
