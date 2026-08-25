/**
 * Testes da Fase 3 — persistência do onboarding, Modelo B.
 *
 * O que se prova aqui: que uma entidade só é gravada quando pode nascer
 * semanticamente completa, que progresso não vira histórico de correção, e
 * que as garantias das fases anteriores continuam valendo sob o novo fluxo.
 *
 * O componente de interface não é exercitado (não há navegador nem stack
 * local do Supabase). O que se exercita é o efeito das ações no banco, com
 * RLS real — que é onde as regras vinculantes vivem.
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
  RAIZ,
} from "./support/local-db.mjs";

const VERSAO = "consentimento-principal-v1.0";
const TABELAS = ["recovery_goals", "gambling_history", "commitments"];

function identidadeComAceite() {
  const id = sql("select gen_random_uuid()");
  sql(`insert into auth.users (id) values (${literal(id)})`);
  escreverComoUsuario(
    id,
    `select public.registrar_aceite_principal(${literal(VERSAO)})`,
  );
  return id;
}

const contar = (tabela, id) =>
  sql(`select count(*) from public.${tabela} where user_id = ${literal(id)}`);

/** Grava gambling_history como a ação do servidor faria ao concluir a Etapa 5. */
function gravarHistorico(id, extra = "") {
  return escreverComoUsuario(
    id,
    `insert into public.gambling_history
       (user_id, information_nature, frequency_category, frequency_response_state,
        amount_declared, amount_period, amount_response_state,
        consequence_categories, main_consequence_category,
        main_consequence_declaration, previous_attempts_relapse_description)
     values (${literal(id)}, 'declarado', 'semanal', 'informado',
        200, 'semana', 'informado',
        array['financeiras','familiares'], 'financeiras',
        'perdi o controle das contas', 'tentei parar no ano passado')
     ${extra}`,
  );
}

function gravarObjetivo(id) {
  return escreverComoUsuario(
    id,
    `insert into public.recovery_goals
       (user_id, goal_type, goal_declaration, motivation_declaration, information_nature)
     values (${literal(id)}, 'interromper', 'voltar a dormir tranquilo',
             'minha filha perguntou o que estava acontecendo', 'declarado')`,
  );
}

function gravarCompromisso(id) {
  return escreverComoUsuario(
    id,
    `insert into public.commitments
       (user_id, commitment_declaration, due_at, information_nature)
     values (${literal(id)}, 'nao abrir o aplicativo de apostas hoje',
             now() + interval '24 hours', 'declarado')`,
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("Modelo B · nada é gravado antes da entidade estar completa", () => {
  it("logo após o aceite, nenhuma das três entidades tem linha", () => {
    const u = identidadeComAceite();
    for (const t of TABELAS) {
      assert.equal(contar(t, u), "0", `${t} não pode ter linha ainda`);
    }
    // O aceite em si já existe — a porta do onboarding.
    assert.equal(contar("profiles", u), "1");
    assert.equal(contar("consent_records", u), "1");
  });

  it("concluir a Etapa 5 cria gambling_history, e só ela", () => {
    const u = identidadeComAceite();
    gravarHistorico(u);
    assert.equal(contar("gambling_history", u), "1");
    assert.equal(contar("recovery_goals", u), "0", "objetivo só na Etapa 6");
    assert.equal(contar("commitments", u), "0", "compromisso só no final");
  });

  it("concluir a Etapa 6 cria recovery_goals, e o compromisso ainda não", () => {
    const u = identidadeComAceite();
    gravarHistorico(u);
    gravarObjetivo(u);
    assert.equal(contar("recovery_goals", u), "1");
    assert.equal(contar("commitments", u), "0");
  });

  it("o fluxo completo gera exatamente uma linha em cada entidade", () => {
    const u = identidadeComAceite();
    gravarHistorico(u);
    gravarObjetivo(u);
    gravarCompromisso(u);
    for (const t of TABELAS) {
      assert.equal(contar(t, u), "1", `${t} deveria ter exatamente uma linha`);
    }
  });

  it("abandono no meio não deixa registro artificial", () => {
    // Abandonar entre as etapas significa, no Modelo B, simplesmente não
    // chamar a ação. O estado vive no cliente e some com ele.
    const u = identidadeComAceite();
    gravarHistorico(u); // chegou à Etapa 5 e parou
    assert.equal(contar("recovery_goals", u), "0");
    assert.equal(contar("commitments", u), "0");
    assert.equal(
      sql(`select count(*) from public.consent_invariant_violations
           where user_id = ${literal(u)}`),
      "0",
      "abandono parcial não pode violar o invariante",
    );
  });
});

describe("progresso não é histórico de correção (Q-10)", () => {
  it("nenhuma linha do fluxo completo usa supersedes_id", () => {
    const u = identidadeComAceite();
    gravarHistorico(u);
    gravarObjetivo(u);
    gravarCompromisso(u);
    for (const t of TABELAS) {
      assert.equal(
        sql(`select count(*) from public.${t}
             where user_id = ${literal(u)} and supersedes_id is not null`),
        "0",
        `${t}: supersedes_id é para correção, não para progresso`,
      );
    }
  });

  it("as ações do servidor não escrevem supersedes_id", () => {
    const fonte = readFileSync(`${RAIZ}/src/app/onboarding/acoes.ts`, "utf8");
    assert.doesNotMatch(
      fonte,
      /supersedes_id:\s*[^n]/,
      "nenhuma ação do onboarding pode atribuir supersedes_id",
    );
  });

  it("as ações não gravam goal_type sem escolha do usuário", () => {
    const fonte = readFileSync(`${RAIZ}/src/app/onboarding/acoes.ts`, "utf8");
    assert.doesNotMatch(
      fonte,
      /goal_type:\s*"(interromper|reduzir|ainda não decidido)"/,
      "goal_type não pode ser literal: vem da declaração do usuário",
    );
    assert.match(fonte, /goal_type:\s*entrada\.goalType/);
  });
});

describe("domínios e naturezas preservados", () => {
  it("as três linhas nascem com information_nature = 'declarado'", () => {
    const u = identidadeComAceite();
    gravarHistorico(u);
    gravarObjetivo(u);
    gravarCompromisso(u);
    for (const t of TABELAS) {
      assert.equal(
        sql(`select distinct information_nature from public.${t}
             where user_id = ${literal(u)}`),
        "declarado",
      );
    }
  });

  it("os estados obrigatórios de frequência e valor são preservados", () => {
    const u = identidadeComAceite();
    escreverComoUsuario(
      u,
      `insert into public.gambling_history
         (user_id, information_nature, frequency_response_state, amount_response_state)
       values (${literal(u)}, 'declarado', 'recusou informar', 'não sabe')`,
    );
    assert.equal(
      sql(`select frequency_response_state || '|' || amount_response_state
           from public.gambling_history where user_id = ${literal(u)}`),
      "recusou informar|não sabe",
      "a ausência de valor mora no estado da resposta, não em NULL silencioso",
    );
  });

  it("o domínio do código é idêntico ao do schema", () => {
    const fonte = readFileSync(`${RAIZ}/src/lib/onboarding/dominios.ts`, "utf8");
    for (const v of ["ocasional", "várias vezes ao dia", "não perguntado",
                     "acumulado/total", "outras relevantes", "ainda não decidido"]) {
      assert.ok(fonte.includes(`"${v}"`), `domínio perdeu o valor "${v}"`);
    }
  });

  it("o compromisso nasce com prazo de 24 horas", () => {
    const u = identidadeComAceite();
    gravarCompromisso(u);
    assert.equal(
      sql(`select (due_at > now() + interval '23 hours'
                   and due_at < now() + interval '25 hours')::text
           from public.commitments where user_id = ${literal(u)}`),
      "true",
    );
  });
});

describe("garantias das fases anteriores continuam valendo", () => {
  it("um usuário não grava dado em nome de outro", () => {
    const a = identidadeComAceite();
    const b = identidadeComAceite();
    const erro = falha(() =>
      escreverComoUsuario(
        a,
        `insert into public.recovery_goals
           (user_id, goal_type, information_nature)
         values (${literal(b)}, 'reduzir', 'declarado')`,
      ),
    );
    assert.ok(erro, "a RLS deveria recusar");
    assert.equal(contar("recovery_goals", b), "0");
  });

  it("sem aceite, gravar dado de domínio viola o invariante", () => {
    const u = sql("select gen_random_uuid()");
    sql(`insert into auth.users (id) values (${literal(u)})`);
    escreverComoUsuario(
      u,
      `insert into public.commitments (user_id, information_nature)
       values (${literal(u)}, 'declarado')`,
    );
    assert.equal(
      sql(`select count(*) from public.consent_invariant_violations
           where user_id = ${literal(u)} and source = 'public.commitments'`),
      "1",
      "§12.1: nenhum dado de domínio antes do aceite",
    );
    sql(`delete from public.commitments where user_id = ${literal(u)}`);
    sql(`delete from auth.users where id = ${literal(u)}`);
  });

  it("as ações do onboarding passam pela porta do aceite", () => {
    const fonte = readFileSync(`${RAIZ}/src/app/onboarding/acoes.ts`, "utf8");
    const chamadas = fonte.match(/await exigirAceite\(\)/g) ?? [];
    assert.equal(chamadas.length, 3, "cada ação de gravação exige o aceite");
  });

  it("o fluxo completo mantém o invariante em conjunto vazio", () => {
    assert.equal(
      sql("select count(*) from public.consent_invariant_violations"),
      "0",
    );
  });
});
