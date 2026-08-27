/**
 * Testes de fundação — as garantias estruturais que não pertencem a uma fase
 * de produto, mas sem as quais nenhuma fase seguinte é segura.
 *
 * Cobre:
 *   R5   · a cadeia de supersessão não atravessa identidades
 *   §7.3 · nenhuma ação de servidor escreve sem porta de autenticação
 *   §4.3 · C-CONTA não é gravado para identidade sem C-PRINCIPAL
 *   Q-10 · o onboarding não grava a mesma declaração duas vezes
 *   App Router · fronteiras de erro, 404 e carregamento existem
 *   §12.8 · nenhuma variável de ambiente é lida sem verificação
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  criarUsuarioComAceite,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  RAIZ,
} from "./support/local-db.mjs";

/** Remove comentários antes de procurar código — comentário não é chamada. */
function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

const ACOES = [
  "src/app/aceite/acoes.ts",
  "src/app/conta/acoes.ts",
  "src/app/onboarding/acoes.ts",
  "src/app/(ambiente)/hoje/acoes.ts",
];

/**
 * As únicas ações que não podem exigir aceite, e por quê:
 *
 * `aceitar` é o ato que CRIA a identidade e o aceite (§5.1) — exigir aceite
 * antes dela seria circular. `recusar` é o caminho de §5.2, que existe
 * justamente para quem não aceitou. `sair` é §17.5 (P-13): encerrar sessão
 * precisa funcionar mesmo para identidade sem aceite corrente — o contrário
 * prenderia a pessoa numa sessão da qual ela não consegue sair.
 *
 * A isenção não é gratuita: o teste abaixo exige que nenhuma delas escreva
 * em tabela de dados do usuário por acesso direto.
 */
const SEM_PORTA_DE_ACEITE = new Set(["aceitar", "recusar", "sair"]);

const TABELAS_DE_DADOS =
  "commitments|recovery_goals|gambling_history|consent_records|profiles";

before(() => recriarBanco());
after(() => pararSeRodando());

describe("R5 · a cadeia de supersessão não atravessa identidades", () => {
  const CADEIAS = [
    ["commitments", "supersedes_id"],
    ["recovery_goals", "supersedes_id"],
    ["gambling_history", "supersedes_id"],
    ["consent_records", "previous_consent_id"],
  ];

  /** Colunas obrigatórias mínimas de cada tabela, além de user_id. */
  const MINIMO = {
    commitments: "information_nature",
    recovery_goals: "goal_type, information_nature",
    gambling_history:
      "information_nature, frequency_response_state, amount_response_state",
    consent_records: "consent_type, state, document_version_id",
  };
  const VALORES = {
    commitments: "'declarado'",
    recovery_goals: "'interromper', 'declarado'",
    gambling_history: "'declarado', 'informado', 'informado'",
    consent_records: "'C-APOIO', 'concedido', 'teste-v0'",
  };

  function inserirRaiz(tabela, userId) {
    const id = sql("select gen_random_uuid()");
    sql(
      `insert into public.${tabela} (id, user_id, ${MINIMO[tabela]})
       values (${literal(id)}, ${literal(userId)}, ${VALORES[tabela]})`,
    );
    return id;
  }

  for (const [tabela, coluna] of CADEIAS) {
    it(`${tabela}: a chave estrangeira de ${coluna} é composta com user_id`, () => {
      const definicao = sql(
        `select pg_get_constraintdef(oid) from pg_constraint
         where conrelid = 'public.${tabela}'::regclass and contype = 'f'
           and conname like '%${coluna}%'`,
      );
      assert.match(definicao, /FOREIGN KEY \(user_id, /);
      assert.match(definicao, /REFERENCES \w+\(user_id, id\)/);
    });

    it(`${tabela}: superar linha de OUTRA identidade é rejeitado`, () => {
      const a = criarUsuarioComAceite();
      const b = criarUsuarioComAceite();
      const raizDeB = inserirRaiz(tabela, b);

      const erro = falha(() =>
        sql(
          `insert into public.${tabela} (user_id, ${MINIMO[tabela]}, ${coluna})
           values (${literal(a)}, ${VALORES[tabela]}, ${literal(raizDeB)})`,
        ),
      );
      assert.ok(erro, `${tabela} aceitou cadeia entre contas`);
      assert.match(erro, /violates foreign key constraint/i);
    });

    it(`${tabela}: superar linha PRÓPRIA continua funcionando`, () => {
      const u = criarUsuarioComAceite();
      const raiz = inserirRaiz(tabela, u);

      sql(
        `insert into public.${tabela} (user_id, ${MINIMO[tabela]}, ${coluna})
         values (${literal(u)}, ${VALORES[tabela]}, ${literal(raiz)})`,
      );
      assert.equal(
        sql(
          `select count(*) from public.${tabela}
           where user_id = ${literal(u)} and ${coluna} = ${literal(raiz)}`,
        ),
        "1",
      );
    });

    it(`${tabela}: raiz (${coluna} nulo) continua livre`, () => {
      const u = criarUsuarioComAceite();
      const antes = Number(
        sql(
          `select count(*) from public.${tabela}
           where user_id = ${literal(u)} and ${coluna} is null`,
        ),
      );
      inserirRaiz(tabela, u);
      inserirRaiz(tabela, u);
      assert.equal(
        Number(
          sql(
            `select count(*) from public.${tabela}
             where user_id = ${literal(u)} and ${coluna} is null`,
          ),
        ),
        antes + 2,
        "MATCH SIMPLE: par com nulo satisfaz a chave composta",
      );
    });
  }
});

describe("§7.3 · toda ação de servidor tem porta de autenticação", () => {
  for (const arquivo of ACOES) {
    it(`${arquivo}: nenhuma ação escreve sem passar por exigirAceite`, () => {
      const fonte = codigo(arquivo);
      assert.match(fonte, /^"use server";/, "precisa ser módulo de servidor");

      // Fatia o arquivo por função exportada e olha cada corpo isolado.
      const marcas = [...fonte.matchAll(/export async function (\w+)/g)];
      assert.ok(marcas.length > 0, "nenhuma ação encontrada");

      for (let i = 0; i < marcas.length; i++) {
        const nome = marcas[i][1];
        const corpo = fonte.slice(
          marcas[i].index,
          i + 1 < marcas.length ? marcas[i + 1].index : undefined,
        );
        if (SEM_PORTA_DE_ACEITE.has(nome)) {
          // Isenta da porta, mas não de escrever: nenhuma delas pode tocar
          // tabela de dados do usuário por acesso direto. `aceitar` grava o
          // aceite pela função atômica de §17.1, nunca por `.from(...)`.
          assert.doesNotMatch(
            corpo,
            new RegExp(`\\.from\\(["'](${TABELAS_DE_DADOS})["']\\)`),
            `${nome} não pode escrever tabela de dados sem porta de aceite`,
          );
          continue;
        }
        assert.match(
          corpo,
          /await exigirAceite\(\)/,
          `${nome} escreve sem porta de aceite`,
        );
      }
    });
  }

  it("§4.3 · converterParaConta não grava C-CONTA sem aceite principal", () => {
    const fonte = codigo("src/app/conta/acoes.ts");
    const inicio = fonte.indexOf("export async function converterParaConta");
    const corpo = fonte.slice(inicio);
    const porta = corpo.indexOf("await exigirAceite()");
    const gravacao = corpo.indexOf('.from("consent_records")');
    assert.ok(porta > -1, "a ação precisa exigir aceite");
    assert.ok(gravacao > -1, "a ação grava C-CONTA");
    assert.ok(porta < gravacao, "a porta precisa vir ANTES da gravação");
  });

  it("toda rota com dado do usuário passa por exigirAceite", () => {
    // (ambiente) é coberto pelo layout do grupo; as demais, cada uma na sua.
    const guardadas = [
      "src/app/(ambiente)/layout.tsx",
      "src/app/conversa/page.tsx",
      "src/app/conta/page.tsx",
      "src/app/onboarding/page.tsx",
    ];
    for (const rota of guardadas) {
      assert.match(
        codigo(rota),
        /await exigirAceite\(\)/,
        `${rota} sem porta de aceite`,
      );
    }
  });
});

describe("Q-10 · o onboarding não duplica declaração", () => {
  it("as duas entidades escritas por insert têm guarda de raiz", () => {
    const fonte = codigo("src/app/onboarding/acoes.ts");
    for (const tabela of ["gambling_history", "recovery_goals"]) {
      assert.match(
        fonte,
        new RegExp(`jaDeclarou\\(supabase, "${tabela}"\\)`),
        `${tabela} sem guarda de declaração repetida`,
      );
    }
    // A guarda precisa olhar a RAIZ, não qualquer linha: uma correção
    // legítima tem supersedes_id e não pode ser confundida com repetição.
    assert.match(fonte, /\.is\("supersedes_id", null\)/);
  });

  it("`commitments` não precisa de guarda: Q-12 já a impõe no banco", () => {
    const fonte = codigo("src/app/onboarding/acoes.ts");
    const inicio = fonte.indexOf("export async function gravarCompromisso");
    assert.match(fonte.slice(inicio), /\.rpc\("declarar_compromisso"/);
  });

  it("identidade que já concluiu não é re-onboardada", () => {
    const fonte = codigo("src/app/onboarding/page.tsx");
    assert.match(fonte, /redirect\("\/hoje"\)/);
    for (const t of ["gambling_history", "recovery_goals", "commitments"]) {
      assert.match(fonte, new RegExp(`from\\("${t}"\\)`));
    }
  });
});

describe("App Router · fronteiras que faltavam", () => {
  const OBRIGATORIOS = [
    ["src/app/error.tsx", /"use client"/],
    ["src/app/global-error.tsx", /<html/],
    ["src/app/not-found.tsx", /href="\/"/],
    ["src/app/(ambiente)/loading.tsx", /aria-busy/],
  ];

  for (const [arquivo, marca] of OBRIGATORIOS) {
    it(`${arquivo} existe e tem o essencial`, () => {
      const fonte = readFileSync(`${RAIZ}/${arquivo}`, "utf8");
      assert.match(fonte, marca);
    });
  }

  it("a tela de erro não expõe a mensagem da exceção", () => {
    const fonte = codigo("src/app/error.tsx");
    assert.doesNotMatch(
      fonte,
      /\{\s*error\.(message|stack|digest)\s*\}/,
      "detalhe técnico não vai para a tela",
    );
  });

  it("global-error não depende de token de tema", () => {
    // Se o CSS global falhou, a variável não existe — as cores precisam ser
    // literais. Ardósia e Cal, os mesmos valores de tokens.css.
    const fonte = readFileSync(`${RAIZ}/src/app/global-error.tsx`, "utf8");
    assert.match(fonte, /#0f1719/);
    assert.match(fonte, /#e9e7e2/);
    assert.doesNotMatch(fonte, /var\(--color-/);
  });
});

describe("§12.8 · variáveis de ambiente", () => {
  it("nenhum arquivo lê NEXT_PUBLIC_* com asserção de não-nulo", () => {
    for (const arquivo of [
      "src/lib/supabase/server.ts",
      "src/lib/supabase/client.ts",
      "src/proxy.ts",
    ]) {
      assert.doesNotMatch(
        codigo(arquivo),
        /process\.env\.NEXT_PUBLIC_\w+!/,
        `${arquivo} ainda usa \`!\` em variável de ambiente`,
      );
    }
  });

  it("a falta de variável vira erro nomeado, não `undefined`", () => {
    const fonte = codigo("src/lib/supabase/ambiente.ts");
    assert.match(fonte, /throw new Error/);
    assert.match(fonte, /NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(fonte, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("nenhum segredo versionado: o exemplo declara nomes, nunca valores", () => {
    const exemplo = readFileSync(`${RAIZ}/.env.example`, "utf8");
    const linhas = [...exemplo.matchAll(/^([A-Z_][A-Z_0-9]*)=(.*)$/gm)];

    assert.deepEqual(
      linhas.map((m) => m[1]),
      [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "OPENAI_API_KEY",
      ],
      "acrescentar variável aqui é o momento de decidir se ela é pública",
    );

    // O que importa não é o conjunto de nomes — é que nenhum traga valor, e
    // que o que NÃO for público seja segredo de servidor (§12.8). A higiene
    // completa do segredo de IA está em tests/segredos.test.mjs.
    for (const [, nome, valor] of linhas) {
      assert.equal(valor, "", `${nome} tem valor num arquivo versionado`);
    }
    assert.match(exemplo, /SEGREDO DE SERVIDOR/);
  });

  it("nada no cliente usa service role", () => {
    const suspeitos = [
      "SERVICE_ROLE",
      "service_role",
      "SUPABASE_SERVICE",
      "createAdminClient",
    ];
    for (const arquivo of [
      "src/lib/supabase/server.ts",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/ambiente.ts",
      "src/proxy.ts",
      ...ACOES,
    ]) {
      for (const termo of suspeitos) {
        assert.ok(
          !codigo(arquivo).includes(termo),
          `${arquivo} menciona ${termo} (§14.3.19)`,
        );
      }
    }
  });
});
