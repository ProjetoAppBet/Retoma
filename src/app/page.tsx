import Link from "next/link";

import { Linha, type Dia } from "@/components/marca/linha";
import { Simbolo } from "@/components/marca/simbolo";
import { Wordmark } from "@/components/marca/wordmark";

/**
 * Abertura.
 *
 * A Linha sangrada ocupa o lugar que antes era de três cards com borda. Ela
 * não é dado de ninguém — é o elemento gráfico da marca, e diz o que o produto
 * é (dias que continuam) em vez de listar benefícios.
 *
 * Não usa o container `Tela` porque precisa sangrar até a borda; o miolo de
 * texto mantém a mesma largura de leitura do resto do produto.
 */

/* Composição fixa da marca. Nenhum dado real, nenhuma leitura. */
const GESTO: readonly Dia[] = [
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "sem-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-aposta" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "sem-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-aposta" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-registro" },
  { rotulo: "", estado: "com-registro" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="flex flex-1 items-end opacity-55">
          <Linha dias={GESTO} indiceDeHoje={GESTO.length - 1} />
        </div>

        <div className="px-6 pt-10">
          <Simbolo className="mb-5 h-8 w-14 text-texto" />
          <Wordmark className="mb-4 text-sm text-texto-secundario" />

          <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
            Você não precisa resolver tudo hoje.
          </h1>

          <p className="tipo-corpo mt-4 text-texto-secundario">
            Um passo por dia, guardado por você.
          </p>
        </div>

        <div className="px-6 pt-8 pb-7">
          <Link
            href="/aceite"
            className="flex h-12 w-full items-center justify-center rounded-md bg-botao-primario px-5 text-center text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover"
          >
            Começar
          </Link>

          <p className="tipo-apoio mt-4 text-center text-texto-terciario">
            O Retoma não substitui atendimento profissional.
          </p>
        </div>
      </div>
    </main>
  );
}
