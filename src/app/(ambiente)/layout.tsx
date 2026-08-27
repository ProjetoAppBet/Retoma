import type { ReactNode } from "react";

import { TrilhoLateral } from "@/components/nav/abas";
import { exigirAceite } from "@/lib/auth/sessao";

/**
 * Moldura do ambiente — o território com navegação.
 *
 * A fronteira com o fluxo é visível: início, aceite, onboarding e conclusão
 * não têm barra de abas. Aqui, têm.
 *
 * Mobile: coluna única com a barra embaixo. Desktop: trilho à esquerda e a
 * MESMA coluna no centro, sem esticar — o ganho da tela grande é contexto
 * lateral, não linha mais longa.
 */
export default async function AmbienteLayout({
  children,
}: {
  children: ReactNode;
}) {
  // §12.1: nenhuma área com dados do usuário abre sem C-PRINCIPAL concedido.
  await exigirAceite();

  return (
    <div className="flex min-h-screen bg-fundo text-texto">
      <TrilhoLateral />
      <main className="flex min-h-screen flex-1 flex-col md:mx-auto md:max-w-[812px] md:flex-row md:items-start">
        {children}
      </main>
    </div>
  );
}
