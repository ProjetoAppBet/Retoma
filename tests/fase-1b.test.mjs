/**
 * Testes da Fase 1B — recovery_goals, gambling_history e commitments.
 *
 * Normativo exercitado: §7.1 (user_id -> auth.users), §7.3 (RLS na mesma
 * migration), §9.2 (invariante alcança toda entidade de domínio), §11.5,
 * §11.6 (Q-01…Q-10) e §11.7 (L-01, L-02, L-03).
 *
 * A RLS é aplicada pelo próprio PostgreSQL, com papel `authenticated` e
 * `request.jwt.claims` reais — ver tests/support/local-db.mjs.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  TABELAS_AUTORIZADAS,
  criarUsuarioComAceite,
  escreverComoUsuario,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  sqlComoAnon,
  sqlComoUsuario,
} from "./support/local-db.mjs";

const TABELAS = ["recovery_goals", "gambling_history", "commitments"];

let usuarioA;
let usuarioB;

/** Insere uma linha mínima válida da tabela, para o usuário indicado. */
function inserirLinhaMinima(tabela, userId, extra = "") {
  const colunas = {
    recovery_goals:
      `(user_id, goal_type, information_nature) values (${literal(userId)}, 'interromper', 'declarado')`,
    gambling_history:
      `(user_id, information_nature, frequency_response_state, amount_response_state)
       values (${literal(userId)}, 'declarado', 'informado', 'não perguntado')`,
    commitments:
      `(user_id, information_nature) values (${literal(userId)}, 'declarado')`,
  };
  return sql(`insert into public.${tabela} ${colunas[tabela]} ${extra}`);
}

before(() => {
  recriarBanco();
  usuarioA = criarUsuarioComAceite();
  usuarioB = criarUsuarioComAceite();
  for (const t of TABELAS) {
    inserirLinhaMinima(t, usuarioA);
    inserirLinhaMinima(t, usuarioB);
  }
});

after(() => {
  pararSeRodando();
});

describe("schema da Fase 1B", () => {
  it("o schema tem exatamente as tabelas autorizadas, e nada além", () => {
    const tabelas = sql(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    )
      .split("\n")
      .filter(Boolean);
    assert.equal(tabelas.join(","), TABELAS_AUTORIZADAS);
  });

  it("não cria recovery_plans nem qualquer módulo futuro (§11.3)", () => {
    // `conversations` e `messages` SAÍRAM desta lista: a seção 20.2 (emenda
    // E-07) abriu exceção nominal na proibição 14.4.25 para as duas, e a
    // seção 21 (E-08) fixou o modelo. Todo o resto de 11.3 segue vedado —
    // inclusive `ai_memories`, porque 20.4.5 mantém memória e padrões fora.
    const proibidas = [
      "recovery_plans", "recovery_plan_versions", "check_ins", "relapses",
      "coping_strategies", "barriers", "support_people", "notifications",
      "ai_memories", "ai_patterns", "pgsi_assessments",
      "gambling_events", "users",
    ];
    for (const nome of proibidas) {
      const existe = sql(
        `select count(*) from information_schema.tables
         where table_schema = 'public' and table_name = ${literal(nome)}`,
      );
      assert.equal(existe, "0", `tabela fora de escopo existe: ${nome}`);
    }
  });

  it("toda entidade referencia a identidade por user_id -> auth.users(id)", () => {
    for (const t of TABELAS) {
      // A chave de identidade é a de UMA coluna. Desde a migration de R5,
      // `user_id` também participa da chave COMPOSTA que prende a cadeia de
      // supersessão à mesma identidade — por isso a consulta filtra por
      // cardinalidade em vez de assumir que só existe uma.
      const fk = sql(
        `select confrelid::regclass::text || '.' ||
                (select attname from pg_attribute
                  where attrelid = c.confrelid and attnum = c.confkey[1])
         from pg_constraint c
         where c.conrelid = ${literal("public." + t)}::regclass
           and c.contype = 'f'
           and array_length(c.conkey, 1) = 1
           and (select attname from pg_attribute
                 where attrelid = c.conrelid and attnum = c.conkey[1]) = 'user_id'`,
      );
      assert.equal(fk, "auth.users.id", `${t}.user_id não aponta para auth.users`);
    }
  });

  it("não usa owner_id, account_id nem profile_id (AA-03)", () => {
    const proibidas = sql(
      `select count(*) from information_schema.columns
       where table_schema = 'public'
         and column_name in ('owner_id', 'account_id', 'profile_id')`,
    );
    assert.equal(proibidas, "0");
  });

  it("não existe coluna de plano em commitments (Q-07 + §11.3)", () => {
    const colunas = sql(
      `select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'commitments'
         and column_name like '%plan%'`,
    );
    assert.equal(colunas, "0");
  });

  it("recovery_goals não tem meta numérica de redução (Q-02)", () => {
    const colunas = sql(
      `select coalesce(string_agg(column_name, ','), '(nenhuma)')
       from information_schema.columns
       where table_schema = 'public' and table_name = 'recovery_goals'
         and data_type in ('integer', 'numeric', 'bigint', 'double precision')`,
    );
    assert.equal(colunas, "(nenhuma)");
  });

  it("recovery_goals não armazena objetivo ativo em paralelo (Q-01)", () => {
    const flag = sql(
      `select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'recovery_goals'
         and column_name in ('is_active', 'active', 'ativo', 'current')`,
    );
    assert.equal(flag, "0");
  });
});

describe("domínios normativos (Q-02, Q-06, Q-09, L-01, L-02, §11.5.2)", () => {
  /** Colunas obrigatórias mínimas de cada tabela, com valores válidos. */
  const MINIMO = {
    recovery_goals: {
      goal_type: "interromper",
      information_nature: "declarado",
    },
    gambling_history: {
      information_nature: "declarado",
      frequency_response_state: "informado",
      amount_response_state: "não perguntado",
    },
    commitments: {
      information_nature: "declarado",
    },
  };

  /**
   * Monta um INSERT válido da tabela, trocando `coluna` por `valor`. Se a
   * coluna já pertence ao mínimo obrigatório, é substituída — nunca repetida.
   */
  function inserirCom(tabela, userId, coluna, valor) {
    const campos = { ...MINIMO[tabela], [coluna]: valor };
    const nomes = ["user_id", ...Object.keys(campos)];
    const valores = [literal(userId), ...Object.values(campos).map(literal)];
    return sql(
      `insert into public.${tabela} (${nomes.join(", ")})
       values (${valores.join(", ")})`,
    );
  }

  const casos = [
    ["Q-02 tipo do objetivo", "recovery_goals", "goal_type", "meta-inventada"],
    ["Q-06 resultado", "commitments", "outcome", "talvez"],
    ["Q-09 natureza", "commitments", "information_nature", "suposto"],
    ["§11.5.2 frequência", "gambling_history", "frequency_category", "as vezes"],
    ["§11.5.2 período", "gambling_history", "amount_period", "quinzena"],
    ["§11.5.2 natureza do valor", "gambling_history", "amount_nature", "chutada"],
    ["§11.5.2 estado da resposta", "gambling_history", "frequency_response_state", "vazio"],
    ["L-01 estado de precisão", "gambling_history", "start_precision_state", "mais ou menos"],
    ["L-02 nível de normalização", "gambling_history", "start_normalized_precision", "década"],
    ["Q-05 consequência principal", "gambling_history", "main_consequence_category", "diversas"],
  ];

  for (const [rotulo, tabela, coluna, valorInvalido] of casos) {
    it(`${rotulo}: rejeita valor fora do domínio`, () => {
      const falhou = falha(() => inserirCom(tabela, usuarioA, coluna, valorInvalido));
      assert.ok(falhou, `${coluna} deveria rejeitar "${valorInvalido}"`);
      assert.match(falhou, /violates check constraint/i);
    });
  }

  // Q-09 exige separar declarado de observado, inferido e segurança. As três
  // entidades da Fase 1B são declarativas; admitir as outras naturezas aqui
  // seria exatamente a mistura que Q-09 proíbe.
  for (const tabela of TABELAS) {
    for (const natureza of ["observado", "inferido", "segurança"]) {
      it(`Q-09: ${tabela} recusa natureza "${natureza}"`, () => {
        const erro = falha(() =>
          inserirCom(tabela, usuarioA, "information_nature", natureza),
        );
        assert.ok(erro, `${tabela} não pode aceitar "${natureza}"`);
        assert.match(erro, /violates check constraint/i);
      });
    }

    it(`Q-09: ${tabela} aceita "declarado"`, () => {
      inserirCom(tabela, usuarioA, "information_nature", "declarado");
    });
  }

  it("Q-05: rejeita categoria de consequência fora do Modelo Operacional", () => {
    const erro = falha(() =>
      sql(
        `insert into public.gambling_history
           (user_id, information_nature, frequency_response_state, amount_response_state,
            consequence_categories)
         values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'não perguntado',
            array['financeiras','espirituais'])`,
      ),
    );
    assert.ok(erro, "categoria inventada deveria ser rejeitada");
  });

  it("Q-05: aceita múltiplas categorias válidas", () => {
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state,
          consequence_categories, main_consequence_category, main_consequence_declaration)
       values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'não perguntado',
          array['financeiras','familiares'], 'financeiras', 'perdi o controle das contas')`,
    );
    const n = sql(
      `select count(*) from public.gambling_history
       where user_id = ${literal(usuarioA)} and 'familiares' = any(consequence_categories)`,
    );
    assert.equal(n, "1");
  });
});

describe("constraints de preservação (§11.5.2, L-02)", () => {
  it("período 'outro' exige a expressão original", () => {
    const erro = falha(() =>
      sql(
        `insert into public.gambling_history
           (user_id, information_nature, frequency_response_state, amount_response_state,
            amount_period)
         values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'informado', 'outro')`,
      ),
    );
    assert.ok(erro, "período 'outro' sem expressão original deveria falhar");
    assert.match(erro, /periodo_outro_exige_expressao/i);
  });

  it("período 'outro' é aceito quando a expressão original existe", () => {
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state,
          amount_period, amount_original_expression)
       values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'informado',
          'outro', 'toda vez que recebo')`,
    );
  });

  it("L-02: valor normalizado sem estado de precisão é rejeitado", () => {
    const erro = falha(() =>
      sql(
        `insert into public.gambling_history
           (user_id, information_nature, frequency_response_state, amount_response_state,
            start_normalized_value, start_normalized_precision)
         values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'não perguntado',
            '2019', 'ano')`,
      ),
    );
    assert.ok(erro, "normalizado sem estado de precisão deveria falhar");
    assert.match(erro, /inicio_normalizado_completo/i);
  });

  it("L-02: início normalizado completo é aceito", () => {
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state,
          start_original_expression, start_normalized_value,
          start_normalized_precision, start_precision_state)
       values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'não perguntado',
          'faz uns cinco anos', '2019', 'ano', 'aproximado')`,
    );
  });

  it("L-02: só a expressão original, sem normalizar, é aceito", () => {
    sql(
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state,
          start_original_expression)
       values (${literal(usuarioA)}, 'declarado', 'não perguntado', 'não perguntado',
          'nem lembro direito')`,
    );
  });
});

describe("append-only e histórico (Q-10)", () => {
  it("nenhuma das três tem política de UPDATE ou DELETE", () => {
    const politicas = sql(
      `select coalesce(string_agg(distinct tablename || ':' || cmd, ', '), '(nenhuma)')
       from pg_policies
       where schemaname = 'public' and cmd in ('UPDATE', 'DELETE')`,
    );
    assert.equal(politicas, "(nenhuma)");
  });

  for (const tabela of TABELAS) {
    it(`${tabela}: usuário não altera nem apaga o próprio registro`, () => {
      const antes = sql(
        `select count(*) from public.${tabela} where user_id = ${literal(usuarioB)}`,
      );

      // O valor gravado é legal e idêntico ao que já está lá: se este UPDATE
      // falhar, foi a ausência de policy/privilégio que o barrou — não um
      // CHECK. Sem isso o teste passaria pelo motivo errado.
      const erroUpdate = falha(() =>
        escreverComoUsuario(
          usuarioB,
          `update public.${tabela} set information_nature = 'declarado'
           where user_id = ${literal(usuarioB)}`,
        ),
      );
      assert.ok(erroUpdate, `UPDATE em ${tabela} deveria falhar`);

      const erroDelete = falha(() =>
        escreverComoUsuario(
          usuarioB,
          `delete from public.${tabela} where user_id = ${literal(usuarioB)}`,
        ),
      );
      assert.ok(erroDelete, `DELETE em ${tabela} deveria falhar`);

      const depois = sql(
        `select count(*) from public.${tabela} where user_id = ${literal(usuarioB)}`,
      );
      assert.equal(depois, antes, `linhas de ${tabela} não podem mudar`);
    });
  }

  it("correção gera nova linha e preserva a anterior (Q-10)", () => {
    const anterior = sql(
      `select id from public.recovery_goals
       where user_id = ${literal(usuarioB)} order by recorded_at limit 1`,
    );
    escreverComoUsuario(
      usuarioB,
      `insert into public.recovery_goals
         (user_id, goal_type, information_nature, supersedes_id)
       values (${literal(usuarioB)}, 'reduzir', 'declarado', ${literal(anterior)})`,
    );

    const total = sql(
      `select count(*) from public.recovery_goals where user_id = ${literal(usuarioB)}`,
    );
    assert.equal(total, "2", "a correção deve gerar nova linha");

    const original = sql(
      `select goal_type from public.recovery_goals where id = ${literal(anterior)}`,
    );
    assert.equal(original, "interromper", "a declaração anterior permanece intacta");
  });

  it("Q-01: o objetivo ativo é derivado — a linha mais recente do usuário", () => {
    const ativo = sql(
      `select goal_type from public.recovery_goals
       where user_id = ${literal(usuarioB)}
       order by recorded_at desc, id desc limit 1`,
    );
    assert.equal(ativo, "reduzir");
  });
});

describe("L-04 · desempate determinístico de recorded_at", () => {
  it("o índice cobre recorded_at desc + id desc", () => {
    const def = sql(
      `select indexdef from pg_indexes
       where schemaname = 'public' and indexname = 'recovery_goals_user_recorded_at_idx'`,
    );
    assert.match(def, /recorded_at DESC/i);
    assert.match(def, /id DESC/i);
  });

  it("now() empata de fato duas linhas gravadas na mesma transação", () => {
    // Demonstra que o empate é alcançável em produção, e não um cenário
    // artificial: now() é o horário da transação, não do comando.
    const u = criarUsuarioComAceite();
    sql(
      `begin;
       insert into public.recovery_goals (user_id, goal_type, information_nature)
         values (${literal(u)}, 'interromper', 'declarado');
       insert into public.recovery_goals (user_id, goal_type, information_nature)
         values (${literal(u)}, 'reduzir', 'declarado');
       commit;`,
    );
    const distintos = sql(
      `select count(distinct recorded_at) from public.recovery_goals
       where user_id = ${literal(u)}`,
    );
    assert.equal(distintos, "1", "as duas linhas deveriam empatar em recorded_at");
  });

  it("com empate, a ordenação canônica devolve sempre a mesma linha", () => {
    const u = criarUsuarioComAceite();
    // Mesmo instante, explícito: o empate é o objeto do teste.
    for (const tipo of ["interromper", "reduzir", "ainda não decidido"]) {
      sql(
        `insert into public.recovery_goals
           (user_id, goal_type, information_nature, recorded_at)
         values (${literal(u)}, ${literal(tipo)}, 'declarado',
                 timestamptz '2030-01-01 00:00:00+00')`,
      );
    }

    // A garantia tem de vir da cláusula ORDER BY, não do formato do índice: o
    // planejador pode trocar de plano a qualquer momento (tabela pequena,
    // estatísticas novas). Por isso a varredura por índice é desligada aqui —
    // com ela ligada, o índice (user_id, recorded_at desc, id desc) entregaria
    // o desempate de graça e o teste passaria sem provar nada.
    const semIndice =
      "set enable_indexscan=off; set enable_bitmapscan=off;" +
      " set enable_indexonlyscan=off;";
    const ultima = (s) => s.split("\n").pop().trim();
    const canonica = () =>
      ultima(
        sql(
          `${semIndice} select id from public.recovery_goals
           where user_id = ${literal(u)} order by recorded_at desc, id desc limit 1`,
        ),
      );

    // Comparado no próprio tipo uuid, não como texto, para não depender de
    // coincidência entre a ordem de bytes e a ordem lexicográfica.
    const esperado = sql(
      `select id from public.recovery_goals
       where user_id = ${literal(u)} order by id desc limit 1`,
    );
    assert.equal(canonica(), esperado, "o desempate deve escolher o maior id");

    // Estabilidade: a ordem física da varredura não pode influenciar.
    const vistos = new Set();
    for (let i = 0; i < 10; i++) vistos.add(canonica());
    assert.equal(vistos.size, 1, `leitura instável: ${[...vistos].join(", ")}`);
  });

  it("sem o desempate, o empate deixa mais de uma candidata", () => {
    // Prova que o problema existia: recorded_at sozinho não decide.
    const u = criarUsuarioComAceite();
    for (const tipo of ["interromper", "reduzir"]) {
      sql(
        `insert into public.recovery_goals
           (user_id, goal_type, information_nature, recorded_at)
         values (${literal(u)}, ${literal(tipo)}, 'declarado',
                 timestamptz '2031-01-01 00:00:00+00')`,
      );
    }
    const empatadas = sql(
      `select count(*) from public.recovery_goals
       where user_id = ${literal(u)}
         and recorded_at = (select max(recorded_at) from public.recovery_goals
                            where user_id = ${literal(u)})`,
    );
    assert.equal(empatadas, "2");
  });
});

describe("L-05 · a cadeia de correção não bifurca", () => {
  it("a restrição de unicidade existe em (user_id, supersedes_id)", () => {
    const def = sql(
      `select pg_get_constraintdef(oid) from pg_constraint
       where conname = 'recovery_goals_uma_correcao_por_versao'`,
    );
    assert.match(def, /UNIQUE \(user_id, supersedes_id\)/i);
  });

  it("a segunda correção da MESMA versão é recusada", () => {
    const u = criarUsuarioComAceite();
    const base = sql(
      `insert into public.recovery_goals (user_id, goal_type, information_nature)
       values (${literal(u)}, 'interromper', 'declarado') returning id`,
    ).split("\n")[0].trim();

    // Primeira correção: legítima.
    escreverComoUsuario(
      u,
      `insert into public.recovery_goals
         (user_id, goal_type, information_nature, supersedes_id)
       values (${literal(u)}, 'reduzir', 'declarado', ${literal(base)})`,
    );

    // Segunda correção da mesma versão: bifurcaria a cadeia.
    const erro = falha(() =>
      escreverComoUsuario(
        u,
        `insert into public.recovery_goals
           (user_id, goal_type, information_nature, supersedes_id)
         values (${literal(u)}, 'ainda não decidido', 'declarado', ${literal(base)})`,
      ),
    );
    assert.ok(erro, "a bifurcação deveria ser recusada");
    assert.match(erro, /duplicate key value|uma_correcao_por_versao/i);

    const cabecas = sql(
      `select count(*) from public.recovery_goals g
       where g.user_id = ${literal(u)}
         and not exists (select 1 from public.recovery_goals x
                         where x.supersedes_id = g.id)`,
    );
    assert.equal(cabecas, "1", "a cadeia deve ter exatamente uma cabeça");
  });

  it("corrigir em sequência continua permitido (a cadeia cresce, não ramifica)", () => {
    const u = criarUsuarioComAceite();
    let anterior = sql(
      `insert into public.recovery_goals (user_id, goal_type, information_nature)
       values (${literal(u)}, 'interromper', 'declarado') returning id`,
    ).split("\n")[0].trim();

    for (const tipo of ["reduzir", "ainda não decidido"]) {
      anterior = sql(
        `insert into public.recovery_goals
           (user_id, goal_type, information_nature, supersedes_id)
         values (${literal(u)}, ${literal(tipo)}, 'declarado', ${literal(anterior)})
         returning id`,
      ).split("\n")[0].trim();
    }

    assert.equal(
      sql(`select count(*) from public.recovery_goals where user_id = ${literal(u)}`),
      "3",
      "as três versões devem coexistir (Q-10)",
    );
    assert.equal(
      sql(
        `select count(*) from public.recovery_goals g
         where g.user_id = ${literal(u)}
           and not exists (select 1 from public.recovery_goals x
                           where x.supersedes_id = g.id)`,
      ),
      "1",
    );
  });

  it("várias linhas de origem (supersedes_id nulo) continuam permitidas", () => {
    // NULLs são distintos num índice único: a origem de cada cadeia é livre.
    const u = criarUsuarioComAceite();
    for (const tipo of ["interromper", "reduzir"]) {
      sql(
        `insert into public.recovery_goals (user_id, goal_type, information_nature)
         values (${literal(u)}, ${literal(tipo)}, 'declarado')`,
      );
    }
    assert.equal(
      sql(
        `select count(*) from public.recovery_goals
         where user_id = ${literal(u)} and supersedes_id is null`,
      ),
      "2",
    );
  });
});

describe("isolamento e privilégios (AA-21, AA-24)", () => {
  for (const tabela of TABELAS) {
    it(`${tabela}: A não lê, escreve nem apaga dados de B`, () => {
      const visiveis = sqlComoUsuario(
        usuarioA,
        `select count(*) from public.${tabela} where user_id = ${literal(usuarioB)}`,
      );
      assert.equal(visiveis, "0", `A não pode ver linhas de B em ${tabela}`);

      const erro = falha(() =>
        escreverComoUsuario(
          usuarioA,
          `insert into public.${tabela} (user_id, information_nature
             ${tabela === "recovery_goals" ? ", goal_type" : ""}
             ${tabela === "gambling_history" ? ", frequency_response_state, amount_response_state" : ""})
           values (${literal(usuarioB)}, 'declarado'
             ${tabela === "recovery_goals" ? ", 'interromper'" : ""}
             ${tabela === "gambling_history" ? ", 'não perguntado', 'não perguntado'" : ""})`,
        ),
      );
      assert.ok(erro, `A não pode inserir em nome de B em ${tabela}`);
    });

    it(`${tabela}: anon sem privilégio e sem TRUNCATE`, () => {
      const privs = sql(
        `select coalesce(string_agg(privilege_type, ','), '(nenhum)')
         from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'anon'
           and table_name = ${literal(tabela)}`,
      );
      assert.equal(privs, "(nenhum)");

      const erro = falha(() => sqlComoAnon(`truncate public.${tabela}`));
      assert.ok(erro, `anon não pode truncar ${tabela}`);
    });

    it(`${tabela}: authenticated tem exatamente os privilégios previstos`, () => {
      const privs = sql(
        `select coalesce(string_agg(privilege_type, ',' order by privilege_type), '(nenhum)')
         from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'authenticated'
           and table_name = ${literal(tabela)}`,
      );
      // §19.1.2: em `commitments` o INSERT saiu do papel do cliente — a
      // escrita passa exclusivamente pelas funções transacionais que impõem
      // Q-12. A leitura permanece sob RLS (§19.2.6). As outras duas
      // entidades seguem escrevendo por insert.
      assert.equal(privs, tabela === "commitments" ? "SELECT" : "INSERT,SELECT");

      const erro = falha(() => sqlComoUsuario(usuarioA, `truncate public.${tabela}`));
      assert.ok(erro, `authenticated não pode truncar ${tabela}`);
    });

    it(`${tabela}: RLS habilitada`, () => {
      const rls = sql(
        `select relrowsecurity from pg_class
         where relnamespace = 'public'::regnamespace and relname = ${literal(tabela)}`,
      );
      assert.equal(rls, "t");
    });
  }
});

describe("invariante alcança as entidades de domínio (§9.2, AA-09)", () => {
  it("está em conjunto vazio no estado íntegro", () => {
    const n = sql("select count(*) from public.consent_invariant_violations");
    assert.equal(n, "0");
  });

  for (const tabela of TABELAS) {
    it(`detecta linha de ${tabela} anterior ao aceite`, () => {
      const id = sql("select gen_random_uuid()");
      sql(`insert into auth.users (id) values (${literal(id)})`);
      inserirLinhaMinima(tabela, id);
      sql(
        `update public.${tabela} set recorded_at = now() - interval '1 hour'
         where user_id = ${literal(id)}`,
      );
      sql(
        `insert into public.consent_records (user_id, consent_type, state, document_version_id)
         values (${literal(id)}, 'C-PRINCIPAL', 'concedido', 'teste-v0')`,
      );

      const violacoes = sql(
        `select count(*) from public.consent_invariant_violations
         where user_id = ${literal(id)} and source = ${literal("public." + tabela)}`,
      );
      assert.equal(violacoes, "1", `${tabela} deveria violar o invariante`);

      sql(`delete from public.${tabela} where user_id = ${literal(id)}`);
      sql(`delete from public.consent_records where user_id = ${literal(id)}`);
      sql(`delete from auth.users where id = ${literal(id)}`);
    });
  }

  it("volta a conjunto vazio depois de remover as violações", () => {
    const n = sql("select count(*) from public.consent_invariant_violations");
    assert.equal(n, "0");
  });
});
