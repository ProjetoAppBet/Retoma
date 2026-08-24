import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retoma",
};

/**
 * §5.2: recusar encerra o fluxo sem nova solicitação na mesma sessão, sem
 * modal de retenção e sem segunda tentativa de convencimento. Por isso esta
 * tela não tem botão de voltar ao aceite: oferecê-lo seria a segunda
 * tentativa que a decisão proíbe.
 *
 * §5.3 trata o abandono do mesmo modo. Nada foi persistido: nenhuma
 * identidade, nenhum dado, nenhum evento.
 *
 * O conteúdo definitivo desta tela é a pendência P-12 (Fase 3). O texto
 * abaixo é mínimo e não retém.
 */
export default function RecusaPage() {
  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <h1 className="tipo-display">Tudo bem.</h1>
        <p className="tipo-corpo mt-5 text-texto-secundario">
          Nada foi criado e nada foi guardado.
        </p>
        <p className="tipo-apoio mt-10 text-texto-secundario">
          O Retoma não substitui atendimento profissional.
        </p>
      </div>
    </main>
  );
}
