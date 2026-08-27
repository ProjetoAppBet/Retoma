import type { ReactNode } from "react";

/**
 * Card — superfície elevada por cor, não por borda nem sombra.
 *
 * A borda saiu: o Brand Book resolve hierarquia por cor de superfície e por
 * espaço, e borda em tudo achatava exatamente isso. Raio lg (14 px), padding
 * de 24 px.
 */
export function Card({
  titulo,
  children,
}: {
  titulo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-superficie p-6">
      {titulo && <p className="tipo-subtitulo text-texto">{titulo}</p>}
      <p className="tipo-corpo mt-1 text-texto-secundario">{children}</p>
    </div>
  );
}
