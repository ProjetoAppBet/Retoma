/**
 * Testes da TRAJETÓRIA.
 *
 * Três níveis:
 *
 * 1. RECONSTRUÇÃO — `reconstruirCadeias` importada de verdade e exercitada
 *    com cadeias montadas à mão. É a parte que pode errar em silêncio:
 *    duplicar um compromisso, perder uma correção, embaralhar a ordem.
 *
 * 2. BANCO — cadeias construídas pelas mesmas funções transacionais que o
 *    produto usa, lidas com o papel `authenticated` e as claims reais. É
 *    onde o isolamento entre identidades é provado.
 *
 * 3. CAMINHO DA APLICAÇÃO — a tela e o módulo de leitura não inventam dado,
 *    não escrevem, e não afirmam aposta.
 *
 * Normativo: §7.3 (isolamento), §18.1 (Q-11 e a proibição de afirmar
 * aposta), §18.2, §19.4, Q-10, Q-14, L-04.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import { reconstruirCadeias } from "../src/lib/ambiente/cadeia.ts";

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

const PAGINA = "src/app/(ambiente)/trajetoria/page.tsx";
const LEITURA = "src/lib/ambiente/compromissos.ts";
const CADEIA = "src/lib/ambiente/cadeia.ts";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** Monta uma linha crua; só o que for passado difere do padrão. */
function linha(campos) {
  return {
    id: campos.id,
    commitment_declaration: campos.declaracao ?? null,
    due_at: campos.dueAt ?? null,
    outcome: campos.outcome ?? null,
    recorded_at: campos.em,
    supersedes_id: campos.supera ?? null,
  };
}

/** Ordena como a consulta ordena (L-04) — a função conta com isso. */
function canonica(linhas) {
  return [...linhas].sort((a, b) =>
    a.recorded_at === b.recorded_at
      ? b.id.localeCompare(a.id)
      : b.recorded_at.localeCompare(a.recorded_at),
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("TRAJETÓRIA · reconstrução da cadeia", () => {
  it("1 · sem histórico devolve lista vazia", () => {
    assert.deepEqual(reconstruirCadeias([]), []);
  });

  it("2 · uma declaração vira uma cadeia em aberto", () => {
    const c = reconstruirCadeias([
      linha({ id: "a", declaracao: "não abrir o app", em: "2026-08-01T10:00:00Z" }),
    ]);
    assert.equal(c.length, 1);
    assert.deepEqual(c[0], {
      id: "a",
      declaracao: "não abrir o app",
      declaradoEm: "2026-08-01T10:00:00Z",
      dueAt: null,
      outcome: null,
      respondidoEm: null,
      correcoes: 0,
      versoes: 1,
    });
  });

  it("3 · declaração + Cumpri é UMA cadeia, não duas", () => {
    const c = reconstruirCadeias(
      canonica([
        linha({ id: "a", declaracao: "dormir cedo", em: "2026-08-01T10:00:00Z" }),
        linha({ id: "b", outcome: "cumprido", supera: "a", em: "2026-08-02T09:00:00Z" }),
      ]),
    );
    assert.equal(c.length, 1, "duas linhas, um compromisso");
    assert.equal(c[0].id, "a", "a cadeia é identificada pela raiz");
    assert.equal(c[0].declaracao, "dormir cedo", "§19.4: a declaração fica na raiz");
    assert.equal(c[0].outcome, "cumprido");
    assert.equal(c[0].respondidoEm, "2026-08-02T09:00:00Z");
    assert.equal(c[0].declaradoEm, "2026-08-01T10:00:00Z");
    assert.equal(c[0].versoes, 2);
    assert.equal(c[0].correcoes, 0, "resultado não é correção");
  });

  it("4 · declaração + Não cumpri", () => {
    const c = reconstruirCadeias(
      canonica([
        linha({ id: "a", declaracao: "não apostar", em: "2026-08-01T10:00:00Z" }),
        linha({ id: "b", outcome: "não_cumprido", supera: "a", em: "2026-08-02T09:00:00Z" }),
      ]),
    );
    assert.equal(c.length, 1);
    assert.equal(c[0].outcome, "não_cumprido");
  });

  it("5 · correção mantém uma cadeia e mostra a declaração corrente", () => {
    const c = reconstruirCadeias(
      canonica([
        linha({ id: "a", declaracao: "primeira versão", em: "2026-08-01T10:00:00Z" }),
        linha({ id: "b", declaracao: "versão corrigida", supera: "a", em: "2026-08-01T11:00:00Z" }),
      ]),
    );
    assert.equal(c.length, 1, "corrigir não cria compromisso novo");
    assert.equal(c[0].declaracao, "versão corrigida");
    assert.equal(c[0].declaradoEm, "2026-08-01T10:00:00Z", "a promessa começou na raiz");
    assert.equal(c[0].correcoes, 1);
    assert.equal(c[0].outcome, null);
  });

  it("6 · novo compromisso depois do resultado é OUTRA cadeia", () => {
    const c = reconstruirCadeias(
      canonica([
        linha({ id: "a", declaracao: "primeiro", em: "2026-08-01T10:00:00Z" }),
        linha({ id: "b", outcome: "cumprido", supera: "a", em: "2026-08-02T09:00:00Z" }),
        linha({ id: "c", declaracao: "segundo", em: "2026-08-03T08:00:00Z" }),
      ]),
    );
    assert.equal(c.length, 2);
    assert.deepEqual(
      c.map((x) => [x.declaracao, x.outcome]),
      [
        ["segundo", null],
        ["primeiro", "cumprido"],
      ],
      "mais recente primeiro",
    );
  });

  it("7 · múltiplas versões: duas correções e um resultado", () => {
    const c = reconstruirCadeias(
      canonica([
        linha({ id: "a", declaracao: "v1", dueAt: "2026-08-02T10:00:00Z", em: "2026-08-01T10:00:00Z" }),
        linha({ id: "b", declaracao: "v2", supera: "a", em: "2026-08-01T11:00:00Z" }),
        linha({ id: "c", declaracao: "v3", supera: "b", em: "2026-08-01T12:00:00Z" }),
        linha({ id: "d", outcome: "cumprido", supera: "c", em: "2026-08-02T09:00:00Z" }),
      ]),
    );
    assert.equal(c.length, 1, "quatro linhas, um compromisso");
    assert.equal(c[0].declaracao, "v3");
    assert.equal(c[0].correcoes, 2);
    assert.equal(c[0].versoes, 4);
    assert.equal(c[0].outcome, "cumprido");
    assert.equal(c[0].dueAt, "2026-08-02T10:00:00Z", "o prazo da raiz é preservado");
  });

  it("8 · a ordem é a da consulta — a reconstrução não reordena", () => {
    // L-04 vive na cláusula ORDER BY da consulta, não aqui. O que precisa
    // ser verdade nesta função é que ela PRESERVE a ordem recebida: se ela
    // reordenasse por conta própria, o desempate por id da consulta seria
    // descartado em silêncio e a lista mudaria de ordem entre carregamentos.
    const mesmoInstante = "2026-08-01T10:00:00Z";
    const a = linha({ id: "aaa", declaracao: "A", em: mesmoInstante });
    const z = linha({ id: "zzz", declaracao: "Z", em: mesmoInstante });

    assert.deepEqual(
      reconstruirCadeias([z, a]).map((x) => x.declaracao),
      ["Z", "A"],
    );
    assert.deepEqual(
      reconstruirCadeias([a, z]).map((x) => x.declaracao),
      ["A", "Z"],
      "invertida a entrada, inverte a saída — nenhuma ordenação própria",
    );

    // E a ordenação canônica de fato entrega Z antes de A no empate.
    assert.deepEqual(
      canonica([a, z]).map((l) => l.id),
      ["zzz", "aaa"],
      "recorded_at desc, id desc",
    );
  });

  it("nenhuma linha é escondida, nem a órfã", () => {
    const c = reconstruirCadeias([
      linha({ id: "b", declaracao: "órfã", supera: "sumiu", em: "2026-08-01T10:00:00Z" }),
    ]);
    assert.equal(c.length, 1, "linha real da pessoa não desaparece da tela");
    assert.equal(c[0].declaracao, "órfã");
  });

  it("ciclo em dado corrompido não trava a renderização", () => {
    const c = reconstruirCadeias([
      linha({ id: "a", declaracao: "A", supera: "b", em: "2026-08-01T11:00:00Z" }),
      linha({ id: "b", declaracao: "B", supera: "a", em: "2026-08-01T10:00:00Z" }),
    ]);
    assert.ok(Array.isArray(c), "termina");
  });

  it("a soma das versões bate com o total de linhas — nada duplicado", () => {
    const linhas = canonica([
      linha({ id: "a", declaracao: "p", em: "2026-08-01T10:00:00Z" }),
      linha({ id: "b", declaracao: "p2", supera: "a", em: "2026-08-01T11:00:00Z" }),
      linha({ id: "c", outcome: "cumprido", supera: "b", em: "2026-08-02T09:00:00Z" }),
      linha({ id: "d", declaracao: "q", em: "2026-08-03T10:00:00Z" }),
      linha({ id: "e", outcome: "não_cumprido", supera: "d", em: "2026-08-04T10:00:00Z" }),
    ]);
    const c = reconstruirCadeias(linhas);
    assert.equal(
      c.reduce((s, x) => s + x.versoes, 0),
      linhas.length,
      "toda linha pertence a exatamente uma cadeia",
    );
    assert.equal(c.length, 2);
  });
});

describe("TRAJETÓRIA · contra o banco real", () => {
  const AMANHA = "now() + interval '24 hours'";

  function declarar(u, texto, prazo = "null") {
    return escreverComoUsuario(
      u,
      `select id from public.declarar_compromisso(${literal(texto)}, ${prazo})`,
    );
  }
  function responder(u, id, outcome) {
    return escreverComoUsuario(
      u,
      `select id from public.registrar_resultado_do_compromisso(
         ${literal(id)}, ${literal(outcome)})`,
    );
  }

  /** O que a consulta da página devolveria para este usuário. */
  function linhasDe(userId) {
    const bruto = sql(
      `select json_agg(t order by t.recorded_at desc, t.id desc)::text
       from (
         select id, commitment_declaration, due_at, outcome, recorded_at, supersedes_id
         from public.commitments where user_id = ${literal(userId)}
       ) t`,
    );
    return bruto === "" || bruto === "null" ? [] : JSON.parse(bruto);
  }

  it("cadeia real de ponta a ponta é agrupada corretamente", () => {
    const u = criarUsuarioComAceite();
    const id1 = declarar(u, "primeiro", AMANHA);
    responder(u, id1, "cumprido");
    declarar(u, "segundo");

    const cadeias = reconstruirCadeias(linhasDe(u));
    assert.equal(cadeias.length, 2, "3 linhas, 2 compromissos");
    assert.deepEqual(
      cadeias.map((c) => [c.declaracao, c.outcome]),
      [
        ["segundo", null],
        ["primeiro", "cumprido"],
      ],
    );
    assert.ok(cadeias[1].dueAt, "o prazo gravado é preservado");
    assert.equal(cadeias[0].dueAt, null, "o do Hoje nasce sem prazo (P-31)");
  });

  it("correção real é contada, e a declaração anterior não some", () => {
    const u = criarUsuarioComAceite();
    const raiz = declarar(u, "versão original");
    // Correção por supersessão, direto no banco: a aplicação ainda não expõe
    // esse caminho, mas o schema o permite e a Trajetória precisa saber lê-lo.
    sql(
      `insert into public.commitments
         (user_id, commitment_declaration, information_nature, supersedes_id)
       values (${literal(u)}, 'versão corrigida', 'declarado', ${literal(raiz)})`,
    );

    const cadeias = reconstruirCadeias(linhasDe(u));
    assert.equal(cadeias.length, 1);
    assert.equal(cadeias[0].declaracao, "versão corrigida");
    assert.equal(cadeias[0].correcoes, 1);
    assert.equal(
      sql(
        `select count(*) from public.commitments
         where user_id = ${literal(u)} and commitment_declaration is not null`,
      ),
      "2",
      "Q-10: a declaração anterior continua gravada",
    );
  });

  it("9 · isolamento — a leitura de A não alcança B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    declarar(b, "compromisso de B");

    // A consulta da página não filtra por user_id: quem filtra é a RLS.
    assert.equal(
      escreverComoUsuario(
        a,
        "select count(*) from public.commitments",
      ),
      "0",
    );
    assert.equal(reconstruirCadeias(linhasDe(a)).length, 0);
    assert.equal(reconstruirCadeias(linhasDe(b)).length, 1);
  });

  it("9b · a leitura não filtra por user_id no código — é a RLS que protege", () => {
    const fonte = codigo(LEITURA);
    assert.match(fonte, /\.from\("commitments"\)/);
    assert.doesNotMatch(
      fonte,
      /\.eq\("user_id"/,
      "filtrar no cliente daria a impressão de que a RLS é dispensável",
    );
  });

  it("10 · sessão expirada: a rota inteira exige aceite", () => {
    assert.match(
      codigo("src/app/(ambiente)/layout.tsx"),
      /await exigirAceite\(\)/,
      "o layout do grupo guarda /trajetoria",
    );
    // E sem identidade na sessão o banco também recusa a escrita.
    const erro = falha(() =>
      sql(
        "begin; set local role authenticated; select public.declarar_compromisso('x', null); rollback;",
      ),
    );
    assert.match(erro, /sem identidade autenticada/);
  });

  it("11 · erro de consulta vira estado próprio, não histórico vazio", () => {
    const fonte = codigo(LEITURA);
    assert.match(fonte, /if \(error\) return \{ cadeias: \[\], erro: true \}/);
    const pagina = codigo(PAGINA);
    assert.match(pagina, /historico\.erro \?/, "a tela distingue erro de vazio");
    assert.match(pagina, /historico\.cadeias\.length === 0 \?/);
  });
});

describe("TRAJETÓRIA · o que a tela NÃO afirma", () => {
  it("12 · nenhum dado de 'com-aposta' é produzido ou anunciado", () => {
    for (const arquivo of [PAGINA, LEITURA, CADEIA, "src/lib/ambiente/dias.ts"]) {
      assert.doesNotMatch(
        codigo(arquivo),
        /com-aposta|com aposta/,
        `${arquivo} menciona aposta sem fonte (§18.1.3)`,
      );
    }
  });

  it("não traduz o resultado em linguagem clínica", () => {
    const proibidos = [
      "recaída", "recaida", "abstinência", "abstinencia", "sobriedade",
      "progresso", "evolução", "evolucao", "diagnóstico", "diagnostico",
      "sucesso", "fracasso", "falhou", "streak", "sequência",
    ];
    const fonte = codigo(PAGINA);
    for (const termo of proibidos) {
      assert.ok(
        !fonte.toLowerCase().includes(termo),
        `a Trajetória não pode dizer "${termo}"`,
      );
    }
    // Os rótulos são os mesmos verbos dos botões do Hoje.
    assert.match(fonte, /"Cumpri"/);
    assert.match(fonte, /"Não cumpri"/);
    assert.match(fonte, /"Em aberto"/);
  });

  it("não calcula média, tendência nem comparação entre períodos", () => {
    const fonte = codigo(PAGINA) + codigo(LEITURA) + codigo(CADEIA);
    for (const termo of ["média", "media(", "percent", "%", "taxa", "tendência"]) {
      assert.ok(!fonte.includes(termo), `cálculo indevido: ${termo}`);
    }
  });

  it("a Trajetória não escreve: nenhuma ação, nenhuma mutação", () => {
    for (const arquivo of [PAGINA, LEITURA, CADEIA]) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(fonte, /"use server"/, `${arquivo} virou ação`);
      assert.doesNotMatch(
        fonte,
        /\.(insert|update|delete|upsert|rpc)\(/,
        `${arquivo} escreve`,
      );
    }
  });

  it("uma consulta por leitura, não uma por cadeia", () => {
    const fonte = codigo(LEITURA);
    const consultas = [...fonte.matchAll(/\.from\("commitments"\)/g)];
    assert.equal(consultas.length, 2, "uma no ativo, uma no histórico");
    assert.doesNotMatch(fonte, /for\s*\([\s\S]{0,200}await /, "sem consulta em laço");
  });

  it("nenhuma entidade nova: o núcleo mínimo continua com 5 tabelas", () => {
    assert.equal(
      sql(
        `select string_agg(tablename, ',' order by tablename)
         from pg_tables where schemaname = 'public'`,
      ),
      TABELAS_AUTORIZADAS,
    );
  });
});
