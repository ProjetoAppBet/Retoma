import type { ReactNode } from "react";

/**
 * Os oito ícones oficiais.
 *
 * Especificação do Brand Book, seguida literalmente:
 *   grade 24 × 24 · área ativa 18 × 18 · traço 2 · terminação e junção round
 *   ângulos de 90° APENAS — nenhuma diagonal, nenhum círculo
 *
 * O idioma é o do símbolo: segmentos ortogonais que mudam de direção em
 * ângulo reto. Todo `d` abaixo usa somente H e V — nenhum comando diagonal
 * (L com dois eixos, C, S, Q, A) aparece, e por construção não pode aparecer.
 *
 * Cor: Cal sobre fundo escuro, Ardósia sobre fundo claro — herdada por
 * `currentColor`. Azul-Mineral apenas quando o ícone marca a posição atual,
 * o que é decisão de quem usa o ícone, não do ícone.
 *
 * Proibidos e ausentes: coração, cérebro, mão, escudo, cadeado, chama,
 * troféu, moeda, cifrão.
 */

function Icone({ d, rotulo }: { d: string; rotulo: string }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      role="img"
      aria-label={rotulo}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

/** Check-in · o registro do dia: uma caixa e a marca dentro dela. */
export function IconeCheckIn() {
  return <Icone rotulo="Check-in" d="M4 4 H20 V20 H4 Z M9 12 H15" />;
}

/** Trajetória · a própria Linha: base contínua e marcas de altura idêntica. */
export function IconeTrajetoria() {
  return (
    <Icone
      rotulo="Trajetória"
      d="M3 19 H21 M7 19 V10 M12 19 V10 M17 19 V10"
    />
  );
}

/** Plano · itens em sequência, do mais amplo ao mais próximo. */
export function IconePlano() {
  return <Icone rotulo="Plano" d="M4 6 H20 M4 12 H16 M4 18 H11" />;
}

/** Fissura · a interrupção: a linha se parte, e as duas bordas ficam visíveis. */
export function IconeFissura() {
  return (
    <Icone rotulo="Fissura" d="M3 12 H9 M15 12 H21 M9 7 V17 M15 7 V17" />
  );
}

/** Gatilho · o que precede: uma queda que encontra o chão. */
export function IconeGatilho() {
  return <Icone rotulo="Gatilho" d="M12 4 V15 M6 19 H18" />;
}

/** Fôlego · a expansão e o recolhimento, em torno do mesmo eixo. */
export function IconeFolego() {
  return <Icone rotulo="Fôlego" d="M8 7 H16 M4 12 H20 M8 17 H16" />;
}

/** Rede · dois pontos ligados — nunca um contato sem vínculo. */
export function IconeRede() {
  return (
    <Icone
      rotulo="Rede"
      d="M4 4 H9 V9 H4 Z M15 15 H20 V20 H15 Z M9 6 H17 V15"
    />
  );
}

/** Retomar · o gesto do símbolo: seguir, subir de nível, seguir. */
export function IconeRetomar() {
  return <Icone rotulo="Retomar" d="M4 18 H11 V8 H20" />;
}

export const ICONES = {
  "check-in": IconeCheckIn,
  trajetoria: IconeTrajetoria,
  plano: IconePlano,
  fissura: IconeFissura,
  gatilho: IconeGatilho,
  folego: IconeFolego,
  rede: IconeRede,
  retomar: IconeRetomar,
} as const;
