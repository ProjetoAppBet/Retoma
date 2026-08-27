/**
 * Testes da Fase 2 — aceite atômico, consentimento obrigatório, C-CONTA.
 *
 * Normativo exercitado: §5.1 (fluxo canônico), §5.4/§17.3 (P-14), §8.2
 * (append-only), §9.2 (invariante), §17.1 (P-27), §17.2 (P-08), §17.6 (P-09).
 *
 * O que estes testes NÃO cobrem, por não existir stack local do Supabase:
 * anonymous sign-in, expiração/refresh de token e signOut são comportamento do
 * Supabase Auth, não do schema. O que é exercitado aqui é tudo o que o banco
 * realmente decide — e é onde P-27 vivia.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  escreverComoUsuario,
  falha,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
  sqlComoUsuario,
  RAIZ,
} from "./support/local-db.mjs";

const VERSAO = "consentimento-principal-v1.0";
const VERSAO_CONTA = "consentimento-conta-v1.0";

/** Identidade sem aceite — o estado logo após o anonymous sign-in (§5.1). */
function criarIdentidadeNua() {
  const id = sql("select gen_random_uuid()");
  sql(`insert into auth.users (id) values (${literal(id)})`);
  return id;
}

/** Chama a função como o próprio usuário, em UMA transação. */
function registrarAceite(userId, versao = VERSAO) {
  return escreverComoUsuario(
    userId,
    `select public.registrar_aceite_principal(${literal(versao)})`,
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("P-08 · documento de consentimento versionado (§17.2)", () => {
  for (const versao of [VERSAO, VERSAO_CONTA]) {
    it(`${versao}: arquivo existe e declara o próprio identificador`, () => {
      const texto = readFileSync(
        `${RAIZ}/docs/consentimento/${versao}.md`,
        "utf8",
      );
      assert.match(
        texto,
        new RegExp(`\\*\\*Identificador de versão:\\*\\* \`${versao}\``),
        "o documento deve declarar o identificador que o nomeia",
      );
    });
  }

  it("o código grava exatamente o identificador do arquivo", () => {
    const fonte = readFileSync(`${RAIZ}/src/lib/consentimento/versao.ts`, "utf8");
    assert.match(fonte, new RegExp(`"${VERSAO}"`));
    assert.match(fonte, new RegExp(`"${VERSAO_CONTA}"`));
  });
});

describe("P-27 · atomicidade de profiles e aceite (§17.1)", () => {
  it("a função existe, é SECURITY INVOKER e não é trigger", () => {
    const f = sql(
      `select p.prosecdef::text || '|' || p.prokind::text
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'registrar_aceite_principal'`,
    );
    assert.equal(f, "false|f", "deve ser SECURITY INVOKER e função normal");

    const triggers = sql(
      `select coalesce(string_agg(tgname, ','), '(nenhum)') from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       where c.relnamespace = 'public'::regnamespace and not t.tgisinternal`,
    );
    assert.equal(triggers, "(nenhum)", "§9.1/§14.3.21: nenhum trigger");
  });

  it("só authenticated executa; anon não", () => {
    const paraAnon = sql(
      `select has_function_privilege('anon',
         'public.registrar_aceite_principal(text)', 'execute')::text`,
    );
    const paraAuth = sql(
      `select has_function_privilege('authenticated',
         'public.registrar_aceite_principal(text)', 'execute')::text`,
    );
    assert.equal(paraAnon, "false");
    assert.equal(paraAuth, "true");
  });

  it("grava profiles e o aceite com o MESMO timestamp", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);

    const iguais = sql(
      `select (p.created_at = c.recorded_at)::text
       from public.profiles p
       join public.consent_records c on c.user_id = p.user_id
       where p.user_id = ${literal(u)}`,
    );
    assert.equal(iguais, "true", "§9.2 admite igualdade; a atomicidade a produz");
  });

  it("o estado resultante não viola o invariante", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    const v = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(u)}`,
    );
    assert.equal(v, "0");
  });

  it("o caminho ingênuo, em duas transações, VIOLA o invariante", () => {
    // Este é o teste que dá sentido ao anterior: sem a função, a ordem de
    // §5.1 executada em duas idas ao banco produz created_at < recorded_at.
    const u = criarIdentidadeNua();
    escreverComoUsuario(
      u,
      `insert into public.profiles (user_id) values (${literal(u)})`,
    );
    escreverComoUsuario(
      u,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id)
       values (${literal(u)}, 'C-PRINCIPAL', 'concedido', ${literal(VERSAO)})`,
    );

    const v = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(u)} and source = 'public.profiles'`,
    );
    assert.equal(v, "1", "duas transações deveriam violar — é o problema P-27");
  });

  it("grava document_version_id exatamente como recebido", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    const gravado = sql(
      `select document_version_id from public.consent_records
       where user_id = ${literal(u)}`,
    );
    assert.equal(gravado, VERSAO);
  });

  it("recusa identificador de versão vazio (§17.2)", () => {
    const u = criarIdentidadeNua();
    const erro = falha(() => registrarAceite(u, "   "));
    assert.ok(erro, "versão vazia deveria falhar");
    assert.match(erro, /identificador de versao/i);
  });

  it("recusa execução sem identidade na sessão", () => {
    const erro = falha(() =>
      sql(`select public.registrar_aceite_principal(${literal(VERSAO)})`),
    );
    assert.ok(erro, "sem auth.uid() deveria falhar");
    assert.match(erro, /sem identidade autenticada/i);
  });

  it("é idempotente quanto a profiles: reaceitar não duplica perfil", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    registrarAceite(u, "consentimento-principal-v1.1");

    assert.equal(
      sql(`select count(*) from public.profiles where user_id = ${literal(u)}`),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from public.consent_records where user_id = ${literal(u)}`,
      ),
      "2",
      "cada aceite é uma linha nova (§8.2)",
    );
  });

  it("não registra aceite em nome de outra identidade", () => {
    // A função lê auth.uid() e ignora qualquer tentativa de indicar outro
    // usuário — não há parâmetro de user_id justamente por isso.
    const a = criarIdentidadeNua();
    const b = criarIdentidadeNua();
    registrarAceite(a);

    assert.equal(
      sql(`select count(*) from public.consent_records where user_id = ${literal(b)}`),
      "0",
      "B não pode ter ganhado aceite",
    );
  });

  it("a RLS continua valendo dentro da função (SECURITY INVOKER)", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    const outro = criarIdentidadeNua();
    const visiveis = sqlComoUsuario(
      outro,
      `select count(*) from public.profiles where user_id = ${literal(u)}`,
    );
    assert.equal(visiveis, "0");
  });
});

describe("consentimento obrigatório e isolamento", () => {
  it("identidade sem aceite é acusada pelo invariante (AA-08)", () => {
    const u = criarIdentidadeNua();
    const v = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(u)} and source = 'auth.users'`,
    );
    assert.equal(v, "1", "§5.4/§17.3: identidade órfã permanece detectável");
    sql(`delete from auth.users where id = ${literal(u)}`);
  });

  it("sem aceite, não há dado de domínio gravável sem violar o invariante", () => {
    const u = criarIdentidadeNua();
    escreverComoUsuario(
      u,
      `insert into public.recovery_goals (user_id, goal_type, information_nature)
       values (${literal(u)}, 'interromper', 'declarado')`,
    );
    const v = sql(
      `select count(*) from public.consent_invariant_violations
       where user_id = ${literal(u)} and source = 'public.recovery_goals'`,
    );
    assert.equal(v, "1");
    sql(`delete from public.recovery_goals where user_id = ${literal(u)}`);
    sql(`delete from auth.users where id = ${literal(u)}`);
  });

  it("um usuário não lê o consentimento de outro", () => {
    const a = criarIdentidadeNua();
    const b = criarIdentidadeNua();
    registrarAceite(a);
    registrarAceite(b);

    const visiveis = sqlComoUsuario(
      a,
      `select count(*) from public.consent_records where user_id = ${literal(b)}`,
    );
    assert.equal(visiveis, "0");
  });
});

describe("P-09 · C-CONTA (§17.6)", () => {
  it("é registrado como consentimento próprio, ao lado do principal", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    escreverComoUsuario(
      u,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id)
       values (${literal(u)}, 'C-CONTA', 'concedido', ${literal(VERSAO_CONTA)})`,
    );

    const tipos = sql(
      `select string_agg(consent_type, ',' order by consent_type)
       from public.consent_records where user_id = ${literal(u)}`,
    );
    assert.equal(tipos, "C-CONTA,C-PRINCIPAL");
  });

  it("a identidade não muda ao converter (§3.4)", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    const antes = sql(
      `select user_id from public.profiles where user_id = ${literal(u)}`,
    );
    escreverComoUsuario(
      u,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id)
       values (${literal(u)}, 'C-CONTA', 'concedido', ${literal(VERSAO_CONTA)})`,
    );
    const depois = sql(
      `select user_id from public.profiles where user_id = ${literal(u)}`,
    );
    assert.equal(depois, antes, "o UUID não muda: nada é migrado");
  });

  it("não registra C-CONTA em nome de outro", () => {
    const a = criarIdentidadeNua();
    const b = criarIdentidadeNua();
    registrarAceite(a);
    const erro = falha(() =>
      escreverComoUsuario(
        a,
        `insert into public.consent_records
           (user_id, consent_type, state, document_version_id)
         values (${literal(b)}, 'C-CONTA', 'concedido', ${literal(VERSAO_CONTA)})`,
      ),
    );
    assert.ok(erro, "RLS deveria recusar");
  });
});

describe("append-only preservado (§8.2)", () => {
  it("consent_records não ganhou política de UPDATE nem DELETE", () => {
    const p = sql(
      `select coalesce(string_agg(policyname, ','), '(nenhuma)')
       from pg_policies where schemaname = 'public'
         and tablename = 'consent_records' and cmd in ('UPDATE','DELETE','ALL')`,
    );
    assert.equal(p, "(nenhuma)");
  });

  it("o usuário não altera nem apaga o próprio aceite", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);

    assert.ok(
      falha(() =>
        escreverComoUsuario(
          u,
          `update public.consent_records set state = 'revogado'
           where user_id = ${literal(u)}`,
        ),
      ),
      "UPDATE deveria falhar",
    );
    assert.ok(
      falha(() =>
        escreverComoUsuario(
          u,
          `delete from public.consent_records where user_id = ${literal(u)}`,
        ),
      ),
      "DELETE deveria falhar",
    );
    assert.equal(
      sql(
        `select count(*) from public.consent_records where user_id = ${literal(u)}`,
      ),
      "1",
    );
  });

  it("revogar é linha nova, e o estado corrente é a mais recente", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    escreverComoUsuario(
      u,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id, recorded_at)
       values (${literal(u)}, 'C-PRINCIPAL', 'revogado', ${literal(VERSAO)},
               now() + interval '1 minute')`,
    );

    const corrente = sql(
      `select state from public.consent_records
       where user_id = ${literal(u)} and consent_type = 'C-PRINCIPAL'
       order by recorded_at desc, id desc limit 1`,
    );
    assert.equal(corrente, "revogado");
    assert.equal(
      sql(
        `select count(*) from public.consent_records where user_id = ${literal(u)}`,
      ),
      "2",
      "a concessão anterior permanece",
    );
  });
});

describe("P-14 · falha do aceite não deixa acesso utilizável (§17.3)", () => {
  it("o erro de signOut não é ignorado", () => {
    const fonte = readFileSync(`${RAIZ}/src/app/aceite/acoes.ts`, "utf8");
    assert.match(
      fonte,
      /const \{ error: erroSaida \} = await supabase\.auth\.signOut\(\)/,
      "signOut deve ter o retorno capturado",
    );
    assert.match(
      fonte,
      /if \(erroSaida\)[\s\S]{0,400}descartarCookiesDeSessao\(\)/,
      "falha de signOut deve derrubar a sessão local",
    );
    assert.doesNotMatch(
      fonte,
      /^\s*await supabase\.auth\.signOut\(\);\s*$/m,
      "nenhuma chamada a signOut pode descartar o retorno",
    );
  });

  it("a aplicação não usa credencial administrativa", () => {
    for (const arquivo of ["src/app/aceite/acoes.ts", "src/lib/auth/sessao.ts"]) {
      const fonte = readFileSync(`${RAIZ}/${arquivo}`, "utf8");
      assert.doesNotMatch(fonte, /service_role|SERVICE_ROLE/);
    }
  });

  it("a porta é o aceite concedido, não a existência de sessão", () => {
    // Reproduz a consulta de possuiAceitePrincipal: com sessão viva e sem
    // C-PRINCIPAL concedido, o estado corrente não autoriza nada.
    const u = criarIdentidadeNua();
    const corrente = sqlComoUsuario(
      u,
      `select coalesce((select state from public.consent_records
         where consent_type = 'C-PRINCIPAL'
         order by recorded_at desc, id desc limit 1), '(nenhum)')`,
    );
    assert.equal(corrente, "(nenhum)", "sem aceite, nada é concedido");
    sql(`delete from auth.users where id = ${literal(u)}`);
  });

  it("aceite revogado fecha o acesso de novo", () => {
    const u = criarIdentidadeNua();
    registrarAceite(u);
    escreverComoUsuario(
      u,
      `insert into public.consent_records
         (user_id, consent_type, state, document_version_id, recorded_at)
       values (${literal(u)}, 'C-PRINCIPAL', 'revogado', ${literal(VERSAO)},
               now() + interval '1 minute')`,
    );
    const corrente = sqlComoUsuario(
      u,
      `select state from public.consent_records
       where consent_type = 'C-PRINCIPAL'
       order by recorded_at desc, id desc limit 1`,
    );
    assert.notEqual(corrente, "concedido");
  });
});

describe("consentimentos · afirmações e lacunas", () => {
  for (const versao of [VERSAO, VERSAO_CONTA]) {
    const texto = () =>
      readFileSync(`${RAIZ}/docs/consentimento/${versao}.md`, "utf8");

    /**
     * Corpo apresentado ao usuário, sem as linhas de citação. As notas em `>`
     * são metadados normativos — procedência, imutabilidade, lacuna P-04 — e
     * dizem justamente o que NÃO foi afirmado. Avaliá-las como se fossem texto
     * de aceite confunde a nota com a afirmação.
     */
    const corpo = () =>
      texto()
        .split("\n")
        .filter((l) => !l.trimStart().startsWith(">"))
        .join("\n");

    it(`${versao}: não promete duração de sessão enquanto P-15 não estiver configurado`, () => {
      assert.doesNotMatch(
        corpo(),
        /\b\d+\s*dias?\b/i,
        "afirmar duração de sessão sem a configuração aplicada seria falso",
      );
    });

    it(`${versao}: registra a lacuna P-04 explicitamente`, () => {
      assert.match(texto(), /P-04/);
    });

    it(`${versao}: não inventa controlador, retenção nem obrigação jurídica`, () => {
      assert.doesNotMatch(
        corpo(),
        /base legal|leg[ií]timo interesse|LGPD|controlador|operador|titular dos dados/i,
      );
    });
  }

  it("o aceite principal não contradiz §4.6 sobre os registros", () => {
    const texto = readFileSync(
      `${RAIZ}/docs/consentimento/${VERSAO}.md`,
      "utf8",
    );
    assert.match(
      texto,
      /registro de que você aceitou[\s\S]{0,120}continua guardado/i,
      "§4.6: os registros de aceite sobrevivem ao encerramento",
    );
  });
});
