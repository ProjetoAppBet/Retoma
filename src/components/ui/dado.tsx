import type { ReactNode } from "react";

/**
 * Dado — número em IBM Plex Mono.
 *
 * Toda quantidade do produto usa a monoespaçada, com tabular-nums para não
 * tremer quando o valor muda. É o que dá densidade a uma tela sem enchê-la
 * de texto.
 */
export function Dado({
  children,
  unidade,
  tamanho = "grande",
  className = "",
}: {
  children: ReactNode;
  unidade?: ReactNode;
  tamanho?: "grande" | "medio";
  className?: string;
}) {
  const escala =
    tamanho === "grande" ? "text-[3.25rem] leading-[1.05]" : "text-2xl";
  return (
    <div className={`flex items-baseline gap-2 ${className}`.trim()}>
      <span className={`font-mono font-medium tabular-nums ${escala}`}>
        {children}
      </span>
      {unidade && <span className="tipo-apoio text-texto-terciario">{unidade}</span>}
    </div>
  );
}
