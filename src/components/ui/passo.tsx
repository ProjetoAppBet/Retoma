/**
 * Indicador de etapa.
 *
 * Números em IBM Plex Mono com `tabular-nums`: toda quantidade do produto usa
 * a monoespaçada, e as tabulares evitam o tremor de largura quando o número
 * muda.
 *
 * ATENÇÃO — CF-10 está em aberto. Func. §22 define o onboarding como "seis
 * etapas mínimas" e AC-02 exige adaptação das perguntas; um total fixo afirma
 * uma precisão que o sistema pode não ter, o que colide com BR-12. Este
 * componente apenas encapsula o que já estava nas telas. Resolver CF-10 é
 * decisão de produto.
 */
export function Passo({ atual, total }: { atual: number; total: number }) {
  return (
    <span className="font-mono text-xs tabular-nums text-texto-terciario">
      Etapa {atual} de {total}
    </span>
  );
}
