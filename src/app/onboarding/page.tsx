import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Tela } from "@/components/ui/cabecalho";

import { exigirAceite } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

import { Fluxo } from "./fluxo";

export const metadata: Metadata = {
  title: "Onboarding — Retoma",
};

export default async function OnboardingPage() {
  // §12.1: nenhum dado de dominio antes do aceite. Sem sessao ou sem aceite
  // corrente, esta rota nao renderiza — volta para a tela de aceite.
  await exigirAceite();

  // Identidade que já percorreu o onboarding inteiro não é interrogada de
  // novo: o fluxo grava raiz de cadeia, nunca correção (Q-10), então
  // repeti-lo duplicaria declarações. As três entidades presentes é o único
  // estado em que "já concluiu" é inequívoco — o parcial depende de decisão
  // de produto e está registrado como pendência.
  const supabase = await createClient();
  const [historico, objetivo, compromisso] = await Promise.all([
    supabase.from("gambling_history").select("id").limit(1),
    supabase.from("recovery_goals").select("id").limit(1),
    supabase.from("commitments").select("id").limit(1),
  ]);

  const concluido = [historico, objetivo, compromisso].every(
    (r) => (r.data?.length ?? 0) > 0,
  );
  if (concluido) redirect("/hoje");

  return (
    <Tela>
      <Fluxo />
    </Tela>
  );
}
