/**
 * Símbolo oficial "A Retomada". Geometria imutável.
 *
 * Regra da marca: o símbolo não é espelhado, inclinado, preenchido nem
 * inscrito em círculo. O viewBox e o path não devem ser alterados.
 */
export function Simbolo({ className = "h-8 w-14" }: { className?: string }) {
  return (
    <svg
      viewBox="13 28 70 40"
      className={className}
      role="img"
      aria-label="Retoma"
    >
      <path
        d="M 19 62 L 43 62 L 43 34 L 77 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
