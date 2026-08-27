import type { Metadata } from "next";
import Link from "next/link";

import { IconePlano, IconeRetomar } from "@/components/marca/icones";
import { Linha } from "@/components/marca/linha";
import { BarraDeAbas } from "@/components/nav/abas";
import { Chevron, Faixa, Pilha } from "@/components/ui/faixa";
import { Contexto, TopoDeTela } from "@/components/ui/topo";
import { carregarCompromissoAtivo } from "@/lib/ambiente/compromissos";
import { carregarTrajetoria } from "@/lib/ambiente/dias";

import { DeclararCompromisso } from "./declaracao";
import { RespostaDoCompromisso } from "./resposta";

export const metadata: Metadata = { title: "Hoje — Retoma" };

const FORMATO = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

/** Horas inteiras que faltam até o prazo. Nunca negativo. */
function horasRestantes(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (60 * 60 * 1000)) : 0;
}

export default async function HojePage() {
  const [compromisso, trajetoria] = await Promise.all([
    carregarCompromissoAtivo(),
    carregarTrajetoria(14),
  ]);
  const horas = horasRestantes(compromisso?.due_at ?? null);

  return (
    <div className="flex min-h-screen w-full flex-col md:min-h-0 md:flex-1">
      <TopoDeTela
        titulo="Hoje"
        direita={<Contexto>{FORMATO.format(new Date())}</Contexto>}
      />

      {/*
        O estado do dia e A Linha ocupam a MESMA superfície. Separá-los seria
        admitir que a Linha é ilustração; aqui ela contextualiza o estado.
      */}
      <section className="mx-[22px] overflow-hidden rounded-lg bg-superficie">
        <div className="p-5 pb-4">
          <p className="tipo-rotulo mb-2.5 text-texto-terciario">
            Compromisso de hoje
          </p>
          {compromisso?.commitment_declaration ? (
            <p className="text-[1.1875rem] leading-[1.42] tracking-[-0.01em]">
              {compromisso.commitment_declaration}
            </p>
          ) : (
            <p className="tipo-corpo text-texto-secundario">
              Você ainda não registrou um compromisso.
            </p>
          )}
          {horas !== null && (
            <p className="mt-3.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-medium tabular-nums text-destaque-sobre-escuro">
                {horas}
              </span>
              <span className="tipo-apoio text-texto-terciario">
                {horas === 1 ? "hora restante" : "horas restantes"}
              </span>
            </p>
          )}
        </div>
        <div className="bg-superficie-elevada pt-3.5">
          <Linha dias={trajetoria.dias} indiceDeHoje={trajetoria.indiceDeHoje} />
          <div className="flex justify-between px-5 pt-2 pb-3">
            <span className="font-mono text-[0.6875rem] text-texto-terciario">
              há {trajetoria.dias.length} dias
            </span>
            <span className="font-mono text-[0.6875rem] text-destaque-sobre-escuro">
              hoje
            </span>
          </div>
        </div>
      </section>

      {/*
        Um slot, dois estados, nunca os dois. Com compromisso ATIVO (§18.2), a
        tríade de Q-06; sem ele, a declaração que §18.1.1 autoriza o "Hoje" a
        oferecer. Sem sujeito a pergunta "cumpriu?" não tem referente — e
        Q-11 (§18.1) é explícita: o que se registra é o resultado DE UM
        COMPROMISSO, nunca o resultado de um dia.
      */}
      <section className="mx-[22px] mt-3.5">
        {compromisso ? (
          <RespostaDoCompromisso commitmentId={compromisso.id} />
        ) : (
          <DeclararCompromisso />
        )}
      </section>

      <section className="mx-[22px] mt-[22px]">
        <p className="tipo-rotulo mb-2.5 text-texto-terciario">Também hoje</p>
        <Pilha>
          <Link href="/conversa">
            <Faixa className="cursor-pointer">
              <IconeRetomar />
              Contar como foi o dia
              <Chevron />
            </Faixa>
          </Link>
          <Link href="/plano">
            <Faixa className="cursor-pointer">
              <IconePlano />
              Ver seu plano
              <Chevron />
            </Faixa>
          </Link>
        </Pilha>
      </section>

      <BarraDeAbas />
    </div>
  );
}
