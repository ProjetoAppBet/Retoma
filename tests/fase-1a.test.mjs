/**
 * Testes da Fase 1A — isolamento por RLS e invariante de consentimento.
 *
 * Critérios de aceite exercitados: AA-08, AA-09, AA-16, AA-19, AA-20,
 * AA-21, AA-22, AA-23, AA-24, AA-26, AA-30.
 *
 * A RLS é aplicada pelo próprio PostgreSQL. Cada operação de usuário roda
 * no papel `authenticated` com a claim `sub` correspondente, que é o que
 * auth.uid() lê — ver tests/support/local-db.mjs.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  criarUsuarioComAceite,
  escreverComoUsuario,
  falha,
  listarMigracoes,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  sqlComoAnon,
  sqlComoUsuario,
} from "./support/local-db.mjs";

let usuarioA;
let usuarioB;

before(() => {
  // Reproduz o schema do zero a cada execução: cluster novo, shim, e as
  // migrations versionadas na ordem (AA-30).
  recriarBanco();
  usuarioA = criarUsuarioComAceite();
  usuarioB = criarUsuarioComAceite();
});

after(() => {
  pararSeRodando();
});

describe("migrations reproduzem o schema do zero", () => {
  it("aplica todas as migrations versionadas", () => {
    assert.ok(listarMigracoes().length > 0, "nenhuma migration encontrada");
  });

  it("cria o núcleo mínimo da Fase 1A (AA-26)", () => {
    // Este arquivo afirma o núcleo da Fase 1A. O recenseamento exato do
    // schema pertence à fase mais recente — ver tests/fase-1b.test.mjs,
    // "cria exatamente as três entidades, e nada além".
    const tabelas = sql(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
         and table_name in ('profiles', 'consent_records')
       order by table_name`,
    )
      .split("\n")
      .filter(Boolean);
    assert.deepEqual(tabelas, ["consent_records", "profiles"]);
  });

  it("não cria public.users — a identidade é auth.users (D-01, AA-01)", () => {
    const existe = sql(
      `select count(*) from information_schema.tables
       where table_schema = 'public' and table_name = 'users'`,
    );
    assert.equal(existe, "0", "public.users duplicaria a identidade");
  });

  it("não usa owner_id, account_id nem profile_id (AA-03)", () => {
    const proibidas = sql(
      `select count(*) from information_schema.columns
       where table_schema = 'public'
         and column_name in ('owner_id', 'account_id', 'profile_id')`,
    );
    assert.equal(proibidas, "0");
  });

  it("referencia auth.users(id) por user_id (AA-02)", () => {
    // Propriedade durável, e não uma lista fixa de tabelas: toda referência
    // de public ao schema auth precisa ser user_id -> auth.users.id. Assim a
    // afirmação continua valendo — e continua tendo dentes — a cada fase nova.
    const desviantes = sql(
      `select coalesce(string_agg(
                tc.table_name || '.' || kcu.column_name || ' -> ' ||
                ccu.table_schema || '.' || ccu.table_name || '.' ||
                ccu.column_name, ', ' order by tc.table_name), '(nenhuma)')
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'public'
         and ccu.table_schema = 'auth'
         and (kcu.column_name <> 'user_id'
              or ccu.table_name <> 'users'
              or ccu.column_name <> 'id')`,
    );
    assert.equal(desviantes, "(nenhuma)");

    // E o núcleo da Fase 1A de fato tem essa referência.
    const nucleo = sql(
      `select count(*)
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'public'
         and tc.table_name in ('profiles', 'consent_records')
         and kcu.column_name = 'user_id'
         and ccu.table_schema = 'auth' and ccu.table_name = 'users'`,
    );
    assert.equal(nucleo, "2");
  });
});

describe("RLS habilitada e políticas corretas", () => {
  it("RLS está habilitada nas duas tabelas (AA-20)", () => {
    const semRls = sql(
      `select count(*) from pg_tables
       where schemaname = 'public' and rowsecurity = false`,
    );
    assert.equal(semRls, "0");
  });

  it("não existe política de UPDATE nem de DELETE em consent_records (AA-16)", () => {
    const politicas = sql(
      `select cmd from pg_policies
       where schemaname = 'public' and tablename = 'consent_records'
       order by cmd`,
    )
      .split("\n")
      .filter(Boolean);
    assert.deepEqual(politicas, ["INSERT", "SELECT"]);
  });

  it("as políticas se aplicam ao papel authenticated (AA-23)", () => {
    const papeis = sql(
      `select distinct unnest(roles)::text from pg_policies
       where schemaname = 'public' order by 1`,
    )
      .split("\n")
      .filter(Boolean);
    assert.deepEqual(papeis, ["authenticated"]);
  });

  it("nenhuma política depende de is_anonymous (§3.6)", () => {
    const usa = sql(
      `select count(*) from pg_policies
       where schemaname = 'public'
         and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_anonymous%'`,
    );
    assert.equal(usa, "0");
  });
});

/**
 * RLS não é submetida a TRUNCATE. No Supabase, toda tabela em public nasce
 * com o conjunto completo de privilégios para anon e authenticated, e o
 * shim de teste reproduz essa postura. Estes testes falham se a migration
 * deixar de revogar o excedente.
 */
describe("postura de privilégios (append-only real no ambiente-alvo)", () => {
  const sensiveis = ["profiles", "consent_records"];

  it("anon não tem privilégio algum nas tabelas sensíveis", () => {
    for (const tabela of sensiveis) {
      const privs = sql(
        `select coalesce(string_agg(privilege_type, ','), '(nenhum)')
         from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'anon'
           and table_name = ${literal(tabela)}`,
      );
      assert.equal(privs, "(nenhum)", `anon retém privilégios em ${tabela}`);
    }
  });

  it("authenticated tem exatamente SELECT e INSERT", () => {
    for (const tabela of sensiveis) {
      const privs = sql(
        `select coalesce(string_agg(privilege_type, ',' order by privilege_type), '(nenhum)')
         from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'authenticated'
           and table_name = ${literal(tabela)}`,
      );
      assert.equal(privs, "INSERT,SELECT", `privilégios inesperados em ${tabela}`);
    }
  });

  it("nem anon nem authenticated detêm TRUNCATE", () => {
    const comTruncate = sql(
      `select coalesce(string_agg(grantee || ':' || table_name, ', '), '(nenhum)')
       from information_schema.role_table_grants
       where table_schema = 'public'
         and privilege_type = 'TRUNCATE'
         and grantee in ('anon', 'authenticated')`,
    );
    assert.equal(comTruncate, "(nenhum)");
  });

  it("authenticated não consegue truncar as tabelas sensíveis", () => {
    for (const tabela of sensiveis) {
      const erro = falha(() =>
        sqlComoUsuario(usuarioA, `truncate public.${tabela}`),
      );
      assert.ok(erro, `TRUNCATE de ${tabela} por authenticated deveria falhar`);
      assert.match(erro, /permission denied/i);
    }
  });

  it("anon não consegue truncar as tabelas sensíveis", () => {
    for (const tabela of sensiveis) {
      const erro = falha(() => sqlComoAnon(`truncate public.${tabela}`));
      assert.ok(erro, `TRUNCATE de ${tabela} por anon deveria falhar`);
      assert.match(erro, /permission denied/i);
    }
  });

  it("anon não lê nem escreve nas tabelas sensíveis", () => {
    for (const tabela of sensiveis) {
      const leitura = falha(() =>
        sqlComoAnon(`select count(*) from public.${tabela}`),
      );
      assert.ok(leitura, `anon não deveria conseguir ler ${tabela}`);
    }
  });

  it("a view de invariante não é acessível a anon nem a authenticated", () => {
    const privs = sql(
      `select coalesce(string_agg(grantee, ','), '(nenhum)')
       from information_schema.role_table_grants
       where table_schema = 'public'
         and table_name = 'consent_invariant_violations'
         and grantee in ('anon', 'authenticated')`,
    );
    assert.equal(privs, "(nenhum)");
  });

  it("as linhas sobrevivem às tentativas de truncate", () => {
    const profiles = sql("select count(*) from public.profiles");
    const consentimentos = sql("select count(*) from public.consent_records");
    assert.notEqual(profiles, "0", "profiles não pode ter sido esvaziada");
    assert.notEqual(consentimentos, "0", "consent_records não pode ter sido esvaziada");
  });
});

describe("isolamento entre usuários (AA-21, AA-24)", () => {
  it("o usuário lê o próprio profile", () => {
    const n = sqlComoUsuario(usuarioA, "select count(*) from public.profiles");
    assert.equal(n, "1");
  });

  it("o usuário A não lê o profile do usuário B", () => {
    const n = sqlComoUsuario(
      usuarioA,
      `select count(*) from public.profiles where user_id = ${literal(usuarioB)}`,
    );
    assert.equal(n, "0");
  });

  it("o usuário A não cria linha em nome do usuário B", () => {
    const erro = falha(() =>
      escreverComoUsuario(
        usuarioA,
        `insert into public.consent_records (user_id, consent_type, state, document_version_id)
         values (${literal(usuarioB)}, 'C-PRINCIPAL', 'concedido', 'forjado')`,
      ),
    );
    assert.ok(erro, "insert em nome de outro usuário deveria falhar");

    const doB = sql(
      `select count(*) from public.consent_records
       where user_id = ${literal(usuarioB)} and document_version_id = 'forjado'`,
    );
    assert.equal(doB, "0");
  });

  it("o usuário A não apaga o profile do usuário B", () => {
    falha(() =>
      escreverComoUsuario(
        usuarioA,
        `delete from public.profiles where user_id = ${literal(usuarioB)}`,
      ),
    );
    const aindaExiste = sql(
      `select count(*) from public.profiles where user_id = ${literal(usuarioB)}`,
    );
    assert.equal(aindaExiste, "1", "o profile de B não pode ser removido por A");
  });
});

describe("consentimento: leitura, imutabilidade e append-only", () => {
  it("o usuário lê o próprio consentimento", () => {
    const n = sqlComoUsuario(
      usuarioA,
      "select count(*) from public.consent_records where consent_type = 'C-PRINCIPAL'",
    );
    assert.equal(n, "1");
  });

  it("o usuário A não lê o consentimento do usuário B (AA-22)", () => {
    const n = sqlComoUsuario(
      usuarioA,
      `select count(*) from public.consent_records where user_id = ${literal(usuarioB)}`,
    );
    assert.equal(n, "0");
  });

  it("o usuário não altera o próprio consentimento (AA-16)", () => {
    falha(() =>
      escreverComoUsuario(
        usuarioA,
        `update public.consent_records set state = 'revogado'
         where user_id = ${literal(usuarioA)}`,
      ),
    );
    const estado = sql(
      `select state from public.consent_records where user_id = ${literal(usuarioA)}`,
    );
    assert.equal(estado, "concedido", "o registro de consentimento é imutável");
  });

  it("o usuário não exclui o próprio consentimento (AA-16)", () => {
    falha(() =>
      escreverComoUsuario(
        usuarioA,
        `delete from public.consent_records where user_id = ${literal(usuarioA)}`,
      ),
    );
    const n = sql(
      `select count(*) from public.consent_records where user_id = ${literal(usuarioA)}`,
    );
    assert.equal(n, "1", "o registro de consentimento não pode ser apagado");
  });

  it("revogação cria novo registro e preserva o anterior (AA-15)", () => {
    const anterior = sql(
      `select id from public.consent_records
       where user_id = ${literal(usuarioA)} and state = 'concedido'`,
    );
    escreverComoUsuario(
      usuarioA,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id, previous_consent_id)
       values (${literal(usuarioA)}, 'C-PRINCIPAL', 'revogado', 'teste-v0', ${literal(anterior)})`,
    );

    const total = sql(
      `select count(*) from public.consent_records where user_id = ${literal(usuarioA)}`,
    );
    assert.equal(total, "2", "a revogação deve gerar novo registro");

    const original = sql(
      `select state from public.consent_records where id = ${literal(anterior)}`,
    );
    assert.equal(original, "concedido", "o registro anterior permanece inalterado");
  });

  it("o tipo de consentimento é restrito ao domínio definido em §4.3", () => {
    const erro = falha(() =>
      sql(
        `insert into public.consent_records (user_id, consent_type, state, document_version_id)
         values (${literal(usuarioB)}, 'C-INVENTADO', 'concedido', 'teste-v0')`,
      ),
    );
    assert.ok(erro, "tipo fora do domínio deveria ser rejeitado");
  });

  it("o estado é restrito a concedido/revogado", () => {
    const erro = falha(() =>
      sql(
        `insert into public.consent_records (user_id, consent_type, state, document_version_id)
         values (${literal(usuarioB)}, 'C-PRINCIPAL', 'talvez', 'teste-v0')`,
      ),
    );
    assert.ok(erro, "estado fora do domínio deveria ser rejeitado");
  });
});

describe("invariante de consentimento (AA-08, AA-09, AA-19)", () => {
  it("a consulta de invariante retorna conjunto vazio no estado íntegro", () => {
    const n = sql("select count(*) from public.consent_invariant_violations");
    assert.equal(n, "0");
  });

  it("detecta identidade sem aceite principal (AA-08)", () => {
    const orfao = sql("select gen_random_uuid()");
    sql(`insert into auth.users (id) values (${literal(orfao)})`);

    const violacoes = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(orfao)}`,
    );
    assert.equal(violacoes, "1", "identidade sem aceite deve violar o invariante");

    sql(`delete from auth.users where id = ${literal(orfao)}`);
  });

  it("detecta linha de dados de usuário anterior ao aceite (AA-09)", () => {
    const id = sql("select gen_random_uuid()");
    sql(`insert into auth.users (id) values (${literal(id)})`);
    // profile gravado ANTES do aceite: viola a ordem exigida por §9.2.
    sql(
      `insert into public.profiles (user_id, created_at)
       values (${literal(id)}, now() - interval '1 hour')`,
    );
    sql(
      `insert into public.consent_records (user_id, consent_type, state, document_version_id)
       values (${literal(id)}, 'C-PRINCIPAL', 'concedido', 'teste-v0')`,
    );

    const violacoes = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(id)} and source = 'public.profiles'`,
    );
    assert.equal(violacoes, "1", "profile anterior ao aceite deve violar o invariante");

    sql(`delete from public.profiles where user_id = ${literal(id)}`);
    sql(`delete from public.consent_records where user_id = ${literal(id)}`);
    sql(`delete from auth.users where id = ${literal(id)}`);
  });

  it("volta a conjunto vazio depois de remover as violações", () => {
    const n = sql("select count(*) from public.consent_invariant_violations");
    assert.equal(n, "0");
  });
});
