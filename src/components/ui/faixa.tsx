import type { ComponentProps, ReactNode } from "react";

/**
 * Faixa — item de lista tocável.
 *
 * É a peça que substitui o radio compacto e o card com borda. Altura de
 * 52 px (56 px quando abre outra tela), superfície própria, e 2 px de vão
 * entre faixas — o vão revela o fundo e faz o trabalho que a borda fazia,
 * sem o ruído dela.
 */

export function Pilha({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

const BASE =
  "flex items-center gap-3.5 bg-superficie px-[18px] text-texto-secundario " +
  "first:rounded-t-md last:rounded-b-md";

export function Faixa({
  children,
  ativa = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { ativa?: boolean }) {
  return (
    <div
      className={`${BASE} h-[52px] ${ativa ? "bg-superficie-elevada text-texto" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

/** Seta de "abre outra tela". Ortogonal, como manda o sistema de ícones. */
export function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ml-auto size-4 text-texto-terciario"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 6 H14 V18" />
    </svg>
  );
}
