"use client";

import type { ReactNode } from "react";

/**
 * Seleção única e múltipla.
 *
 * Cada opção é uma faixa de 52 px em superfície própria, com 2 px de vão
 * entre elas — o alvo é o dedo, não o cursor. A selecionada sobe para Grafite
 * Elevado, o mesmo par visual da aba ativa na barra inferior.
 */

function Opcao({
  tipo,
  nome,
  marcada,
  aoMudar,
  children,
}: {
  tipo: "radio" | "checkbox";
  nome?: string;
  marcada: boolean;
  aoMudar: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex h-[52px] cursor-pointer items-center gap-3.5 bg-superficie px-[18px] first:rounded-t-md last:rounded-b-md ${
        marcada ? "bg-superficie-elevada" : ""
      }`}
    >
      <input
        type={tipo}
        name={nome}
        checked={marcada}
        onChange={aoMudar}
        className="size-[18px] shrink-0 accent-[var(--color-mineral-claro)]"
      />
      <span
        className={`tipo-corpo ${marcada ? "text-texto" : "text-texto-secundario"}`}
      >
        {children}
      </span>
    </label>
  );
}

/** Uma opção entre várias. */
export function Escolha({
  nome,
  opcoes,
  valor,
  aoEscolher,
}: {
  nome: string;
  opcoes: readonly string[];
  valor: string;
  aoEscolher: (opcao: string) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-0.5">
      {opcoes.map((o) => (
        <Opcao
          key={o}
          tipo="radio"
          nome={nome}
          marcada={valor === o}
          aoMudar={() => aoEscolher(o)}
        >
          {o}
        </Opcao>
      ))}
    </div>
  );
}

/** Várias opções ao mesmo tempo. */
export function Multiescolha({
  opcoes,
  valores,
  aoAlternar,
}: {
  opcoes: readonly string[];
  valores: readonly string[];
  aoAlternar: (opcao: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-0.5">
      {opcoes.map((o) => (
        <Opcao
          key={o}
          tipo="checkbox"
          marcada={valores.includes(o)}
          aoMudar={() => aoAlternar(o)}
        >
          {o}
        </Opcao>
      ))}
    </div>
  );
}
