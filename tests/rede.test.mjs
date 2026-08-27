/**
 * Testes da REDE.
 *
 * A conclusão desta rodada foi que Rede **não pode** ser funcionalidade:
 * nenhuma coluna do schema guarda pessoa de confiança, relação, conhecimento
 * sobre o problema ou participação autorizada (Op. §4 "Rede", Op. §10).
 * §11.3 mantém "rede de apoio completa" fora do núcleo mínimo, §8.1 nomeia
 * `support_permissions` como entidade futura, e §4.3 coloca C-APOIO na
 * Fase 8.
 *
 * Estes testes existem para travar essa ausência, não para descrevê-la. O
 * teste que mais importa é o do schema: ele falha no dia em que alguém
 * acrescentar uma coluna de rede sem emenda normativa, e força a conversa em
 * vez de deixar a estrutura nascer em silêncio.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  RAIZ,
  TABELAS_AUTORIZADAS,
  criarUsuarioComAceite,
  escreverComoUsuario,
  literal,
  pararSeRodando,
  recriarBanco,
  sql,
} from "./support/local-db.mjs";

const PAGINA = "src/app/(ambiente)/rede/page.tsx";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("REDE · não existe fonte de dado", () => {
  it("nenhuma coluna do schema guarda dado de rede (Op. §4, Op. §10)", () => {
    // Vocabulário de Op. §4 "Rede" e Op. §10: pessoa de confiança, relação,
    // conhecimento sobre o problema, participação, compartilhamento,
    // acionamento, accountability.
    const suspeitas = sql(
      `select coalesce(string_agg(table_name || '.' || column_name, ', '), '(nenhuma)')
       from information_schema.columns
       where table_schema = 'public'
         and (column_name like '%contact%' or column_name like '%contato%'
           or column_name like '%support%'  or column_name like '%apoio%'
           or column_name like '%rede%'     or column_name like '%network%'
           or column_name like '%confian%'  or column_name like '%share%'
           or column_name like '%comparti%' or column_name like '%familia%'
           or column_name like '%relation%' or column_name like '%relacao%')`,
    );
    assert.equal(suspeitas, "(nenhuma)", "coluna de rede sem emenda normativa");
  });

  it("`support_permissions` continua não existindo (§8.1, §11.3)", () => {
    assert.equal(
      sql(
        `select string_agg(tablename, ',' order by tablename)
         from pg_tables where schemaname = 'public'`,
      ),
      TABELAS_AUTORIZADAS,
    );
  });

  it("`profiles` continua mínima — nada de rede foi enfiado nela", () => {
    assert.equal(
      sql(
        `select string_agg(column_name, ',' order by column_name)
         from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'`,
      ),
      "created_at,user_id",
    );
  });

  it("nenhum C-APOIO foi concedido por caminho algum (Fase 8, §4.3)", () => {
    const u = criarUsuarioComAceite();
    assert.equal(
      sql(
        `select count(*) from public.consent_records
         where user_id = ${literal(u)} and consent_type = 'C-APOIO'`,
      ),
      "0",
    );
    // E nenhum código da aplicação escreve C-APOIO.
    const fontes = [
      "src/app/aceite/acoes.ts",
      "src/app/conta/acoes.ts",
      "src/app/onboarding/acoes.ts",
      "src/app/(ambiente)/hoje/acoes.ts",
      PAGINA,
    ];
    for (const f of fontes) {
      assert.doesNotMatch(codigo(f), /C-APOIO/, `${f} grava C-APOIO`);
    }
  });
});

describe("REDE · a tela não inventa", () => {
  it("nenhum contato, profissional ou rede fictícia", () => {
    const fonte = codigo(PAGINA);
    for (const padrao of [
      /\bpsicólog/i, /\bpsiquiatr/i, /jogadores anônimos/i, /\bterapeut/i,
      /\bgrupo\b/i, /\bconvidar\b/i, /\badicionar\b/i,
      /\bmock/i, /\bexemplo\b/i,
    ]) {
      assert.doesNotMatch(fonte, padrao, `conteúdo fictício: ${padrao}`);
    }

    // "compartilhar" NÃO entra na lista: a tela usa a palavra justamente
    // para dizer que a coisa não existe. Proibir o termo obrigaria a
    // contornar o próprio teste — e teste que se contorna deixa de
    // proteger. Quem guarda a ausência do recurso é o teste de affordance
    // logo abaixo: sem botão, sem formulário, sem campo.
  });

  it("nenhuma lista, nenhum array de dados na tela", () => {
    const fonte = codigo(PAGINA);
    assert.doesNotMatch(fonte, /\.map\(/, "lista sem fonte é lista inventada");
    assert.doesNotMatch(fonte, /const \w+ = \[/, "array literal de conteúdo");
  });

  it("não consulta o banco: não há tabela para consultar", () => {
    const fonte = codigo(PAGINA);
    assert.doesNotMatch(fonte, /\.from\(/, "leitura vazia seria teatro");
    assert.doesNotMatch(fonte, /createClient/);
  });

  it("não escreve: nenhuma ação, nenhuma mutação", () => {
    const fonte = codigo(PAGINA);
    assert.doesNotMatch(fonte, /"use server"/);
    assert.doesNotMatch(fonte, /\.(insert|update|delete|upsert|rpc)\(/);
  });

  it("sem ação de convite — oferecê-la anteciparia C-APOIO (§4.3)", () => {
    const fonte = codigo(PAGINA);
    assert.doesNotMatch(fonte, /<button/, "botão aqui seria promessa");
    assert.doesNotMatch(fonte, /<form/);
    assert.doesNotMatch(fonte, /<input/);
  });

  it("nenhuma recomendação clínica", () => {
    const fonte = codigo(PAGINA).toLowerCase();
    for (const termo of [
      "procure", "recomenda", "deveria", "é importante que",
      "ajuda profissional", "tratamento", "recaída", "crise",
    ]) {
      assert.ok(!fonte.includes(termo), `recomendação clínica: "${termo}"`);
    }
  });
});

describe("REDE · o vazio é funcional", () => {
  it("usa o componente de vazio existente, com ícone e título", () => {
    const fonte = codigo(PAGINA);
    assert.match(fonte, /<Vazio/);
    assert.match(fonte, /icone=\{<IconeRede \/>\}/);
    assert.match(fonte, /titulo="[^"]+"/);
  });

  it("tem saída: leva a telas que realmente existem", () => {
    const fonte = codigo(PAGINA);
    const destinos = [...fonte.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(destinos.length > 0, "o vazio não pode ser um beco");
    for (const d of destinos) {
      assert.ok(
        ["/hoje", "/trajetoria", "/plano"].includes(d),
        `destino inexistente ou fora do ambiente: ${d}`,
      );
    }
  });

  it("diz que compartilhar ainda não é oferecido, sem prometer data", () => {
    const fonte = codigo(PAGINA);
    assert.match(fonte, /ainda não oferece/);
    for (const padrao of [/em breve/i, /em desenvolvimento/i, /próxima versão/i]) {
      assert.doesNotMatch(fonte, padrao, "promessa de prazo");
    }
  });

  it("sessão expirada: a rota inteira exige aceite", () => {
    assert.match(
      codigo("src/app/(ambiente)/layout.tsx"),
      /await exigirAceite\(\)/,
      "o layout do grupo guarda /rede",
    );
  });

  it("nenhum dado de outra identidade é alcançável — não há leitura", () => {
    // A garantia aqui é estrutural: a tela não lê nada. E, no banco, a RLS
    // continua fechando as cinco tabelas.
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    sql(
      `insert into public.recovery_goals (user_id, goal_type, information_nature)
       values (${literal(b)}, 'reduzir', 'declarado')`,
    );
    for (const tabela of [
      "commitments", "recovery_goals", "gambling_history",
      "consent_records", "profiles",
    ]) {
      assert.equal(
        escreverComoUsuario(a, `select count(*) from public.${tabela}`),
        tabela === "profiles" || tabela === "consent_records" ? "1" : "0",
        `${tabela}: A enxerga linha de B`,
      );
    }
  });
});
