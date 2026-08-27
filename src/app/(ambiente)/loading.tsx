/**
 * Fallback do ambiente enquanto os dados do servidor chegam.
 *
 * Sem este arquivo não há fronteira de suspense no grupo, e a navegação entre
 * abas fica parada na tela anterior até a próxima resolver. Não é decoração:
 * é a diferença entre "carregando" e "travou".
 *
 * Sem animação e sem esqueleto que finja conteúdo: um bloco de conteúdo falso
 * anunciaria dado que talvez não exista. `aria-busy` diz o que está
 * acontecendo a quem usa leitor de tela.
 */
export default function Carregando() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen w-full items-center justify-center md:min-h-0 md:flex-1"
    >
      <span className="tipo-apoio text-texto-terciario">Carregando…</span>
    </div>
  );
}
