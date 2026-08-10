import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex-1">
          <div className="mb-16">
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black font-bold">
              R
            </div>

            <p className="mb-4 text-sm font-medium text-zinc-500">
              RETOMA
            </p>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Você não precisa resolver tudo hoje.
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-400">
              O Retoma ajuda você a entender seu momento, acompanhar sua
              recuperação e construir passos possíveis para seguir em frente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="text-sm font-medium text-zinc-200">
                Sem julgamento
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Uma recaída não apaga o que você já construiu.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="text-sm font-medium text-zinc-200">
                Feito para você
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                O sistema aprende com sua própria história, sem presumir seus
                gatilhos ou padrões.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="text-sm font-medium text-zinc-200">
                Um passo de cada vez
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                O objetivo é transformar recuperação em ações possíveis no
                cotidiano.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10">
          <Link
            href="/onboarding"
            className="block w-full rounded-2xl bg-white px-5 py-4 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Começar
          </Link>

          <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
            O Retoma não substitui atendimento profissional.
          </p>
        </div>
      </div>
    </main>
  );
}
