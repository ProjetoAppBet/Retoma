"use client";

import { Botao } from "@/components/ui/botao";
import { Simbolo } from "@/components/marca/simbolo";

/**
 * Fronteira de erro da aplicação.
 *
 * Sem este arquivo, uma falha em qualquer componente de servidor cai na tela
 * padrão do Next — em produção, uma página em inglês, sem identidade e sem
 * saída. Aqui a pessoa vê onde está e tem um caminho de volta.
 *
 * O texto é deliberadamente seco e curto. Nada de tranquilização, nada de
 * conselho: P-05 mantém indefinida a conduta diante de sinal de risco, e uma
 * tela de erro não é lugar de improvisar tom clínico.
 *
 * O objeto `error` NÃO é exibido: mensagem de exceção pode carregar detalhe
 * de infraestrutura, e nada obriga a mostrá-lo. Ele continua chegando ao log
 * do servidor, que é onde detalhe técnico pertence.
 */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center bg-fundo text-texto">
      <div className="mx-auto w-full max-w-md px-6">
        <Simbolo className="mb-6 h-7 w-12 text-texto-secundario" />

        <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
          Algo não funcionou aqui.
        </h1>
        <p className="tipo-corpo mt-3 text-texto-secundario">
          Seus registros continuam guardados. Você pode tentar de novo.
        </p>

        <div className="mt-8">
          <Botao onClick={() => reset()}>Tentar de novo</Botao>
        </div>
      </div>
    </main>
  );
}
