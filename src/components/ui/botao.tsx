import type { ComponentProps } from "react";

/**
 * Botão do sistema.
 *
 * Identidade: altura 48 px (--altura-botao, alvo mínimo de toque), raio md.
 *
 * `primario` é Cal sobre Ardósia — 14,69:1, e 10,64:1 no hover. A família
 * Mineral foi descartada por aritmética: nenhuma das 11 cores oficiais atinge
 * 4,5:1 sobre Mineral em ambos os estados. Manter Mineral fora do botão
 * também preserva seu único significado no sistema: "onde você está agora",
 * que é estado, não ação.
 *
 * `secundario` existe para decisões genuinamente binárias, em que as duas
 * opções recebem peso visual equivalente — recusar tem o mesmo peso que
 * aceitar. Não existe botão de sucesso verde nem destrutivo vermelho.
 */
type Variante = "primario" | "secundario";

const BASE =
  "flex h-12 w-full items-center justify-center rounded-md px-5 text-base transition disabled:opacity-60";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-botao-primario font-semibold text-botao-primario-texto hover:bg-botao-primario-hover",
  secundario: "border border-borda font-medium text-texto hover:bg-superficie",
};

export function Botao({
  variante = "primario",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANTES[variante]} ${className}`.trim()}
      {...props}
    />
  );
}
