import Link from "next/link";

import { Simbolo } from "@/components/marca/simbolo";

/**
 * 404. Existe para que um endereço errado não caia na tela padrão do Next,
 * em inglês e sem saída.
 *
 * O link leva à abertura, não a `/hoje`: quem chega aqui pode não ter sessão,
 * e `/hoje` só devolveria um redirecionamento para o aceite.
 */
export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center bg-fundo text-texto">
      <div className="mx-auto w-full max-w-md px-6">
        <Simbolo className="mb-6 h-7 w-12 text-texto-secundario" />

        <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
          Esta página não existe.
        </h1>
        <p className="tipo-corpo mt-3 text-texto-secundario">
          O endereço pode ter mudado.
        </p>

        <Link
          href="/"
          className="tipo-corpo mt-8 inline-block underline underline-offset-4"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
