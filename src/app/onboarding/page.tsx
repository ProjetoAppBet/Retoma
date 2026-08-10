import type { Metadata } from "next";

import { PrimeiraPergunta } from "./primeira-pergunta";

export const metadata: Metadata = {
  title: "Onboarding — Retoma",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <PrimeiraPergunta />
      </div>
    </main>
  );
}
