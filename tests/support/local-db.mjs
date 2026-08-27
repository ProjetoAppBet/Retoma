/**
 * Cluster PostgreSQL local e efêmero para os testes da Fase 1A.
 *
 * Por que local e não o projeto Supabase remoto: existe um único projeto
 * Supabase, sem ambiente de staging. Rodar os testes contra ele criaria
 * identidades reais em auth.users do mesmo projeto que atende produção.
 *
 * Por que PostgreSQL nativo e não `supabase start`: neste ambiente o
 * daemon Docker sobe, mas o download de blobs de imagem é bloqueado pelo
 * proxy (403), então a stack local do Supabase não pode ser baixada.
 *
 * O que isto realmente exercita: a RLS é aplicada pelo próprio PostgreSQL,
 * com `set local role authenticated` e `request.jwt.claims` reais. As
 * políticas testadas são exatamente as das migrations versionadas. O que
 * NÃO é exercitado aqui é o Supabase Auth em si — ver o shim em
 * tests/support/supabase-auth-shim.sql.
 */

import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ = resolve(AQUI, "..", "..");
const MIGRACOES = join(RAIZ, "supabase", "migrations");
const SHIM = join(AQUI, "supabase-auth-shim.sql");

const BIN = "/usr/lib/postgresql/16/bin";
const BASE = "/var/tmp/retoma-testdb";
const DATA = join(BASE, "data");
const PORTA = "5599";
const DB = "retoma_test";

/** postgres recusa rodar como root; o cluster roda como o usuário postgres. */
function comoPostgres(cmd, args) {
  return execFileSync("runuser", ["-u", "postgres", "--", cmd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Executa SQL e devolve as linhas cruas, sem cabeçalho nem alinhamento. */
export function sql(texto, { db = DB } = {}) {
  return comoPostgres("psql", [
    "-h", BASE, "-p", PORTA, "-d", db,
    "-v", "ON_ERROR_STOP=1",
    "-t", "-A", "-F", "",
    "-c", texto,
  ]).trim();
}

const INICIO = "<<<RESULTADO";
const FIM = "RESULTADO>>>";

/**
 * psql imprime o rótulo de cada comando (BEGIN, SET, ROLLBACK...) junto com
 * o resultado. Sentinelas delimitam a saída da consulta que interessa.
 */
function entreSentinelas(saida) {
  const linhas = saida.split("\n");
  const i = linhas.indexOf(INICIO);
  const f = linhas.indexOf(FIM);
  if (i === -1 || f === -1) return saida.trim();
  return linhas.slice(i + 1, f).join("\n").trim();
}

function naSessao(papel, claims, texto, fecho) {
  return entreSentinelas(
    sql(
      `begin;
       select set_config('request.jwt.claims', ${literal(JSON.stringify(claims))}, true);
       set local role ${papel};
       select ${literal(INICIO)};
       ${texto};
       select ${literal(FIM)};
       ${fecho};`,
    ),
  );
}

function naSessaoDoUsuario(userId, texto, fecho) {
  return naSessao(
    "authenticated",
    { sub: userId, role: "authenticated" },
    texto,
    fecho,
  );
}

/**
 * Executa SQL no papel `anon` — o papel de visitante sem sessão. Sempre em
 * rollback: nada aqui deve conseguir persistir.
 */
export function sqlComoAnon(texto) {
  return naSessao("anon", { role: "anon" }, texto, "rollback");
}

/**
 * Executa SQL no papel `authenticated`, com a claim `sub` do usuário dado —
 * exatamente o que auth.uid() lê. Envolvido em transação para que
 * `set local` valha só aqui.
 */
export function sqlComoUsuario(userId, texto) {
  return naSessaoDoUsuario(userId, texto, "rollback");
}

/** Igual a sqlComoUsuario, mas confirma a transação. */
export function escreverComoUsuario(userId, texto) {
  return naSessaoDoUsuario(userId, texto, "commit");
}

/** true se o SQL falhar — usado para afirmar que uma operação é negada. */
export function falha(fn) {
  try {
    fn();
    return null;
  } catch (erro) {
    return String(erro.stderr ?? erro.message ?? erro);
  }
}

/**
 * As tabelas que o schema pode ter, e por qual autorização.
 *
 * As cinco primeiras são o núcleo mínimo da seção 11.2. As duas últimas
 * existem por exceção NOMINAL da proibição 14.4.25, concedida pela seção
 * 20.2 (emenda E-07) e modelada pela seção 21 (E-08).
 *
 * Acrescentar nome a esta lista é o momento de perguntar qual emenda
 * autoriza a entidade. Sem isso, uma tabela nova entraria no schema e sete
 * testes ficariam verdes por terem sido ajustados um a um.
 */
export const TABELAS_AUTORIZADAS = [
  "commitments",
  "consent_records",
  "conversations",
  "gambling_history",
  "messages",
  "profiles",
  "recovery_goals",
].join(",");

export function literal(valor) {
  return `'${String(valor).replace(/'/g, "''")}'`;
}

/**
 * Executa vários comandos SQL em processos psql SIMULTÂNEOS, cada um na sua
 * própria conexão e portanto na sua própria transação.
 *
 * Existe por um motivo específico: a garantia de Q-12 (§18.2, §19.1.1) é a
 * trava por usuário, e trava só se exercita com concorrência real. Um teste
 * sequencial passa igual com e sem trava — não distingue garantia de
 * aparência de garantia.
 *
 * Devolve, para cada comando, `{ ok, saida }`. Nunca lança: quem chama
 * decide quantas execuções deveriam ter falhado.
 */
export function emParalelo(comandos) {
  return Promise.all(
    comandos.map(
      (texto) =>
        new Promise((resolve) => {
          execFile(
            "runuser",
            [
              "-u", "postgres", "--", "psql",
              "-h", BASE, "-p", PORTA, "-d", DB,
              "-v", "ON_ERROR_STOP=1",
              "-t", "-A", "-F", "",
              "-c", texto,
            ],
            { encoding: "utf8" },
            (erro, stdout, stderr) =>
              resolve({
                ok: !erro,
                saida: String(erro ? (stderr ?? erro.message) : stdout).trim(),
              }),
          );
        }),
    ),
  );
}

/**
 * Monta o SQL de uma transação executada como o usuário dado — mesma forma
 * de `escreverComoUsuario`, mas devolvida como texto, para uso com
 * `emParalelo`.
 */
export function transacaoDoUsuario(userId, texto) {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  return `begin;
     select set_config('request.jwt.claims', ${literal(claims)}, true);
     set local role authenticated;
     ${texto};
     commit;`;
}

export function listarMigracoes() {
  return readdirSync(MIGRACOES)
    .filter((n) => n.endsWith(".sql"))
    .sort();
}

/** Derruba o cluster e recria do zero, aplicando shim + migrations. */
export function recriarBanco() {
  pararSeRodando();
  rmSync(BASE, { recursive: true, force: true });
  mkdirSync(BASE, { recursive: true });
  execFileSync("chown", ["-R", "postgres:postgres", BASE]);
  execFileSync("chmod", ["700", BASE]);

  comoPostgres(join(BIN, "initdb"), ["-D", DATA, "-A", "trust"]);
  comoPostgres(join(BIN, "pg_ctl"), [
    "-D", DATA,
    "-o", `-k ${BASE} -p ${PORTA} -c listen_addresses=''`,
    "-l", join(BASE, "log"),
    "-w", "start",
  ]);

  sql(`create database ${DB}`, { db: "postgres" });

  // O shim precede as migrations, como o Supabase Auth precede o schema
  // do projeto em produção.
  aplicarArquivo(SHIM);
  for (const nome of listarMigracoes()) {
    aplicarArquivo(join(MIGRACOES, nome));
  }
}

function aplicarArquivo(caminho) {
  comoPostgres("psql", [
    "-h", BASE, "-p", PORTA, "-d", DB,
    "-v", "ON_ERROR_STOP=1",
    "-f", caminho,
  ]);
}

export function pararSeRodando() {
  if (!existsSync(join(DATA, "postmaster.pid"))) return;
  try {
    comoPostgres(join(BIN, "pg_ctl"), ["-D", DATA, "-m", "immediate", "-w", "stop"]);
  } catch {
    // já estava parado
  }
}

/** Cria identidade + aceite principal + profile, na ordem do fluxo canônico §5.1. */
export function criarUsuarioComAceite() {
  const id = sql("select gen_random_uuid()");
  sql(`insert into auth.users (id) values (${literal(id)})`);
  sql(
    `insert into public.consent_records (user_id, consent_type, state, document_version_id)
     values (${literal(id)}, 'C-PRINCIPAL', 'concedido', 'teste-v0')`,
  );
  sql(`insert into public.profiles (user_id) values (${literal(id)})`);
  return id;
}
