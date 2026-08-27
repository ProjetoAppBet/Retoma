import type { ReactNode } from "react";

/**
 * Estado vazio.
 *
 * Diz o que falta e por quê. Não recebe ação por padrão: em várias telas do
 * Retoma o vazio é deliberado — oferecer um botão ali anteciparia decisão de
 * produto ainda aberta.
 */
export function Vazio({
  icone,
  titulo,
  children,
}: {
  icone: ReactNode;
  titulo: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="m-auto px-6 text-center">
      <div className="mb-[18px] flex justify-center text-texto-terciario">{icone}</div>
      <p className="text-[1.0625rem] leading-relaxed">{titulo}</p>
      {children && (
        <p className="tipo-apoio mt-2.5 text-texto-terciario">{children}</p>
      )}
    </div>
  );
}
