import type { Metadata } from "next";

import { exigirAceite } from "@/lib/auth/sessao";

import { PrimeiraPergunta } from "./primeira-pergunta";

export const metadata: Metadata = {
  title: "Onboarding — Retoma",
};

export default async function OnboardingPage() {
  // §12.1: nenhum dado de dominio antes do aceite. Sem sessao ou sem aceite
  // corrente, esta rota nao renderiza — volta para a tela de aceite.
  await exigirAceite();

  return (
    <main className="min-h-screen bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <PrimeiraPergunta />
      </div>
    </main>
  );
}
