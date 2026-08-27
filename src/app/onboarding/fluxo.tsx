"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { CampoLinha, CampoTexto, Rotulo } from "@/components/ui/campo";
import { Cabecalho } from "@/components/ui/cabecalho";
import { Escolha, Multiescolha } from "@/components/ui/escolha";
import { Passo } from "@/components/ui/passo";
import { Trilho } from "@/components/ui/trilho";
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
    <label className="mt-4 block">
      <Rotulo>{t}</Rotulo>
    </label>
  );
  const campoTexto = (campo: keyof Estado, linhas = 4) => (
    <CampoTexto
      rows={linhas}
      value={e[campo] as string}
      onChange={(ev) => muda(campo, ev.target.value)}
      className="mt-2"
    />
  );
  /*
    §11.5.2: "não sabe" e "recusou informar" são ESTADOS DA RESPOSTA, não
    opções de igual valor. Na lista principal competiam visualmente com as
    categorias reais; como fichas, ficam disponíveis sem disputar.
  */
  const fichas = (campo: keyof Estado, selecionado: string) => (
    <div className="mt-3.5 flex gap-2">
      {(["não sabe", "recusou informar"] as const).map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => muda(campo, o)}
          aria-pressed={selecionado === o}
          className={`rounded-sm px-3.5 py-1.5 text-[0.8125rem] ${
            selecionado === o
              ? "bg-superficie-elevada text-texto"
              : "bg-superficie text-texto-terciario"
          }`}
        >
          {o === "não sabe" ? "Não sei" : "Prefiro não dizer"}
        </button>
      ))}
    </div>
  );

  const escolha = (
    campo: keyof Estado,
    opcoes: readonly string[],
    selecionado: string,
  ) => (
    <Escolha
      nome={String(campo)}
      opcoes={opcoes}
      valor={selecionado}
      aoEscolher={(o) => muda(campo, o)}
    />
  );

  /* Op. §12: uma pergunta por vez, no texto literal das fontes. */
  const conteudo = () => {
    switch (etapa) {
      case 1:
        return (
          <>
            <Cabecalho>
              O que te trouxe ao Retoma hoje?
            </Cabecalho>
            {campoTexto("motivacao")}
          </>
        );
      case 2:
        return (
          <>
            <Cabecalho>
              Você já tentou parar antes?
            </Cabecalho>
            <p className="tipo-corpo mt-3 text-texto-secundario">
              Conte como foi, se quiser. Pode deixar em branco.
            </p>
            {campoTexto("tentativaAnterior")}
          </>
        );
      case 3:
        return (
          <>
            <Cabecalho>
              Com que frequência você tem apostado?
            </Cabecalho>
            {escolha("frequencia", FREQUENCIAS, e.frequencia)}
            {fichas("frequenciaEstado", e.frequenciaEstado)}
          </>
        );
      case 4:
        return (
          <>
            <Cabecalho>
              Quanto dinheiro costuma estar envolvido?
            </Cabecalho>
            {rotulo("Valor")}
            <CampoLinha
              inputMode="decimal"
              value={e.valor}
              onChange={(ev) => muda("valor", ev.target.value)}
              className="mt-2"
            />
            {rotulo("Por período")}
            {escolha("periodo", PERIODOS, e.periodo)}
            {e.periodo === "outro" && (
              <>
                {rotulo("Descreva o período com suas palavras")}
                {campoTexto("periodoOutro", 2)}
              </>
            )}
            {fichas("valorEstado", e.valorEstado)}
          </>
        );
      case 5:
        return (
          <>
            <Cabecalho>
              Qual o principal prejuízo que você percebe hoje?
            </Cabecalho>
            {campoTexto("consequenciaTexto", 3)}
            {rotulo("Principal")}
            {escolha(
              "consequenciaPrincipal",
              CONSEQUENCIAS,
              e.consequenciaPrincipal,
            )}
            {rotulo("Outras áreas afetadas")}
            <Multiescolha
              opcoes={CONSEQUENCIAS}
              valores={e.consequencias}
              aoAlternar={alternaConsequencia}
            />
          </>
        );
      case 6:
        return (
          <>
            <Cabecalho>
              Se o Retoma pudesse te ajudar com uma única coisa a partir de
              hoje, o que você mais gostaria de conseguir?
            </Cabecalho>
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
            <Cabecalho>
              Um passo para as próximas 24 horas
            </Cabecalho>
            <p className="tipo-corpo mt-3 text-texto-secundario">
              Escolha algo pequeno e possível.
            </p>
            {campoTexto("compromisso", 3)}
          </>
        );
      default:
        return (
          <>
            <Cabecalho className="text-[1.75rem]">Está guardado.</Cabecalho>
            <p className="tipo-corpo mt-3.5 text-texto-secundario">
              Suas respostas foram registradas.
            </p>
            {/*
              O cartão tem dois planos: a declaração em Grafite, o prazo em
              Grafite Elevado. Não é síntese — nada aqui resume as respostas,
              e o formato da síntese continua NÃO DEFINIDO (depende de D-03).
            */}
            <div className="mt-[30px] overflow-hidden rounded-lg bg-superficie">
              <div className="p-5">
                <p className="tipo-rotulo mb-2.5 text-texto-terciario">
                  Seu compromisso
                </p>
                <p className="text-[1.1875rem] leading-[1.42]">
                  {e.compromisso.trim()}
                </p>
              </div>
              <div className="flex items-baseline gap-2 bg-superficie-elevada px-5 py-4">
                <span className="font-mono text-[1.75rem] font-medium tabular-nums text-destaque-sobre-escuro">
                  24
                </span>
                <span className="tipo-apoio text-texto-terciario">
                  horas a partir de agora
                </span>
              </div>
            </div>
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
      {etapa > TOTAL_DE_ETAPAS && <div className="pt-5"><Trilho fracao={1} /></div>}

      {etapa <= TOTAL_DE_ETAPAS && (
        <>
          {/*
            Voltar é NAVEGAÇÃO, não desfazer: o estado vive em `e`, aqui no
            cliente, então rever uma resposta não toca o banco. Nenhuma
            gravação é feita nem desfeita ao voltar — as entidades só nascem
            nas etapas 5, 6 e final, e voltar antes delas simplesmente não
            grava nada.
          */}
          <div className="flex items-center justify-between px-[22px] pt-[18px] pb-3">
            {etapa > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErro(null);
                  setEtapa(etapa - 1);
                }}
                aria-label="Voltar para a etapa anterior"
                className="-ml-1 flex size-8 items-center justify-center text-texto-terciario"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 6 H10 V18" />
                </svg>
              </button>
            ) : (
              <span className="size-8" />
            )}
            <Passo atual={etapa} total={TOTAL_DE_ETAPAS} />
            <span className="size-8" />
          </div>
          <Trilho fracao={etapa / TOTAL_DE_ETAPAS} />
        </>
      )}

      <div className="flex flex-1 flex-col pt-[30px]">
        {conteudo()}
        {erro && <Aviso className="mt-4">{erro}</Aviso>}
      </div>

      <div className="px-[22px] pt-[18px] pb-6">
        {etapa <= 7 ? (
          <Botao disabled={pendente || !podeAvancar()} onClick={avancar}>
            {pendente ? "Um instante…" : etapa === 7 ? "Assumir" : "Continuar"}
          </Botao>
        ) : (
          <Link href="/hoje">
            <Botao>Ir para o Retoma</Botao>
          </Link>
        )}
      </div>
    </div>
  );
}
