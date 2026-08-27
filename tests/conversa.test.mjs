/**
 * Testes da CONVERSA — a fundação persistente, sem IA.
 *
 * O que esta rodada criou: `conversations` e `messages`, com RLS, chave
 * composta e invariante estendido (§20 E-07, §21 E-08).
 *
 * O que ela deliberadamente NÃO criou, e é o que os testes mais guardam:
 * memória, padrões, coluna de risco, coluna de retenção e qualquer chamada
 * a provedor de IA. §20.4 e §21.6.
 *
 * Normativo: §7.1, §7.2, §7.3, §9.2, §9.3.1, §12.1, §12.2, §12.5, §14.3.23,
 * §14.4.25, §14.4.30, §20, §21, Op. §15.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  criarUsuarioComAceite,
  escreverComoUsuario,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  sqlComoAnon,
  sqlComoUsuario,
  RAIZ,
} from "./support/local-db.mjs";

const ACOES = "src/app/conversa/acoes.ts";
const LEITURA = "src/lib/conversa/mensagens.ts";
const PAGINA = "src/app/conversa/page.tsx";
const ESCREVER = "src/app/conversa/escrever.tsx";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** O que `enviarMensagem` faz: cria o fio se não houver, depois insere. */
function abrirConversa(userId) {
  const id = sql("select gen_random_uuid()");
  escreverComoUsuario(
    userId,
    `insert into public.conversations (id, user_id)
     values (${literal(id)}, ${literal(userId)})`,
  );
  return id;
}

function enviar(userId, conversaId, texto, autor = "usuário") {
  return escreverComoUsuario(
    userId,
    `insert into public.messages (user_id, conversation_id, author, content)
     values (${literal(userId)}, ${literal(conversaId)},
             ${literal(autor)}, ${literal(texto)})`,
  );
}

function mensagensDe(conversaId) {
  return sql(
    `select coalesce(string_agg(author || ': ' || content, ' | '
             order by created_at, id), '(nenhuma)')
     from public.messages where conversation_id = ${literal(conversaId)}`,
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("CONVERSA · criação e leitura", () => {
  it("a conversa nasce vazia e recebe mensagens em ordem", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);
    assert.equal(mensagensDe(c), "(nenhuma)");

    enviar(u, c, "primeira");
    enviar(u, c, "segunda");
    enviar(u, c, "terceira");

    assert.equal(
      mensagensDe(c),
      "usuário: primeira | usuário: segunda | usuário: terceira",
    );
  });

  it("§21.4: mensagens da MESMA transação não empatam em created_at", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);

    // Sem clock_timestamp() as duas receberiam o horário da transação e a
    // ordem do diálogo passaria a depender de uuid v4, que é aleatório.
    escreverComoUsuario(
      u,
      `insert into public.messages (user_id, conversation_id, author, content)
       values (${literal(u)}, ${literal(c)}, 'usuário', 'pergunta'),
              (${literal(u)}, ${literal(c)}, 'ia', 'resposta')`,
    );
    assert.equal(
      sql(
        `select count(distinct created_at) from public.messages
         where conversation_id = ${literal(c)}`,
      ),
      "2",
      "instantes distintos, ordem determinística",
    );
    assert.equal(mensagensDe(c), "usuário: pergunta | ia: resposta");
  });

  it("mensagem vazia é recusada pelo CHECK", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);
    for (const vazio of ["", "   ", "\n\t"]) {
      assert.ok(falha(() => enviar(u, c, vazio)), `"${vazio}" passou`);
    }
    assert.equal(mensagensDe(c), "(nenhuma)");
  });

  it("`author` tem domínio fechado (§21.2)", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);
    for (const invalido of ["usuario", "USUÁRIO", "sistema", "assistant"]) {
      assert.ok(falha(() => enviar(u, c, "x", invalido)), `${invalido} passou`);
    }
    // Os dois valores do domínio são aceitos pelo schema.
    enviar(u, c, "a", "usuário");
    enviar(u, c, "b", "ia");
    assert.equal(mensagensDe(c), "usuário: a | ia: b");
  });
});

describe("CONVERSA · isolamento entre identidades", () => {
  it("A não lê conversa nem mensagem de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const cB = abrirConversa(b);
    enviar(b, cB, "só de B");

    assert.equal(
      escreverComoUsuario(a, "select count(*) from public.conversations"),
      "0",
    );
    assert.equal(
      escreverComoUsuario(a, "select count(*) from public.messages"),
      "0",
    );
    assert.equal(
      escreverComoUsuario(b, "select count(*) from public.messages"),
      "1",
    );
  });

  it("A não pendura mensagem no fio de B (chave composta)", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const cB = abrirConversa(b);

    // Linha própria, conversa alheia: a política de escrita confere o
    // user_id e deixaria passar. Quem barra é a chave composta.
    const erro = falha(() => enviar(a, cB, "invadindo"));
    assert.ok(erro, "mensagem entrou em fio alheio");
    assert.match(erro, /violates foreign key constraint/i);
    assert.equal(mensagensDe(cB), "(nenhuma)");
  });

  it("A não grava mensagem com o user_id de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const cB = abrirConversa(b);

    const erro = falha(() =>
      escreverComoUsuario(
        a,
        `insert into public.messages (user_id, conversation_id, author, content)
         values (${literal(b)}, ${literal(cB)}, 'usuário', 'forjada')`,
      ),
    );
    assert.ok(erro, "forjou identidade");
    assert.match(erro, /row-level security/i);
  });

  it("A não cria conversa em nome de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const erro = falha(() =>
      escreverComoUsuario(
        a,
        `insert into public.conversations (user_id) values (${literal(b)})`,
      ),
    );
    assert.ok(erro);
    assert.match(erro, /row-level security/i);
  });

  it("a chave composta aponta para (user_id, id) de conversations", () => {
    const def = sql(
      `select pg_get_constraintdef(oid) from pg_constraint
       where conrelid = 'public.messages'::regclass and contype = 'f'
         and conname = 'messages_conversation_fkey'`,
    );
    assert.match(def, /FOREIGN KEY \(user_id, conversation_id\)/);
    assert.match(def, /REFERENCES conversations\(user_id, id\)/);
  });
});

describe("CONVERSA · sessão, RLS e privilégios", () => {
  it("sem sessão não se escreve nada", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);

    for (const comando of [
      `insert into public.conversations (user_id) values (${literal(u)})`,
      `insert into public.messages (user_id, conversation_id, author, content)
       values (${literal(u)}, ${literal(c)}, 'usuário', 'anônima')`,
    ]) {
      assert.ok(falha(() => sqlComoAnon(comando)), "anon escreveu");
    }
    assert.equal(mensagensDe(c), "(nenhuma)");
  });

  it("anon não tem privilégio algum nas duas tabelas", () => {
    for (const tabela of ["conversations", "messages"]) {
      assert.equal(
        sql(
          `select coalesce(string_agg(privilege_type, ','), '(nenhum)')
           from information_schema.role_table_grants
           where table_schema = 'public' and grantee = 'anon'
             and table_name = ${literal(tabela)}`,
        ),
        "(nenhum)",
      );
      assert.ok(
        falha(() => sqlComoAnon(`truncate public.${tabela}`)),
        `anon truncou ${tabela}`,
      );
    }
  });

  it("authenticated tem exatamente SELECT e INSERT", () => {
    for (const tabela of ["conversations", "messages"]) {
      assert.equal(
        sql(
          `select coalesce(string_agg(privilege_type, ',' order by privilege_type), '(nenhum)')
           from information_schema.role_table_grants
           where table_schema = 'public' and grantee = 'authenticated'
             and table_name = ${literal(tabela)}`,
        ),
        "INSERT,SELECT",
      );
      for (const privilegio of ["update", "delete", "truncate"]) {
        assert.equal(
          sql(
            `select has_table_privilege('authenticated','public.${tabela}','${privilegio}')::text`,
          ),
          "false",
          `authenticated pode ${privilegio} em ${tabela}`,
        );
      }
    }
  });

  it("RLS habilitada, sem política de UPDATE ou DELETE", () => {
    for (const tabela of ["conversations", "messages"]) {
      assert.equal(
        sql(
          `select relrowsecurity::text from pg_class
           where relnamespace = 'public'::regnamespace and relname = ${literal(tabela)}`,
        ),
        "true",
      );
    }
    assert.equal(
      sql(
        `select coalesce(string_agg(distinct tablename || ':' || cmd, ', '), '(nenhuma)')
         from pg_policies
         where schemaname = 'public' and cmd in ('UPDATE', 'DELETE')`,
      ),
      "(nenhuma)",
    );
  });

  it("usuário não altera nem apaga a própria mensagem", () => {
    const u = criarUsuarioComAceite();
    const c = abrirConversa(u);
    enviar(u, c, "dita");

    assert.ok(
      falha(() =>
        sqlComoUsuario(u, `update public.messages set content = 'outra'`),
      ),
    );
    assert.ok(falha(() => sqlComoUsuario(u, "delete from public.messages")));
    assert.equal(mensagensDe(c), "usuário: dita");
  });

  it("§7.1/§7.2: user_id aponta para auth.users, e não há nome proibido", () => {
    for (const tabela of ["conversations", "messages"]) {
      const fk = sql(
        `select confrelid::regclass::text || '.' ||
                (select attname from pg_attribute
                  where attrelid = c.confrelid and attnum = c.confkey[1])
         from pg_constraint c
         where c.conrelid = ${literal("public." + tabela)}::regclass
           and c.contype = 'f' and array_length(c.conkey, 1) = 1
           and (select attname from pg_attribute
                 where attrelid = c.conrelid and attnum = c.conkey[1]) = 'user_id'`,
      );
      assert.equal(fk, "auth.users.id");
    }
    assert.equal(
      sql(
        `select count(*) from information_schema.columns
         where table_schema = 'public'
           and table_name in ('conversations','messages')
           and column_name in ('owner_id','account_id','profile_id')`,
      ),
      "0",
    );
  });
});

describe("CONVERSA · §9.2 invariante do consentimento", () => {
  it("a consulta de invariante cobre as duas tabelas novas (§20.3.3)", () => {
    const definicao = sql(
      `select pg_get_viewdef('public.consent_invariant_violations'::regclass)`,
    );
    assert.match(definicao, /public\.conversations/);
    assert.match(definicao, /public\.messages/);
  });

  it("mensagem gravada antes do aceite é acusada", () => {
    const u = sql("select gen_random_uuid()");
    sql(`insert into auth.users (id) values (${literal(u)})`);
    const c = sql("select gen_random_uuid()");
    sql(
      `insert into public.conversations (id, user_id) values (${literal(c)}, ${literal(u)})`,
    );
    sql(
      `insert into public.messages (user_id, conversation_id, author, content)
       values (${literal(u)}, ${literal(c)}, 'usuário', 'antes do aceite')`,
    );

    assert.equal(
      sql(
        `select count(*) from public.consent_invariant_violations
         where user_id = ${literal(u)}
           and source in ('public.conversations','public.messages')`),
      "2",
      "§12.1: nenhum dado de usuário antes do aceite",
    );

    sql(`delete from public.messages where user_id = ${literal(u)}`);
    sql(`delete from public.conversations where user_id = ${literal(u)}`);
    sql(`delete from auth.users where id = ${literal(u)}`);
  });

  it("no estado corrente o invariante é conjunto vazio", () => {
    assert.equal(sql("select count(*) from public.consent_invariant_violations"), "0");
  });
});

describe("CONVERSA · o que NÃO foi criado (§20.4, §21.6)", () => {
  it("nenhuma entidade de memória, padrões, risco ou check-in", () => {
    assert.equal(
      sql(
        `select string_agg(tablename, ',' order by tablename)
         from pg_tables where schemaname = 'public'`,
      ),
      "commitments,consent_records,conversations,gambling_history,messages,profiles,recovery_goals",
      "exatamente o núcleo mínimo mais as DUAS entidades de §20.2",
    );
  });

  it("nenhuma coluna de memória, risco, retenção ou provedor", () => {
    const suspeitas = sql(
      `select coalesce(string_agg(table_name || '.' || column_name, ', '), '(nenhuma)')
       from information_schema.columns
       where table_schema = 'public'
         and table_name in ('conversations','messages')
         and (column_name like '%memor%'   or column_name like '%pattern%'
           or column_name like '%padr%'    or column_name like '%risk%'
           or column_name like '%risco%'   or column_name like '%crise%'
           or column_name like '%retent%'  or column_name like '%expire%'
           or column_name like '%expur%'   or column_name like '%model%'
           or column_name like '%provider%' or column_name like '%token%'
           or column_name like '%summar%'  or column_name like '%resumo%'
           or column_name like '%confian%' or column_name like '%score%')`,
    );
    assert.equal(suspeitas, "(nenhuma)");
  });

  it("as colunas são exatamente o mínimo de §21.1", () => {
    assert.equal(
      sql(
        `select string_agg(column_name, ',' order by column_name)
         from information_schema.columns
         where table_schema = 'public' and table_name = 'conversations'`,
      ),
      "created_at,id,user_id",
    );
    assert.equal(
      sql(
        `select string_agg(column_name, ',' order by column_name)
         from information_schema.columns
         where table_schema = 'public' and table_name = 'messages'`,
      ),
      "author,content,conversation_id,created_at,id,user_id",
    );
  });

  it("§21.3: mensagem não carrega natureza da informação", () => {
    assert.equal(
      sql(
        `select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'messages'
           and column_name = 'information_nature'`,
      ),
      "0",
      "mensagem é conteúdo bruto, não fato classificado",
    );
  });

  it("nenhum trigger foi criado", () => {
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

describe("CONVERSA · nenhuma IA (§14.4.30, D-04/P-07)", () => {
  const FONTES = [ACOES, LEITURA, PAGINA, ESCREVER];

  it("nenhuma chamada de rede a provedor algum", () => {
    for (const arquivo of FONTES) {
      const fonte = codigo(arquivo);
      for (const padrao of [
        /\bfetch\(/, /XMLHttpRequest/, /axios/, /https?:\/\//,
        /openai/i, /anthropic/i, /gemini/i, /\bllm\b/i, /completion/i,
        /streamText/i, /generateText/i,
      ]) {
        assert.doesNotMatch(fonte, padrao, `${arquivo}: ${padrao}`);
      }
    }
  });

  it("nenhuma dependência de provedor de IA no package.json", () => {
    const pkg = JSON.parse(readFileSync(`${RAIZ}/package.json`, "utf8"));
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }).join(" ");
    for (const termo of ["openai", "anthropic", "@ai-sdk", "langchain", "gemini"]) {
      assert.ok(!deps.includes(termo), `dependência de IA: ${termo}`);
    }
  });

  it("nenhum caminho da aplicação grava mensagem de `ia`", () => {
    for (const arquivo of FONTES) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(
        fonte,
        /author:\s*["']ia["']/,
        `${arquivo} produz mensagem de IA`,
      );
    }
    assert.match(codigo(ACOES), /AUTOR_USUARIO = "usuário"/);
  });

  it("a tela não simula resposta nem indicador de digitação", () => {
    const fonte = codigo(PAGINA) + codigo(ESCREVER);
    for (const padrao of [/digitando/i, /pensando/i, /aguarde a resposta/i]) {
      assert.doesNotMatch(fonte, padrao);
    }
    // E diz, em texto, que ninguém responde — deixar a pessoa esperar em
    // silêncio seria enganá-la.
    assert.match(codigo(PAGINA), /ninguém\s+responde/);
  });

  it("nada é derivado da conversa: sem resumo, rótulo ou fato extraído", () => {
    for (const arquivo of FONTES) {
      const fonte = codigo(arquivo).toLowerCase();
      for (const termo of ["resumo", "summar", "classific", "inferir", "padrão detect"]) {
        assert.ok(!fonte.includes(termo), `${arquivo} deriva: ${termo}`);
      }
    }
  });
});

describe("CONVERSA · caminho de escrita da aplicação", () => {
  it("a ação exige aceite antes de qualquer escrita", () => {
    const fonte = codigo(ACOES);
    const porta = fonte.indexOf("await exigirAceite()");
    const escrita = fonte.indexOf(".insert(");
    assert.ok(porta > -1 && escrita > porta, "porta depois da escrita");
  });

  it("a leitura não escreve: renderizar não cria conversa", () => {
    const fonte = codigo(LEITURA);
    assert.doesNotMatch(fonte, /\.(insert|update|delete|upsert|rpc)\(/);
    assert.doesNotMatch(fonte, /"use server"/);
  });

  it("a leitura não filtra por user_id — é a RLS que protege", () => {
    assert.doesNotMatch(codigo(LEITURA), /\.eq\("user_id"/);
  });

  it("a interface trava o envio duplo em duas camadas", () => {
    const fonte = codigo(ESCREVER);
    assert.match(fonte, /useRef\(false\)/);
    assert.match(fonte, /if \(enviando\.current\) return;/);
    assert.match(fonte, /disabled=\{pendente\}/);
  });

  it("a tela é revalidada depois de enviar", () => {
    assert.match(codigo(ACOES), /revalidatePath\("\/conversa"\)/);
  });
});
