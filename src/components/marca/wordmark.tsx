/**
 * Wordmark. A marca é sempre grafada RETOMA, com um único O, em caixa alta.
 * Archivo 600 com tracking +60/1000 em — ver `.tipo-wordmark`.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <p className={`tipo-wordmark ${className}`.trim()}>RETOMA</p>
  );
}
