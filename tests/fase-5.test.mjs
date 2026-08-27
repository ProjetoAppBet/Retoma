/**
 * Testes da Fase 5 — P-30: imposição de Q-12 (compromisso ativo único).
 *
 * Normativo exercitado: §18.1 (Q-11), §18.2 (Q-12), §18.3 (Q-13), §18.4.2
 * (Q-14), §18.5 (P-29), §19 (E-06 — Modelo A / variante A3).
 *
 * O que estes testes existem para impedir:
 *
 * 1. Que a garantia de Q-12 seja aparente. O CASO 7 roda duas transações
 *    SIMULTÂNEAS. Sem a trava por usuário, ambas leem "nenhum ativo" e ambas
 *    inserem — e todo o resto da suíte continua verde. É o único caso que
 *    distingue garantia de coincidência.
 * 2. Que `insert` direto volte a existir como caminho de escrita (CASO 13).
 * 3. Que a identidade passe a vir do cliente (CASO 14).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  RAIZ,
  TABELAS_AUTORIZADAS,
  criarUsuarioComAceite,
  emParalelo,
  escreverComoUsuario,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  transacaoDoUsuario,
} from "./support/local-db.mjs";

const AMANHA = "now() + interval '24 hours'";

/** Declara um compromisso como o próprio usuário e devolve o id criado. */
function declarar(userId, texto, prazo = AMANHA) {
  return escreverComoUsuario(
    userId,
    `select id from public.declarar_compromisso(${literal(texto)}, ${prazo})`,
  );
}

/** Registra o resultado como o próprio usuário e devolve o id da nova linha. */
function responder(userId, commitmentId, outcome) {
  return escreverComoUsuario(
    userId,
    `select id from public.registrar_resultado_do_compromisso(
       ${literal(commitmentId)}, ${literal(outcome)})`,
  );
}

/** §18.2 — do usuário, outcome nulo, e não superado por outra versão. */
function ativos(userId) {
  return Number(
    sql(
      `select count(*) from public.commitments c
       where c.user_id = ${literal(userId)}
         and c.outcome is null
         and not exists (
           select 1 from public.commitments s where s.supersedes_id = c.id
         )`,
    ),
  );
}

function linhas(userId) {
  return Number(
    sql(
      `select count(*) from public.commitments where user_id = ${literal(userId)}`,
    ),
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("CASO 1 · criar o primeiro compromisso", () => {
  it("cria a linha, com outcome nulo e sem supersedes_id", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "não abrir o app hoje");

    assert.match(id, /^[0-9a-f-]{36}$/, "a função devolve o registro criado");
    assert.equal(ativos(u), 1);
    assert.equal(
      sql(
        `select coalesce(outcome, '(nulo)') || '|' ||
                coalesce(supersedes_id::text, '(nulo)') || '|' ||
                information_nature
         from public.commitments where id = ${literal(id)}`,
      ),
      "(nulo)|(nulo)|declarado",
    );
  });
});

describe("CASO 2 · segundo compromisso com o primeiro ativo", () => {
  it("é recusado, e nada é gravado", () => {
    const u = criarUsuarioComAceite();
    declarar(u, "primeiro");

    const erro = falha(() => declarar(u, "segundo"));
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /ja existe um compromisso ativo/);
    assert.equal(linhas(u), 1, "a recusa não pode deixar linha para trás");
  });
});

describe("CASO 3 · responder Cumpri", () => {
  it("cria nova versão append-only e zera o ativo", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "conversar com alguém");
    const idResultado = responder(u, id, "cumprido");

    assert.notEqual(idResultado, id, "resultado é linha NOVA, não UPDATE");
    assert.equal(linhas(u), 2);
    assert.equal(ativos(u), 0, "respondido deixa de ser ativo");

    // §19.4: a linha de resultado não repete declaração nem prazo.
    assert.equal(
      sql(
        `select outcome || '|' ||
                coalesce(commitment_declaration, '(nulo)') || '|' ||
                coalesce(due_at::text, '(nulo)') || '|' ||
                (supersedes_id = ${literal(id)})::text
         from public.commitments where id = ${literal(idResultado)}`,
      ),
      "cumprido|(nulo)|(nulo)|true",
    );

    // A versão anterior permanece intacta — nada é sobrescrito (Q-10).
    assert.equal(
      sql(
        `select commitment_declaration from public.commitments
         where id = ${literal(id)}`,
      ),
      "conversar com alguém",
    );
  });
});

describe("CASO 4 · responder Não cumpri", () => {
  it("cria nova versão com o mesmo mecanismo", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "não apostar hoje");
    const idResultado = responder(u, id, "não_cumprido");

    assert.equal(
      sql(
        `select outcome from public.commitments where id = ${literal(idResultado)}`,
      ),
      "não_cumprido",
    );
    assert.equal(ativos(u), 0);
  });

  it("`sem_resposta` é recusado enquanto P-29 estiver aberta (§18.5)", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "qualquer coisa");

    const erro = falha(() => responder(u, id, "sem_resposta"));
    assert.ok(erro, "sem_resposta não pode ter produtor");
    assert.match(erro, /resultado invalido/);
    assert.equal(ativos(u), 1, "a recusa não altera o estado");
  });
});

describe("CASO 5 · responder duas vezes a mesma versão", () => {
  it("a segunda resposta é recusada", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "dormir cedo");
    responder(u, id, "cumprido");

    const erro = falha(() => responder(u, id, "não_cumprido"));
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /ja foi (respondido|superada)/);
    assert.equal(linhas(u), 2, "nenhuma terceira linha");
  });
});

describe("CASO 6 · novo compromisso depois de responder", () => {
  it("funciona, e o anterior continua no histórico", () => {
    const u = criarUsuarioComAceite();
    const id1 = declarar(u, "primeiro");
    responder(u, id1, "cumprido");

    const id2 = declarar(u, "segundo");
    assert.match(id2, /^[0-9a-f-]{36}$/);
    assert.equal(ativos(u), 1);
    assert.equal(linhas(u), 3, "declaração + resultado + nova declaração");
  });
});

describe("CASO 7 · duas transações concorrentes", () => {
  it("exatamente uma consegue criar", async () => {
    const u = criarUsuarioComAceite();

    // S1 segura a transação aberta enquanto S2 chega. Sem a trava, S2 lê
    // "nenhum ativo" (a linha de S1 ainda não foi confirmada) e insere.
    const [s1, s2] = await emParalelo([
      transacaoDoUsuario(
        u,
        `select public.declarar_compromisso('S1', ${AMANHA});
         select pg_sleep(1.5)`,
      ),
      transacaoDoUsuario(
        u,
        `select pg_sleep(0.4);
         select public.declarar_compromisso('S2', ${AMANHA})`,
      ),
    ]);

    const sucessos = [s1, s2].filter((r) => r.ok).length;
    assert.equal(sucessos, 1, `esperado exatamente 1 sucesso — ${s1.saida} / ${s2.saida}`);
    assert.equal(ativos(u), 1);
    assert.equal(linhas(u), 1);
  });

  it("identidades diferentes não bloqueiam uma à outra", async () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();

    const r = await emParalelo([
      transacaoDoUsuario(a, `select public.declarar_compromisso('A', ${AMANHA})`),
      transacaoDoUsuario(b, `select public.declarar_compromisso('B', ${AMANHA})`),
    ]);

    assert.equal(r.filter((x) => x.ok).length, 2, "a trava é POR usuário");
    assert.equal(ativos(a), 1);
    assert.equal(ativos(b), 1);
  });
});

describe("CASO 8 · acesso cruzado entre identidades", () => {
  it("A não responde compromisso de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const idDeB = declarar(b, "compromisso de B");

    const erro = falha(() => responder(a, idDeB, "cumprido"));
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /nao encontrado para esta identidade/);
    assert.equal(linhas(b), 1, "nada foi gravado na conta de B");
    assert.equal(ativos(b), 1, "o compromisso de B segue ativo");
  });

  it("A não enxerga as linhas de B (RLS de leitura intacta)", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    declarar(b, "só de B");

    const vistas = escreverComoUsuario(
      a,
      "select count(*) from public.commitments",
    );
    assert.equal(vistas, "0");
  });
});

describe("CASO 9 · Depois não grava nada (Q-13, §18.3)", () => {
  it("não existe ação de servidor para adiar", () => {
    const acoes = readFileSync(
      `${RAIZ}/src/app/(ambiente)/hoje/acoes.ts`,
      "utf8",
    );
    const exportadas = [...acoes.matchAll(/export async function (\w+)/g)]
      .map((m) => m[1])
      .sort();

    // As ações do Hoje são declarar (§18.1.1) e registrar resultado (§19.1).
    // Adiar não está entre elas e não pode passar a estar: se um dia houver
    // uma terceira, este teste falha e obriga a justificá-la.
    assert.deepEqual(exportadas, ["declararCompromisso", "registrarResultado"]);
    assert.doesNotMatch(
      acoes.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""),
      /adiar|postergar/i,
    );
  });

  it("o botão Depois só mexe em estado local do cliente", () => {
    const componente = readFileSync(
      `${RAIZ}/src/app/(ambiente)/hoje/resposta.tsx`,
      "utf8",
    );

    // Isola o elemento <button> cujo rótulo é "Depois". Fatiar a vizinhança
    // pegaria os outros dois botões junto e daria falso positivo.
    const botoes = [...componente.matchAll(/<button\b[\s\S]*?<\/button>/g)]
      .map((m) => m[0]);
    const depois = botoes.filter((b) => />\s*Depois\s*</.test(b));
    assert.equal(depois.length, 1, "deve haver exatamente um botão Depois");

    assert.match(depois[0], /onClick=\{\(\) => setAdiado\(true\)\}/);
    assert.doesNotMatch(
      depois[0],
      /registrarResultado|responder\(|action=/,
      "adiar não pode chamar gravação",
    );

    // E os outros dois PRECISAM gravar — sem isto o teste acima passaria
    // também com a tela inteira inerte, que é o estado anterior a esta fase.
    assert.equal(
      botoes.filter((b) => /responder\("/.test(b)).length,
      2,
      "Cumpri e Não cumpri gravam",
    );
  });

  it("nenhum caminho da aplicação produz `sem_resposta`", () => {
    const fontes = ["src/app/(ambiente)/hoje/acoes.ts",
                    "src/app/(ambiente)/hoje/resposta.tsx",
                    "src/app/onboarding/acoes.ts",
                    "src/lib/ambiente/dias.ts",
                    "src/lib/ambiente/compromissos.ts",
                    "src/lib/ambiente/cadeia.ts"];
    for (const f of fontes) {
      const texto = readFileSync(`${RAIZ}/${f}`, "utf8");
      const codigo = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.doesNotMatch(codigo, /sem_resposta/, `${f} não pode gravar sem_resposta`);
    }
  });
});

describe("CASO 10 · a cadeia permanece reconstruível", () => {
  it("declaração, correção e resultado ficam ligados e datados", () => {
    const u = criarUsuarioComAceite();
    const id1 = declarar(u, "primeiro");
    const idR1 = responder(u, id1, "cumprido");
    const id2 = declarar(u, "segundo");
    const idR2 = responder(u, id2, "não_cumprido");

    assert.equal(linhas(u), 4);
    assert.equal(ativos(u), 0);

    // Cada linha tem recorded_at próprio e a ligação é recuperável.
    assert.equal(
      sql(
        `select string_agg(
           coalesce(commitment_declaration, '→' || outcome), ' '
           order by recorded_at, id)
         from public.commitments where user_id = ${literal(u)}`,
      ),
      "primeiro →cumprido segundo →não_cumprido",
    );

    // Cada resultado aponta para a declaração que respondeu.
    assert.equal(
      sql(
        `select (r1.supersedes_id = ${literal(id1)}
                 and r2.supersedes_id = ${literal(id2)})::text
         from public.commitments r1, public.commitments r2
         where r1.id = ${literal(idR1)} and r2.id = ${literal(idR2)}`,
      ),
      "true",
    );

    // Q-10: nenhuma declaração foi perdida ou sobrescrita.
    assert.equal(
      sql(
        `select count(*) from public.commitments
         where user_id = ${literal(u)} and commitment_declaration is not null`,
      ),
      "2",
    );
  });
});

describe("CASO 11 e 12 · Q-14, anti-bifurcação (§18.4.2)", () => {
  for (const tabela of ["commitments", "gambling_history"]) {
    it(`${tabela}: a constraint existe sobre (user_id, supersedes_id)`, () => {
      assert.equal(
        sql(
          `select count(*) from pg_constraint
           where conrelid = 'public.${tabela}'::regclass
             and conname = '${tabela}_uma_correcao_por_versao'
             and contype = 'u'`,
        ),
        "1",
      );
    });
  }

  it("commitments: superar a mesma versão duas vezes é rejeitado", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "raiz");
    responder(u, id, "cumprido");

    // Direto no banco, como postgres: a constraint é a última barreira, e
    // precisa valer mesmo se a função for contornada.
    const erro = falha(() =>
      sql(
        `insert into public.commitments
           (user_id, outcome, information_nature, supersedes_id)
         values (${literal(u)}, 'não_cumprido', 'declarado', ${literal(id)})`,
      ),
    );
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /uma_correcao_por_versao/);
  });

  it("gambling_history: superar a mesma versão duas vezes é rejeitado", () => {
    const u = criarUsuarioComAceite();
    // O id é gerado antes: `returning` faz o psql imprimir também o rótulo
    // do comando, e o helper devolveria as duas linhas juntas.
    const raiz = sql("select gen_random_uuid()");
    sql(
      `insert into public.gambling_history
         (id, user_id, information_nature,
          frequency_response_state, amount_response_state)
       values (${literal(raiz)}, ${literal(u)}, 'declarado', 'informado', 'informado')`,
    );
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state,
          amount_response_state, supersedes_id)
       values (${literal(u)}, 'declarado', 'informado', 'informado', ${literal(raiz)})`,
    );

    const erro = falha(() =>
      sql(
        `insert into public.gambling_history
           (user_id, information_nature, frequency_response_state,
            amount_response_state, supersedes_id)
         values (${literal(u)}, 'declarado', 'informado', 'informado', ${literal(raiz)})`,
      ),
    );
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /uma_correcao_por_versao/);
  });

  it("múltiplas raízes continuam possíveis: NULLs não colidem", () => {
    const u = criarUsuarioComAceite();
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state)
       values (${literal(u)}, 'declarado', 'informado', 'informado'),
              (${literal(u)}, 'declarado', 'informado', 'informado')`,
    );
    assert.equal(
      sql(
        `select count(*) from public.gambling_history
         where user_id = ${literal(u)}`,
      ),
      "2",
      "Q-14 lineariza a cadeia; NÃO limita o número de cadeias (§18.4.2)",
    );
  });
});

describe("CASO 13 · INSERT direto pelo cliente (§19.1.2)", () => {
  it("o privilégio de insert não existe para anon nem authenticated", () => {
    for (const papel of ["anon", "authenticated"]) {
      assert.equal(
        sql(
          `select has_table_privilege('${papel}', 'public.commitments', 'insert')::text`,
        ),
        "false",
        `${papel} não pode inserir`,
      );
    }
  });

  it("select continua concedido a authenticated (§19.2.6)", () => {
    assert.equal(
      sql(
        "select has_table_privilege('authenticated','public.commitments','select')::text",
      ),
      "true",
    );
  });

  it("o insert direto falha em execução", () => {
    const u = criarUsuarioComAceite();
    const erro = falha(() =>
      escreverComoUsuario(
        u,
        `insert into public.commitments
           (user_id, commitment_declaration, information_nature)
         values (${literal(u)}, 'burla', 'declarado')`,
      ),
    );
    assert.ok(erro, "deveria falhar");
    assert.match(erro, /permission denied/i);
    assert.equal(linhas(u), 0);
  });

  it("continua sem update e sem delete (Q-10)", () => {
    assert.equal(
      sql(
        `select coalesce(string_agg(distinct tablename || ':' || cmd, ', '), '(nenhuma)')
         from pg_policies
         where schemaname = 'public' and cmd in ('UPDATE', 'DELETE')`,
      ),
      "(nenhuma)",
    );
    for (const privilegio of ["update", "delete", "truncate"]) {
      assert.equal(
        sql(
          `select has_table_privilege('authenticated','public.commitments','${privilegio}')::text`,
        ),
        "false",
        `authenticated não pode ${privilegio}`,
      );
    }
  });

  it("nenhum INSERT direto em commitments restou no código da aplicação", () => {
    const fontes = sql(
      "select 1",
    ) && ["src/app/onboarding/acoes.ts",
          "src/app/(ambiente)/hoje/acoes.ts",
          "src/lib/ambiente/dias.ts",
                    "src/lib/ambiente/compromissos.ts",
                    "src/lib/ambiente/cadeia.ts"];
    for (const f of fontes) {
      const codigo = readFileSync(`${RAIZ}/${f}`, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      assert.doesNotMatch(
        codigo,
        /from\("commitments"\)[\s\S]{0,80}\.insert/,
        `${f} não pode inserir direto em commitments`,
      );
    }
  });
});

describe("CASO 14 · identidade vem da sessão, nunca do cliente (§19.2.1)", () => {
  const FUNCOES = [
    ["declarar_compromisso", "text, timestamptz"],
    ["registrar_resultado_do_compromisso", "uuid, text"],
  ];

  for (const [fn, assinatura] of FUNCOES) {
    it(`${fn}: nenhum parâmetro de identidade na assinatura`, () => {
      const args = sql(
        `select pg_get_function_arguments(p.oid)
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = '${fn}'`,
      );
      assert.doesNotMatch(
        args,
        /\buser_?id\b|\buid\b|\bidentidade\b/i,
        `assinatura: ${args}`,
      );
    });

    it(`${fn}: SECURITY DEFINER com search_path fixado (§19.2.2)`, () => {
      const perfil = sql(
        `select p.prosecdef::text || '|' || p.prokind::text || '|' ||
                coalesce(array_to_string(p.proconfig, ','), '(nenhum)')
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = '${fn}'`,
      );
      assert.equal(perfil, 'true|f|search_path=""');
    });

    it(`${fn}: só authenticated executa`, () => {
      assert.equal(
        sql(`select has_function_privilege('anon',
               'public.${fn}(${assinatura})', 'execute')::text`),
        "false",
      );
      assert.equal(
        sql(`select has_function_privilege('authenticated',
               'public.${fn}(${assinatura})', 'execute')::text`),
        "true",
      );
    });

    it(`${fn}: sem identidade na sessão, recusa`, () => {
      const erro = falha(() =>
        sql(
          `begin;
           set local role authenticated;
           select public.${fn}(${fn === "declarar_compromisso"
             ? `'x', ${AMANHA}`
             : "gen_random_uuid(), 'cumprido'"});
           rollback;`,
        ),
      );
      assert.ok(erro, "deveria falhar");
      assert.match(erro, /sem identidade autenticada/);
    });
  }

  it("a aplicação não envia identidade para as funções", () => {
    for (const f of ["src/app/onboarding/acoes.ts",
                     "src/app/(ambiente)/hoje/acoes.ts"]) {
      const codigo = readFileSync(`${RAIZ}/${f}`, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      const rpc = codigo.match(/\.rpc\([\s\S]*?\}\)/g) ?? [];
      for (const chamada of rpc) {
        assert.doesNotMatch(chamada, /user_id|usuario\.id/, `em ${f}: ${chamada}`);
      }
    }
  });
});

describe("§9.1 e §14.3.21 · nenhum trigger foi criado", () => {
  it("o schema public continua sem trigger de usuário", () => {
    assert.equal(
      sql(
        `select coalesce(string_agg(tgname, ','), '(nenhum)') from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         where c.relnamespace = 'public'::regnamespace and not t.tgisinternal`,
      ),
      "(nenhum)",
    );
  });
});

describe("§19.1.4 · view de verificação", () => {
  it("existe, é security_invoker e não é legível pelo cliente", () => {
    assert.equal(
      sql(
        `select coalesce((
           select option_value from pg_options_to_table(c.reloptions)
           where option_name = 'security_invoker'), 'ausente')
         from pg_class c
         where c.oid = 'public.commitment_invariant_violations'::regclass`,
      ),
      "true",
    );
    for (const papel of ["anon", "authenticated"]) {
      assert.equal(
        sql(
          `select has_table_privilege('${papel}',
             'public.commitment_invariant_violations', 'select')::text`,
        ),
        "false",
      );
    }
  });

  it("acusa vazio no estado corrente", () => {
    assert.equal(sql("select count(*) from public.commitment_invariant_violations"), "0");
  });

  it("não é vazia por construção: detecta bifurcação plantada", () => {
    const u = criarUsuarioComAceite();
    // O id é gerado antes: `returning` faz o psql imprimir também o rótulo
    // do comando, e o helper devolveria as duas linhas juntas.
    const raiz = sql("select gen_random_uuid()");
    sql(
      `insert into public.gambling_history
         (id, user_id, information_nature,
          frequency_response_state, amount_response_state)
       values (${literal(raiz)}, ${literal(u)}, 'declarado', 'informado', 'informado')`,
    );
    // A constraint é removida só nesta transação de teste, para provar que a
    // view enxerga o que a constraint impede. Reposta em seguida.
    sql(
      `alter table public.gambling_history
         drop constraint gambling_history_uma_correcao_por_versao`,
    );
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state,
          amount_response_state, supersedes_id)
       values (${literal(u)}, 'declarado', 'informado', 'informado', ${literal(raiz)}),
              (${literal(u)}, 'declarado', 'informado', 'informado', ${literal(raiz)})`,
    );

    assert.equal(
      sql(
        `select count(*) from public.commitment_invariant_violations
         where user_id = ${literal(u)}`,
      ),
      "1",
      "a view precisa acusar a bifurcação",
    );

    sql(
      `delete from public.gambling_history
       where user_id = ${literal(u)} and supersedes_id = ${literal(raiz)}`,
    );
    sql(
      `alter table public.gambling_history
         add constraint gambling_history_uma_correcao_por_versao
         unique (user_id, supersedes_id)`,
    );
    assert.equal(sql("select count(*) from public.commitment_invariant_violations"), "0");
  });
});

describe("§18.1 · o que NÃO foi criado nesta fase", () => {
  it("nenhuma entidade de check-in ou registro diário (CF-11, §14.4.25)", () => {
    const tabelas = sql(
      `select string_agg(tablename, ',' order by tablename)
       from pg_tables where schemaname = 'public'`,
    );
    assert.equal(
      tabelas,
      TABELAS_AUTORIZADAS,
      "o núcleo mínimo de §11.2, exatamente",
    );
  });

  it("nenhuma coluna de dia foi acrescentada a commitments", () => {
    const colunas = sql(
      `select string_agg(column_name, ',' order by column_name)
       from information_schema.columns
       where table_schema = 'public' and table_name = 'commitments'`,
    );
    assert.doesNotMatch(colunas, /\bdia\b|_day|_date|check_?in/i);
    assert.equal(
      colunas,
      "commitment_declaration,due_at,id,information_nature,outcome,recorded_at,supersedes_id,user_id",
    );
  });

  it("a Linha continua sem produzir `com-aposta` (§18.1.3)", () => {
    const codigo = readFileSync(`${RAIZ}/src/lib/ambiente/dias.ts`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(codigo, /com-aposta/);
  });
});
