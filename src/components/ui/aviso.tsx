import type { ReactNode } from "react";

/**
 * Aviso — erro e atenção.
 *
 * Deliberadamente SEM cor de estado: a identidade não tem vermelho de erro
 * nem verde de sucesso, e Brasa e Âmbar-Sinal são reservados a segurança e
 * crise (P-05). O aviso se distingue por superfície e borda, como todo o
 * resto do sistema.
 */
export function Aviso({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`tipo-corpo rounded-md border border-borda bg-superficie p-4 text-texto ${className}`.trim()}
    >
      {children}
    </p>
  );
}
