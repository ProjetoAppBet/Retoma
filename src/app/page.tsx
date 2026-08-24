import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex-1">
          <div className="mb-16">
            {/* Símbolo oficial "A Retomada". Geometria imutável. */}
            <svg
              viewBox="13 28 70 40"
              className="mb-8 h-8 w-14 text-texto"
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

            <p className="tipo-wordmark mb-4 text-sm text-texto-secundario">
              RETOMA
            </p>

            <h1 className="tipo-display">Você não precisa resolver tudo hoje.</h1>

            <p className="tipo-corpo mt-5 text-texto-secundario">
              O Retoma ajuda você a entender seu momento, acompanhar sua
              recuperação e construir passos possíveis para seguir em frente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-borda bg-superficie p-5">
              <p className="tipo-subtitulo text-texto">Sem julgamento</p>
              <p className="tipo-corpo mt-1 text-texto-secundario">
                Uma recaída não apaga o que você já construiu.
              </p>
            </div>

            <div className="rounded-lg border border-borda bg-superficie p-5">
              <p className="tipo-subtitulo text-texto">Feito para você</p>
              <p className="tipo-corpo mt-1 text-texto-secundario">
                O sistema aprende com sua própria história, sem presumir seus
                gatilhos ou padrões.
              </p>
            </div>

            <div className="rounded-lg border border-borda bg-superficie p-5">
              <p className="tipo-subtitulo text-texto">Um passo de cada vez</p>
              <p className="tipo-corpo mt-1 text-texto-secundario">
                O objetivo é transformar recuperação em ações possíveis no
                cotidiano.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10">
          <Link
            href="/aceite"
            className="flex h-12 w-full items-center justify-center rounded-md bg-botao-primario px-5 text-center text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover"
          >
            Começar
          </Link>

          <p className="tipo-apoio mt-4 text-center text-texto-secundario">
            O Retoma não substitui atendimento profissional.
          </p>
        </div>
      </div>
    </main>
  );
}
