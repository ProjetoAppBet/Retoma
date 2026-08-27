import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Tela } from "@/components/ui/cabecalho";

import { Simbolo } from "@/components/marca/simbolo";
import { carregarDocumento } from "@/lib/consentimento/documento";
import { VERSAO_ACEITE_PRINCIPAL } from "@/lib/consentimento/versao";
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
    <Tela>
      {/*
        Moldura de aplicativo, documento intacto. O identificador da versão
        aparece no topo, em mono: é auditoria visível e reforça que aquilo é
        um documento com versão (§10.2, §17.2). Nada de accordion, nada atrás
        de link — o texto permanece integral na tela.
      */}
      <header className="flex items-center gap-3 pb-3">
        <Simbolo className="h-[17px] w-[30px] text-texto-secundario" />
        <span className="font-mono text-[0.6875rem] text-texto-terciario">
          {VERSAO_ACEITE_PRINCIPAL.replace("consentimento-principal-", "")}
        </span>
      </header>

      <div className="relative flex-1">
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

        {/* Dica de continuação; o conteúdo segue integral acima. */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 h-16 bg-gradient-to-b from-transparent to-fundo"
        />
      </div>

      <FormularioAceite />
    </Tela>
  );
}
