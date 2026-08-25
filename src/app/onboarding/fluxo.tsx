"use client";

import { useState, useTransition } from "react";

import {
  CONSEQUENCIAS,
  FREQUENCIAS,
  PERIODOS,
  TIPOS_DE_OBJETIVO,
} from "@/lib/onboarding/dominios";

import { gravarCompromisso, gravarHistorico, gravarObjetivo } from "./acoes";

/**
 * Onboarding — seis etapas de Op. §12, uma pergunta por vez.
 *
 * Modelo B: as respostas ficam AQUI, no estado do cliente, até que a entidade
 * correspondente possa nascer completa. Nada é gravado por etapa.
 *
 * Gravações: Etapa 5 -> gambling_history; Etapa 6 -> recovery_goals;
 * etapa final -> commitments.
 *
 * O que este componente deliberadamente NÃO faz, por falta de decisão:
 * - não adapta a Etapa 2 (depende de D-03/P-06);
 * - não produz a síntese inicial (formato NÃO DEFINIDO nas fontes). A tela
 *   final apenas confirma que o onboarding terminou e que o compromisso foi
 *   registrado; não é uma síntese, e não deve ser lida como tal;
 * - não emite telemetria (P-22).
 */

type Estado = {
  motivacao: string;
  tentativaAnterior: string;
  frequencia: string;
  frequenciaEstado: string;
  valor: string;
  periodo: string;
  periodoOutro: string;
  valorEstado: string;
  consequencias: string[];
  consequenciaPrincipal: string;
  consequenciaTexto: string;
  objetivo: string;
  tipoDeObjetivo: string;
  compromisso: string;
};

const INICIAL: Estado = {
  motivacao: "",
  tentativaAnterior: "",
  frequencia: "",
  frequenciaEstado: "informado",
  valor: "",
  periodo: "",
  periodoOutro: "",
  valorEstado: "informado",
  consequencias: [],
  consequenciaPrincipal: "",
  consequenciaTexto: "",
  objetivo: "",
  tipoDeObjetivo: "",
  compromisso: "",
};

const TOTAL_DE_ETAPAS = 6;

export function Fluxo() {
  const [etapa, setEtapa] = useState(1);
  const [e, setE] = useState<Estado>(INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const muda = (campo: keyof Estado, valor: string | string[]) =>
    setE((atual) => ({ ...atual, [campo]: valor }));

  const alternaConsequencia = (c: string) =>
    setE((atual) => ({
      ...atual,
      consequencias: atual.consequencias.includes(c)
        ? atual.consequencias.filter((x) => x !== c)
        : [...atual.consequencias, c],
    }));

  function avancar() {
    setErro(null);

    // Etapa 5 conclui o bloco do histórico: é aqui que gambling_history nasce.
    if (etapa === 5) {
      iniciar(async () => {
        const r = await gravarHistorico({
          frequencyCategory: e.frequenciaEstado === "informado" ? e.frequencia || null : null,
          frequencyResponseState: e.frequenciaEstado,
          frequencyOriginalExpression: null,
          amountDeclared:
            e.valorEstado === "informado" && e.valor.trim() !== ""
              ? Number(e.valor)
              : null,
          amountPeriod: e.valorEstado === "informado" ? e.periodo || null : null,
          amountOriginalExpression:
            e.periodo === "outro" ? e.periodoOutro.trim() || null : null,
          amountResponseState: e.valorEstado,
          consequenceCategories: e.consequencias,
          mainConsequenceCategory: e.consequenciaPrincipal || null,
          mainConsequenceDeclaration: e.consequenciaTexto.trim() || null,
          previousAttemptsDescription: e.tentativaAnterior.trim() || null,
        });
        if ("erro" in r) setErro(r.erro);
        else setEtapa(6);
      });
      return;
    }

    // Etapa 6 conclui o objetivo: recovery_goals nasce completo, com o
    // goal_type que o usuário acabou de escolher.
    if (etapa === 6) {
      if (!e.tipoDeObjetivo) {
        setErro("Escolha o que você quer fazer com as apostas.");
        return;
      }
      iniciar(async () => {
        const r = await gravarObjetivo({
          motivationDeclaration: e.motivacao.trim() || null,
          goalDeclaration: e.objetivo.trim() || null,
          goalType: e.tipoDeObjetivo,
        });
        if ("erro" in r) setErro(r.erro);
        else setEtapa(7);
      });
      return;
    }

    // Etapa final: o compromisso de 24 horas.
    if (etapa === 7) {
      iniciar(async () => {
        const r = await gravarCompromisso({
          commitmentDeclaration: e.compromisso,
        });
        if ("erro" in r) setErro(r.erro);
        else setEtapa(8);
      });
      return;
    }

    setEtapa(etapa + 1);
  }

  const rotulo = (t: string) => (
    <label className="tipo-apoio mt-4 block text-texto-secundario">{t}</label>
  );
  const campoTexto = (campo: keyof Estado, linhas = 4) => (
    <textarea
      rows={linhas}
      value={e[campo] as string}
      onChange={(ev) => muda(campo, ev.target.value)}
      className="mt-2 w-full rounded-md border border-borda bg-superficie p-4 text-texto"
    />
  );
  const escolha = (
    campo: keyof Estado,
    opcoes: readonly string[],
    selecionado: string,
  ) => (
    <div className="mt-3 space-y-2">
      {opcoes.map((o) => (
        <label key={o} className="flex gap-3">
          <input
            type="radio"
            name={String(campo)}
            checked={selecionado === o}
            onChange={() => muda(campo, o)}
            className="mt-1 size-4 shrink-0"
          />
          <span className="tipo-corpo text-texto-secundario">{o}</span>
        </label>
      ))}
    </div>
  );

  /* Op. §12: uma pergunta por vez, no texto literal das fontes. */
  const conteudo = () => {
    switch (etapa) {
      case 1:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              O que te trouxe ao Retoma hoje?
            </h1>
            {campoTexto("motivacao")}
          </>
        );
      case 2:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Você já tentou parar antes?
            </h1>
            <p className="tipo-corpo mt-3 text-texto-secundario">
              Conte como foi, se quiser. Pode deixar em branco.
            </p>
            {campoTexto("tentativaAnterior")}
          </>
        );
      case 3:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Com que frequência você tem apostado?
            </h1>
            {escolha("frequencia", FREQUENCIAS, e.frequencia)}
            {rotulo("Ou:")}
            {escolha(
              "frequenciaEstado",
              ["não sabe", "recusou informar"],
              e.frequenciaEstado,
            )}
          </>
        );
      case 4:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Quanto dinheiro costuma estar envolvido?
            </h1>
            {rotulo("Valor")}
            <input
              inputMode="decimal"
              value={e.valor}
              onChange={(ev) => muda("valor", ev.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-borda bg-superficie px-4 text-texto"
            />
            {rotulo("Por período")}
            {escolha("periodo", PERIODOS, e.periodo)}
            {e.periodo === "outro" && (
              <>
                {rotulo("Descreva o período com suas palavras")}
                {campoTexto("periodoOutro", 2)}
              </>
            )}
            {rotulo("Ou:")}
            {escolha(
              "valorEstado",
              ["não sabe", "recusou informar"],
              e.valorEstado,
            )}
          </>
        );
      case 5:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Qual o principal prejuízo que você percebe hoje?
            </h1>
            {campoTexto("consequenciaTexto", 3)}
            {rotulo("Principal")}
            {escolha(
              "consequenciaPrincipal",
              CONSEQUENCIAS,
              e.consequenciaPrincipal,
            )}
            {rotulo("Outras áreas afetadas")}
            <div className="mt-2 space-y-2">
              {CONSEQUENCIAS.map((c) => (
                <label key={c} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={e.consequencias.includes(c)}
                    onChange={() => alternaConsequencia(c)}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="tipo-corpo text-texto-secundario">{c}</span>
                </label>
              ))}
            </div>
          </>
        );
      case 6:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Se o Retoma pudesse te ajudar com uma única coisa a partir de
              hoje, o que você mais gostaria de conseguir?
            </h1>
            {campoTexto("objetivo")}
            {/* P-28: esta pergunta é extensão da Etapa 6, não etapa nova.
                Op. §12 não coleta goal_type, mas a coluna é NOT NULL e Q-02
                fecha o domínio. Solução técnica provisória, registrada como
                pendência de produto. */}
            {rotulo("E, sobre as apostas, o que você quer agora?")}
            {escolha("tipoDeObjetivo", TIPOS_DE_OBJETIVO, e.tipoDeObjetivo)}
          </>
        );
      case 7:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">
              Um passo para as próximas 24 horas
            </h1>
            <p className="tipo-corpo mt-3 text-texto-secundario">
              Escolha algo pequeno e possível.
            </p>
            {campoTexto("compromisso", 3)}
          </>
        );
      default:
        return (
          <>
            <h1 className="tipo-titulo-tela mt-4">Está guardado.</h1>
            <p className="tipo-corpo mt-5 text-texto-secundario">
              Suas respostas foram registradas e seu compromisso para as
              próximas 24 horas também.
            </p>
          </>
        );
    }
  };

  const podeAvancar = () => {
    if (etapa === 7) return e.compromisso.trim().length > 0;
    if (etapa === 6) return Boolean(e.tipoDeObjetivo);
    return true;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        {etapa <= TOTAL_DE_ETAPAS && (
          <p className="tipo-rotulo text-texto-secundario">
            Etapa{" "}
            <span className="font-mono tabular-nums">{etapa}</span> de{" "}
            <span className="font-mono tabular-nums">{TOTAL_DE_ETAPAS}</span>
          </p>
        )}
        {conteudo()}
        {erro && (
          <p
            role="alert"
            className="tipo-corpo mt-4 rounded-md border border-borda bg-superficie p-4 text-texto"
          >
            {erro}
          </p>
        )}
      </div>

      {etapa <= 7 && (
        <div className="pt-8">
          <button
            type="button"
            disabled={pendente || !podeAvancar()}
            onClick={avancar}
            className="flex h-12 w-full items-center justify-center rounded-md bg-botao-primario px-5 text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover disabled:opacity-60"
          >
            {pendente ? "Um instante…" : etapa === 7 ? "Assumir" : "Continuar"}
          </button>
        </div>
      )}
    </div>
  );
}
