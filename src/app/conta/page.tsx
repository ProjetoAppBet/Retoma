import type { Metadata } from "next";

import { exigirAceite } from "@/lib/auth/sessao";

import { FormularioConversao, FormularioSaida } from "./formulario";

export const metadata: Metadata = {
  title: "Sua conta — Retoma",
};

export default async function ContaPage() {
  // §12.1: rota protegida. Sem sessão ou sem aceite corrente, volta ao aceite.
  const usuario = await exigirAceite();

  // §3.6: nenhuma FUNCIONALIDADE é restringida por is_anonymous no MVP. Aqui a
  // claim não restringe nada — apenas decide qual aviso é verdadeiro, já que a
  // irreversibilidade de §3.5 só vale para quem não tem credencial.
  const anonima = usuario.is_anonymous ?? !usuario.email;

  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <h1 className="tipo-display">Sua conta</h1>

        <section className="mt-10">
          <h2 className="tipo-subtitulo text-texto">Guardar seu acesso</h2>
          <p className="tipo-corpo mt-2 text-texto-secundario">
            Criar uma conta permanente é opcional e não muda nada do que você já
            tem aqui.
          </p>
          <FormularioConversao jaConvertida={!anonima} />
        </section>

        <section className="mt-12">
          <h2 className="tipo-subtitulo text-texto">Encerrar sessão</h2>
          <FormularioSaida anonima={anonima} />
        </section>
      </div>
    </main>
  );
}
