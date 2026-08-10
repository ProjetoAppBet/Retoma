"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Etapa 1 de 6 do onboarding (Modelo Operacional do Usuário v1.0, §12).
 *
 * O onboarding apresenta uma pergunta por vez. Esta é a primeira pergunta;
 * as etapas 2 a 6 ainda não fazem parte do fluxo implementado.
 *
 * A resposta ainda não é persistida: o modelo de dados e as regras de RLS
 * serão definidos na Especificação Técnica (ver §26 do Modelo Operacional).
 */
export function PrimeiraPergunta() {
  const [resposta, setResposta] = useState("");
  const [enviada, setEnviada] = useState(false);

  const respostaValida = resposta.trim().length > 0;

  /* Números em IBM Plex Mono, conforme a identidade. */
  const indicadorEtapa = (
    <p className="tipo-rotulo text-texto-secundario">
      Etapa <span className="font-mono tabular-nums">1</span> de{" "}
      <span className="font-mono tabular-nums">6</span>
    </p>
  );

  if (enviada) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex-1">
          {indicadorEtapa}

          <h1 className="tipo-titulo-tela mt-4">Obrigado por compartilhar.</h1>

          <p className="tipo-corpo mt-5 text-texto-secundario">
            As próximas etapas do onboarding ainda não estão disponíveis. Sua
            resposta permanece apenas nesta tela e não foi gravada.
          </p>

          <div className="mt-8 rounded-lg border border-borda bg-superficie p-5">
            <p className="tipo-subtitulo text-texto">Sua resposta</p>
            <p className="tipo-corpo mt-2 whitespace-pre-wrap text-texto-secundario">
              {resposta.trim()}
            </p>
          </div>
        </div>

        <div className="pt-10">
          <button
            type="button"
            onClick={() => setEnviada(false)}
            className="h-12 w-full rounded-md border border-pedra px-5 text-base font-semibold text-texto transition hover:bg-superficie"
          >
            Editar resposta
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (respostaValida) setEnviada(true);
      }}
      className="flex flex-1 flex-col"
    >
      <div className="flex-1">
        {indicadorEtapa}

        <label htmlFor="resposta" className="tipo-titulo-tela mt-4 block">
          O que te trouxe ao Retoma hoje?
        </label>

        <p className="tipo-corpo mt-5 text-texto-secundario">
          Responda com suas palavras. Não existe resposta certa.
        </p>

        <textarea
          id="resposta"
          name="resposta"
          value={resposta}
          onChange={(event) => setResposta(event.target.value)}
          rows={6}
          autoFocus
          className="tipo-corpo mt-6 w-full resize-none rounded-md border border-borda bg-superficie p-5 text-texto outline-none focus:border-destaque"
        />
      </div>

      <div className="pt-10">
        <button
          type="submit"
          disabled={!respostaValida}
          className="h-12 w-full rounded-md bg-botao-primario px-5 text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover disabled:cursor-not-allowed disabled:bg-botao-desabilitado disabled:text-botao-desabilitado-texto"
        >
          Continuar
        </button>

        <Link
          href="/"
          className="tipo-apoio mt-4 block text-center text-texto-secundario transition hover:text-texto"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
