import type { ReactNode } from "react";

/**
 * Barra de topo do ambiente.
 *
 * Dá identidade de lugar: título à esquerda, contexto à direita. É distinta
 * do Cabecalho do fluxo — o fluxo não é um lugar, é um caminho.
 */
export function TopoDeTela({
  titulo,
  direita,
}: {
  titulo: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-[22px] pt-[18px] pb-3.5">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em]">{titulo}</h1>
      {direita && <div className="flex items-center gap-3.5">{direita}</div>}
    </div>
  );
}

/** Contexto textual do topo — data, contagem. Sempre em mono. */
export function Contexto({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs tabular-nums text-texto-terciario">
      {children}
    </span>
  );
}
