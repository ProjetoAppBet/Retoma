/**
 * Trilho de progresso — 2 px, Mineral Claro sobre Grafite Elevado.
 *
 * Carrega a mesma informação do rótulo textual com uma fração do peso visual.
 * Funciona com ou sem total conhecido, o que importa: CF-10 continua aberta,
 * e se ela fechar por outro caminho só o rótulo muda, não este componente.
 */
export function Trilho({ fracao }: { fracao: number }) {
  const largura = Math.max(0, Math.min(1, fracao)) * 100;
  return (
    <div className="mx-[22px] h-0.5 overflow-hidden rounded-sm bg-superficie-elevada">
      <div
        className="h-full bg-destaque-sobre-escuro"
        style={{ width: `${largura}%` }}
      />
    </div>
  );
}
