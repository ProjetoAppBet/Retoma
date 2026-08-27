/**
 * Testes do módulo HOJE — o fluxo completo, não os componentes.
 *
 * Dois níveis, de propósito:
 *
 * 1. BANCO — simula exatamente o que as ações de servidor fazem: as mesmas
 *    funções transacionais, com o papel `authenticated` e as claims reais da
 *    sessão. É onde as garantias duras vivem (Q-12, acesso cruzado,
 *    concorrência, resposta repetida).
 *
 * 2. CAMINHO DA APLICAÇÃO — verifica que as ações e os componentes usam esse
 *    caminho e nenhum outro: sem insert direto, sem identidade vinda do
 *    cliente, sem `sem_resposta`, com porta de aceite e com trava contra
 *    envio duplo.
 *
 * O que NÃO é coberto, e por quê: renderização do React. Não há runtime de
 * Next nem stack local do Supabase neste ambiente, então montar a página
 * exigiria simular `next/headers`, `revalidatePath` e o cliente do Supabase
 * — e um teste desses provaria o simulacro, não o produto.
 *
 * Normativo: §18.1 (Q-11), §18.2 (Q-12), §18.3 (Q-13), §18.5 (P-29),
 * §19 (E-06), §12.2.
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

const ACOES = "src/app/(ambiente)/hoje/acoes.ts";
const RESPOSTA = "src/app/(ambiente)/hoje/resposta.tsx";
const DECLARACAO = "src/app/(ambiente)/hoje/declaracao.tsx";
const PAGINA = "src/app/(ambiente)/hoje/page.tsx";
const LEITURA = "src/lib/ambiente/compromissos.ts";

function codigo(caminho) {
  return readFileSync(`${RAIZ}/${caminho}`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/** O que `declararCompromisso` faz: RPC, sem prazo (P-31). */
function declarar(userId, texto) {
  return escreverComoUsuario(
    userId,
    `select id from public.declarar_compromisso(${literal(texto)}, null)`,
  );
}

/** O que `registrarResultado` faz. */
function responder(userId, commitmentId, outcome) {
  return escreverComoUsuario(
    userId,
    `select id from public.registrar_resultado_do_compromisso(
       ${literal(commitmentId)}, ${literal(outcome)})`,
  );
}

/**
 * O que `carregarCompromissoAtivo()` devolve, na definição de §18.2 — do
 * usuário, `outcome` nulo, e não superado.
 */
function ativo(userId) {
  const linha = sql(
    `select coalesce(c.commitment_declaration, '(sem declaracao)')
     from public.commitments c
     where c.user_id = ${literal(userId)}
       and c.outcome is null
       and not exists (
         select 1 from public.commitments s where s.supersedes_id = c.id
       )`,
  );
  return linha === "" ? null : linha;
}

function totalDeLinhas(userId) {
  return Number(
    sql(
      `select count(*) from public.commitments where user_id = ${literal(userId)}`,
    ),
  );
}

before(() => recriarBanco());
after(() => pararSeRodando());

describe("HOJE · sem compromisso ativo", () => {
  it("a leitura devolve nada, e declarar cria o primeiro", () => {
    const u = criarUsuarioComAceite();
    assert.equal(ativo(u), null, "identidade nova não tem compromisso ativo");

    const id = declarar(u, "não abrir o app hoje");
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(ativo(u), "não abrir o app hoje");
  });

  it("P-31: o compromisso declarado no Hoje nasce SEM prazo", () => {
    const u = criarUsuarioComAceite();
    declarar(u, "sem prazo");
    assert.equal(
      sql(
        `select coalesce(due_at::text, '(nulo)') from public.commitments
         where user_id = ${literal(u)}`,
      ),
      "(nulo)",
      "24h é do compromisso INICIAL (Op. §12); afirmar prazo aqui inventaria",
    );
  });

  it("declaração vazia é recusada pelo servidor", () => {
    const u = criarUsuarioComAceite();
    for (const vazio of ["", "   "]) {
      const erro = falha(() => declarar(u, vazio));
      assert.ok(erro, `"${vazio}" deveria falhar`);
      assert.match(erro, /declaracao do compromisso e obrigatoria/);
    }
    assert.equal(totalDeLinhas(u), 0);
  });

  it("a tela oferece declarar exatamente quando não há ativo", () => {
    const fonte = codigo(PAGINA);
    assert.match(
      fonte,
      /compromisso \? \(\s*<RespostaDoCompromisso[\s\S]*?\) : \(\s*<DeclararCompromisso \/>/,
      "um slot, dois estados, nunca os dois",
    );
  });
});

describe("HOJE · com compromisso ativo", () => {
  it("carrega declaração e prazo do compromisso certo", () => {
    const u = criarUsuarioComAceite();
    // Só o caminho do onboarding grava prazo (Op. §12), então é ele que o
    // teste usa para exercitar a exibição do prazo.
    escreverComoUsuario(
      u,
      `select public.declarar_compromisso('dormir cedo', now() + interval '24 hours')`,
    );
    assert.equal(
      sql(
        `select commitment_declaration || ' | prazo=' || (due_at > now())::text
         from public.commitments where user_id = ${literal(u)}`,
      ),
      "dormir cedo | prazo=true",
    );
  });

  it("a leitura ignora versões superadas (§18.2)", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "primeiro");
    responder(u, id, "cumprido");
    assert.equal(ativo(u), null, "respondido não é ativo");

    declarar(u, "segundo");
    assert.equal(ativo(u), "segundo");
    assert.equal(totalDeLinhas(u), 3);
  });

  it("a leitura não depende de recência, e sim dos três critérios", () => {
    const fonte = codigo(LEITURA);
    assert.match(fonte, /outcome === null && !superadas\.has\(l\.id\)/);

    // Só o corpo de carregarCompromissoAtivo: o histórico, logo abaixo no
    // mesmo módulo, ordena de propósito (L-04) e não pode contaminar isto.
    const inicio = fonte.indexOf("export async function carregarCompromissoAtivo");
    const fim = fonte.indexOf("export", inicio + 10);
    assert.ok(inicio > -1 && fim > inicio, "função não encontrada");
    assert.doesNotMatch(
      fonte.slice(inicio, fim),
      /\.order\(/,
      "§18.2: a definição é independente de ordenação",
    );
  });
});

describe("HOJE · Cumpri e Não cumpri", () => {
  for (const outcome of ["cumprido", "não_cumprido"]) {
    it(`${outcome}: cria nova versão e encerra o ativo`, () => {
      const u = criarUsuarioComAceite();
      const id = declarar(u, "um passo");
      const novo = responder(u, id, outcome);

      assert.notEqual(novo, id, "resultado é linha NOVA, não UPDATE");
      assert.equal(ativo(u), null);
      assert.equal(
        sql(
          `select outcome || '|' || (supersedes_id = ${literal(id)})::text
           from public.commitments where id = ${literal(novo)}`,
        ),
        `${outcome}|true`,
      );
      // A versão anterior permanece intacta (Q-10).
      assert.equal(
        sql(
          `select commitment_declaration from public.commitments where id = ${literal(id)}`,
        ),
        "um passo",
      );
    });
  }

  it("depois de responder, declarar de novo funciona", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "primeiro");
    responder(u, id, "cumprido");
    declarar(u, "segundo");
    assert.equal(ativo(u), "segundo");
  });

  it("`sem_resposta` não é aceito por caminho nenhum (P-29)", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "qualquer");

    const erro = falha(() => responder(u, id, "sem_resposta"));
    assert.ok(erro);
    assert.match(erro, /resultado invalido/);
    assert.equal(ativo(u), "qualquer", "a recusa não altera o estado");

    // E a ação de servidor recusa antes mesmo de chegar ao banco.
    const fonte = codigo(ACOES);
    assert.match(fonte, /RESULTADOS_ACEITOS = \["cumprido", "não_cumprido"\]/);
    assert.doesNotMatch(fonte, /sem_resposta/);
  });

  it("resultado fora do domínio é recusado", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "qualquer");
    for (const invalido of ["CUMPRIDO", "talvez", ""]) {
      assert.ok(falha(() => responder(u, id, invalido)), `${invalido} passou`);
    }
    assert.equal(ativo(u), "qualquer");
  });
});

describe("HOJE · resposta duplicada", () => {
  it("responder duas vezes a mesma versão é recusado", () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "dormir cedo");
    responder(u, id, "cumprido");

    const erro = falha(() => responder(u, id, "não_cumprido"));
    assert.ok(erro);
    assert.match(erro, /ja foi (respondido|superada)/);
    assert.equal(totalDeLinhas(u), 2, "nenhuma terceira linha");
  });

  it("a ação traduz 23505 em estado esperado, não em falha genérica", () => {
    const fonte = codigo(ACOES);
    const marcas = [...fonte.matchAll(/export async function (\w+)/g)];
    for (let i = 0; i < marcas.length; i++) {
      const corpo = fonte.slice(
        marcas[i].index,
        i + 1 < marcas.length ? marcas[i + 1].index : undefined,
      );
      // Cada ação distingue o estado esperado (23505) do erro genérico da
      // RPC, e nenhuma delas deixa o erro do banco vazar para a tela.
      assert.match(corpo, /error\.code === "23505"/, marcas[i][1]);
      assert.match(
        corpo,
        /return \{ erro: "Não foi possível guardar agora\. Tente de novo\." \}/,
        `${marcas[i][1]} sem caminho de erro genérico`,
      );
      assert.doesNotMatch(
        corpo,
        /error\.(message|details|hint)/,
        `${marcas[i][1]} vaza detalhe do banco para a tela`,
      );
    }
    assert.match(fonte, /já foi respondido/);
    assert.match(fonte, /já tem um compromisso em aberto/);
  });

  it("a interface trava o envio duplo em duas camadas", () => {
    for (const arquivo of [RESPOSTA, DECLARACAO]) {
      const fonte = codigo(arquivo);
      assert.match(fonte, /useRef\(false\)/, `${arquivo} sem trava de ref`);
      assert.match(
        fonte,
        /if \(enviando\.current\) return;/,
        `${arquivo} não barra o segundo envio`,
      );
      assert.match(fonte, /disabled=\{pendente\}/, `${arquivo} sem disabled`);
    }
  });
});

describe("HOJE · concorrência", () => {
  it("duas declarações simultâneas: exatamente uma vence", async () => {
    const u = criarUsuarioComAceite();
    const [a, b] = await emParalelo([
      transacaoDoUsuario(
        u,
        "select public.declarar_compromisso('A', null); select pg_sleep(1.5)",
      ),
      transacaoDoUsuario(
        u,
        "select pg_sleep(0.4); select public.declarar_compromisso('B', null)",
      ),
    ]);
    assert.equal(
      [a, b].filter((r) => r.ok).length,
      1,
      `esperado 1 sucesso — ${a.saida} / ${b.saida}`,
    );
    assert.equal(totalDeLinhas(u), 1);
  });

  it("duas respostas simultâneas ao mesmo compromisso: uma vence", async () => {
    const u = criarUsuarioComAceite();
    const id = declarar(u, "um passo");

    const r = await emParalelo([
      transacaoDoUsuario(
        u,
        `select public.registrar_resultado_do_compromisso(${literal(id)}, 'cumprido');
         select pg_sleep(1.5)`,
      ),
      transacaoDoUsuario(
        u,
        `select pg_sleep(0.4);
         select public.registrar_resultado_do_compromisso(${literal(id)}, 'não_cumprido')`,
      ),
    ]);
    assert.equal(r.filter((x) => x.ok).length, 1, "resultado duplicado passou");
    assert.equal(totalDeLinhas(u), 2, "declaração + um único resultado");
  });
});

describe("HOJE · acesso entre identidades", () => {
  it("A não responde compromisso de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const idDeB = declarar(b, "compromisso de B");

    const erro = falha(() => responder(a, idDeB, "cumprido"));
    assert.ok(erro);
    assert.match(erro, /nao encontrado para esta identidade/);
    assert.equal(totalDeLinhas(a), 0, "nada foi criado na conta de A");
    assert.equal(totalDeLinhas(b), 1, "nada foi criado na conta de B");
    assert.equal(ativo(b), "compromisso de B");
  });

  it("a mensagem não distingue 'não existe' de 'não é sua'", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    const idDeB = declarar(b, "de B");

    const inexistente = falha(() =>
      responder(a, "00000000-0000-0000-0000-000000000000", "cumprido"),
    );
    const alheio = falha(() => responder(a, idDeB, "cumprido"));
    const limpa = (e) => e.split("\n")[0].replace(/^ERROR:\s*/, "");
    assert.equal(
      limpa(inexistente),
      limpa(alheio),
      "mensagens diferentes permitiriam enumerar identificadores",
    );
  });

  it("A não enxerga as linhas de B", () => {
    const a = criarUsuarioComAceite();
    const b = criarUsuarioComAceite();
    declarar(b, "só de B");
    assert.equal(
      escreverComoUsuario(a, "select count(*) from public.commitments"),
      "0",
    );
  });

  it("A não declara compromisso em nome de B: não há parâmetro para isso", () => {
    for (const fn of [
      "declarar_compromisso",
      "registrar_resultado_do_compromisso",
    ]) {
      const args = sql(
        `select pg_get_function_arguments(p.oid) from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = '${fn}'`,
      );
      assert.doesNotMatch(args, /\buser_?id\b|\buid\b/i, `assinatura: ${args}`);
    }
  });
});

describe("HOJE · sessão e proteção das ações", () => {
  it("sem identidade na sessão, as funções recusam", () => {
    for (const chamada of [
      "public.declarar_compromisso('x', null)",
      "public.registrar_resultado_do_compromisso(gen_random_uuid(), 'cumprido')",
    ]) {
      const erro = falha(() =>
        sql(`begin; set local role authenticated; select ${chamada}; rollback;`),
      );
      assert.ok(erro, `${chamada} passou sem identidade`);
      assert.match(erro, /sem identidade autenticada/);
    }
  });

  it("toda ação do Hoje passa por exigirAceite", () => {
    const fonte = codigo(ACOES);
    const marcas = [...fonte.matchAll(/export async function (\w+)/g)];
    assert.deepEqual(
      marcas.map((m) => m[1]).sort(),
      ["declararCompromisso", "registrarResultado"],
      "o Hoje expõe exatamente duas ações",
    );
    for (let i = 0; i < marcas.length; i++) {
      const corpo = fonte.slice(
        marcas[i].index,
        i + 1 < marcas.length ? marcas[i + 1].index : undefined,
      );
      assert.match(
        corpo,
        /await exigirAceite\(\)/,
        `${marcas[i][1]} sem porta de aceite`,
      );
    }
  });
});

describe("HOJE · Depois não grava (Q-13, §18.3)", () => {
  it("não existe ação de servidor para adiar", () => {
    const fonte = codigo(ACOES);
    assert.doesNotMatch(fonte, /adiar|depois|postergar/i);
  });

  it("o botão Depois só mexe em estado local", () => {
    const botoes = [
      ...readFileSync(`${RAIZ}/${RESPOSTA}`, "utf8").matchAll(
        /<button\b[\s\S]*?<\/button>/g,
      ),
    ].map((m) => m[0]);

    const depois = botoes.filter((b) => />\s*Depois\s*</.test(b));
    assert.equal(depois.length, 1);
    assert.match(depois[0], /onClick=\{\(\) => setAdiado\(true\)\}/);
    assert.doesNotMatch(depois[0], /registrarResultado|responder\(|action=/);

    assert.equal(
      botoes.filter((b) => /responder\("/.test(b)).length,
      2,
      "Cumpri e Não cumpri gravam — senão o teste acima passaria com a tela inerte",
    );
  });

  it("adiar não persiste nada: nenhum cookie, nenhum storage, nenhum banco", () => {
    const fonte = codigo(RESPOSTA);
    assert.doesNotMatch(fonte, /localStorage|sessionStorage|document\.cookie/);
    assert.match(fonte, /useState\(false\)/, "adiar vive em estado de render");
  });
});

describe("HOJE · caminho de escrita e atualização da tela", () => {
  it("nenhum insert, update ou delete direto em commitments", () => {
    for (const arquivo of [ACOES, LEITURA, PAGINA, RESPOSTA, DECLARACAO]) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(
        fonte,
        /from\("commitments"\)[\s\S]{0,120}\.(insert|update|delete|upsert)\(/,
        `${arquivo} escreve direto em commitments`,
      );
    }
    // E o privilégio nem existe no banco (§19.1.2).
    assert.equal(
      sql(
        "select has_table_privilege('authenticated','public.commitments','insert')::text",
      ),
      "false",
    );
  });

  it("as duas ações escrevem pelas funções transacionais", () => {
    const fonte = codigo(ACOES);
    assert.match(fonte, /\.rpc\("declarar_compromisso"/);
    assert.match(fonte, /\.rpc\("registrar_resultado_do_compromisso"/);
  });

  it("a tela é revalidada depois de cada gravação", () => {
    const fonte = codigo(ACOES);
    const marcas = [...fonte.matchAll(/export async function (\w+)/g)];
    for (let i = 0; i < marcas.length; i++) {
      const corpo = fonte.slice(
        marcas[i].index,
        i + 1 < marcas.length ? marcas[i + 1].index : undefined,
      );
      assert.match(
        corpo,
        /revalidatePath\("\/hoje"\)/,
        `${marcas[i][1]} não atualiza a tela`,
      );
    }
  });

  it("o Hoje não afirma aposta nem inventa entidade de dia", () => {
    for (const arquivo of [ACOES, PAGINA, RESPOSTA, DECLARACAO, LEITURA]) {
      const fonte = codigo(arquivo);
      assert.doesNotMatch(fonte, /com-aposta/, `${arquivo} afirma aposta`);
      assert.doesNotMatch(fonte, /check_?in|checkin/i, `${arquivo} inventa check-in`);
    }
    assert.equal(
      sql(
        `select string_agg(tablename, ',' order by tablename)
         from pg_tables where schemaname = 'public'`,
      ),
      TABELAS_AUTORIZADAS,
      "o núcleo mínimo de §11.2, exatamente",
    );
  });
});
