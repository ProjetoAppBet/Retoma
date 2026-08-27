import type { ReactNode } from "react";

/**
 * Estrutura de tela: container comum a todas as telas do produto.
 *
 * Coluna única, largura máxima de leitura, ação ancorada embaixo. A largura
 * NÃO cresce no desktop — texto largo cansa e contraria a contenção da marca;
 * o ganho de tela grande é contexto lateral, não linha mais longa.
 */
export function Tela({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div
        className={`mx-auto flex min-h-screen max-w-md flex-col px-6 py-10 ${className}`.trim()}
      >
        {children}
      </div>
    </main>
  );
}

/** Título de topo de tela. */
export function Cabecalho({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1 className={`tipo-titulo-tela ${className}`.trim()}>{children}</h1>
  );
}
