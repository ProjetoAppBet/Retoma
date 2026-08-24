"use client";

import { useState, useTransition } from "react";

import { aceitar, recusar } from "./acoes";

/**
 * §4.3: o aceite não é pré-marcado. O botão é o ato explícito — não há
 * checkbox marcado por padrão, e recusar é uma saída de mesmo peso visual,
 * sem retenção (§5.2).
 */
export function FormularioAceite() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="pt-8">
      {erro && (
        <p
          role="alert"
          className="tipo-corpo mb-4 rounded-md border border-borda bg-superficie p-4 text-texto"
        >
          {erro}
        </p>
      )}

      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const resultado = await aceitar();
            if (resultado?.erro) setErro(resultado.erro);
          })
        }
        className="flex h-12 w-full items-center justify-center rounded-md bg-botao-primario px-5 text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover disabled:opacity-60"
      >
        {pendente ? "Um instante…" : "Aceitar e começar"}
      </button>

      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(() => recusar())}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-borda px-5 text-base font-medium text-texto transition hover:bg-superficie disabled:opacity-60"
      >
        Não aceitar
      </button>
    </div>
  );
}
