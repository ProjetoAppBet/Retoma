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

  if (enviada) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500">Etapa 1 de 6</p>

          <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight">
            Obrigado por compartilhar.
          </h1>

          <p className="mt-5 text-base leading-7 text-zinc-400">
            As próximas etapas do onboarding ainda não estão disponíveis. Sua
            resposta permanece apenas nesta tela e não foi gravada.
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-medium text-zinc-200">Sua resposta</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {resposta.trim()}
            </p>
          </div>
        </div>

        <div className="pt-10">
          <button
            type="button"
            onClick={() => setEnviada(false)}
            className="w-full rounded-2xl border border-zinc-800 px-5 py-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
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
        <p className="text-sm font-medium text-zinc-500">Etapa 1 de 6</p>

        <label
          htmlFor="resposta"
          className="mt-4 block text-2xl font-semibold leading-tight tracking-tight"
        >
          O que te trouxe ao Retoma hoje?
        </label>

        <p className="mt-5 text-base leading-7 text-zinc-400">
          Responda com suas palavras. Não existe resposta certa.
        </p>

        <textarea
          id="resposta"
          name="resposta"
          value={resposta}
          onChange={(event) => setResposta(event.target.value)}
          rows={6}
          autoFocus
          className="mt-6 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          placeholder="Escreva aqui…"
        />
      </div>

      <div className="pt-10">
        <button
          type="submit"
          disabled={!respostaValida}
          className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Continuar
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-xs leading-5 text-zinc-600 transition hover:text-zinc-400"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
