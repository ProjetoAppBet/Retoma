import type { ComponentProps, ReactNode } from "react";

/**
 * Campos de entrada.
 *
 * Superfície Grafite sobre fundo Ardósia, borda Grafite Elevado: a hierarquia
 * se resolve por cor de superfície, nunca por sombra empilhada.
 */

const CAMPO =
  "w-full rounded-md border border-borda bg-superficie text-texto";

export function Rotulo({ children }: { children: ReactNode }) {
  return <span className="tipo-apoio text-texto-secundario">{children}</span>;
}

/** Entrada de várias linhas — respostas abertas do onboarding. */
export function CampoTexto({
  className = "",
  rows = 4,
  ...props
}: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={`${CAMPO} p-4 ${className}`.trim()} {...props} />;
}

/** Entrada de uma linha — e-mail, senha, valor. */
export function CampoLinha({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return <input className={`${CAMPO} h-12 px-4 ${className}`.trim()} {...props} />;
}
