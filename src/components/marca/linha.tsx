/**
 * A Linha — elemento gráfico central da identidade.
 *
 * Regras do Brand Book, todas estruturais neste componente:
 *
 * 1. CONTINUIDADE. A base é um único traço, desenhado de ponta a ponta antes
 *    de qualquer marca. Nunca é cortada e nunca reinicia — nada do que já foi
 *    conquistado é apagado por um dia ruim.
 * 2. ALTURA IDÊNTICA. Toda marca de dia registrado tem exatamente a mesma
 *    altura. No instante em que a altura varia conforme desempenho, vira
 *    gráfico financeiro. Só o dia SEM registro é mais curto.
 * 3. SEM VEREDITO. O dia com aposta é VAZADO, não vermelho. Não existe
 *    vermelho de erro nesta identidade, e Brasa é reservada a segurança e
 *    crise (P-05).
 * 4. HOJE em Mineral Claro — o único uso de Mineral aqui, e ele significa
 *    "onde você está agora", não avaliação.
 *
 * Componente PURO: recebe os dias por parâmetro, não lê banco, não emite
 * telemetria, não cria entidade. Os dados de demonstração vivem em
 * `DIAS_DE_EXEMPLO`, fora de qualquer fluxo de produto.
 */

export type EstadoDoDia = "com-registro" | "sem-registro" | "com-aposta";

export type Dia = {
  /** Rótulo do dia. Exibido apenas nas âncoras, em IBM Plex Mono. */
  rotulo: string;
  estado: EstadoDoDia;
};

/* Geometria, em unidades do viewBox. */
const PASSO = 12;
const MARGEM = 6;
const BASE_Y = 40;
const ALTURA_MARCA = 22;
/** Único desvio permitido: o dia sem registro é mais curto (regra 2). */
const ALTURA_SEM_REGISTRO = 9;
const LARGURA_MARCA = 3;

export function Linha({
  dias,
  indiceDeHoje,
  className = "",
}: {
  dias: readonly Dia[];
  /** Posição do dia corrente. Ausente = nenhum dia é destacado. */
  indiceDeHoje?: number;
  className?: string;
}) {
  const largura = MARGEM * 2 + Math.max(0, dias.length - 1) * PASSO;

  return (
    <svg
      viewBox={`0 0 ${largura} ${BASE_Y + 8}`}
      className={`w-full ${className}`.trim()}
      role="img"
      aria-label={`Trajetória de ${dias.length} dias`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/*
        Regra 1: a base é um traço só, do início ao fim, desenhado antes das
        marcas. Não há como interrompê-la a partir dos dados — nenhum estado
        de dia altera esta linha.
      */}
      <line
        x1={0}
        y1={BASE_Y}
        x2={largura}
        y2={BASE_Y}
        stroke="var(--color-pedra)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {dias.map((dia, i) => {
        const x = MARGEM + i * PASSO;
        const ehHoje = i === indiceDeHoje;

        // Regra 2: a altura NÃO é função de desempenho. É constante, exceto
        // pelo dia sem registro, que é o único caso previsto.
        const altura =
          dia.estado === "sem-registro" ? ALTURA_SEM_REGISTRO : ALTURA_MARCA;

        const cor = ehHoje ? "var(--color-mineral-claro)" : "var(--color-cal)";

        // Regra 3: dia com aposta é vazado — contorno, sem preenchimento.
        const vazado = dia.estado === "com-aposta";

        return (
          <rect
            key={`${dia.rotulo}-${i}`}
            x={x - LARGURA_MARCA / 2}
            y={BASE_Y - altura}
            width={LARGURA_MARCA}
            height={altura}
            rx={1}
            fill={vazado ? "none" : cor}
            stroke={vazado ? cor : "none"}
            strokeWidth={vazado ? 1 : 0}
          />
        );
      })}
    </svg>
  );
}

/**
 * Dados de demonstração. Não representam ninguém e não vêm do banco —
 * existem para exercitar o componente em teste e em revisão visual.
 */
export const DIAS_DE_EXEMPLO: readonly Dia[] = [
  { rotulo: "01", estado: "com-registro" },
  { rotulo: "02", estado: "com-registro" },
  { rotulo: "03", estado: "sem-registro" },
  { rotulo: "04", estado: "com-registro" },
  { rotulo: "05", estado: "com-aposta" },
  { rotulo: "06", estado: "com-registro" },
  { rotulo: "07", estado: "com-registro" },
  { rotulo: "08", estado: "sem-registro" },
  { rotulo: "09", estado: "com-registro" },
  { rotulo: "10", estado: "com-registro" },
  { rotulo: "11", estado: "com-aposta" },
  { rotulo: "12", estado: "com-registro" },
  { rotulo: "13", estado: "com-registro" },
  { rotulo: "14", estado: "com-registro" },
];
