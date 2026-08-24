import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { carregarDocumento } from "@/lib/consentimento/documento";
import { obterUsuario, possuiAceitePrincipal } from "@/lib/auth/sessao";

import { FormularioAceite } from "./formulario";

export const metadata: Metadata = {
  title: "Aceite — Retoma",
};

export default async function AceitePage() {
  // Quem já aceitou não é interrogado de novo (§4.3: nada é reapresentado
  // como condição). Quem não tem sessão simplesmente vê a tela — a identidade
  // só nasce do ato explícito (§5.1).
  if ((await obterUsuario()) && (await possuiAceitePrincipal())) {
    redirect("/onboarding");
  }

  const blocos = await carregarDocumento();

  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex-1">
          {blocos.map((bloco, i) => {
            if (bloco.tipo === "titulo") {
              return (
                <h1 key={i} className="tipo-display mb-6">
                  {bloco.texto}
                </h1>
              );
            }
            if (bloco.tipo === "secao") {
              return (
                <h2 key={i} className="tipo-subtitulo mt-8 mb-2 text-texto">
                  {bloco.texto}
                </h2>
              );
            }
            if (bloco.tipo === "lista") {
              const Tag = bloco.ordenada ? "ol" : "ul";
              return (
                <Tag
                  key={i}
                  className={`tipo-corpo mt-2 space-y-1 pl-5 text-texto-secundario ${
                    bloco.ordenada ? "list-decimal" : "list-disc"
                  }`}
                >
                  {bloco.itens.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </Tag>
              );
            }
            return (
              <p key={i} className="tipo-corpo mt-3 text-texto-secundario">
                {bloco.texto}
              </p>
            );
          })}
        </div>

        <FormularioAceite />
      </div>
    </main>
  );
}
