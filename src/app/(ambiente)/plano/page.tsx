import type { Metadata } from "next";
import Link from "next/link";

import { IconePlano } from "@/components/marca/icones";
import { BarraDeAbas } from "@/components/nav/abas";
import { Aviso } from "@/components/ui/aviso";
import { Contexto, TopoDeTela } from "@/components/ui/topo";
import { Vazio } from "@/components/ui/vazio";
import { carregarObjetivoCorrente } from "@/lib/ambiente/objetivo";

export const metadata: Metadata = { title: "Plano — Retoma" };

const FORMATO = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

/**
 * O plano, na medida exata em que ele existe.
 *
 * Op. §8 lista seis componentes: Objetivo, Motivação, Plano de ação, Plano
 * de enfrentamento, Estratégias pessoais e Revisão. Dois têm dado real —
 * são as Etapas 1 e 6 do onboarding, em `recovery_goals`. Os outros quatro
 * não têm entidade, e §11.3 os mantém fora do núcleo mínimo. A tela mostra
 * os dois que existem e não promete os quatro que não existem.
 *
 * Nada de compromissos aqui: Q-07 fixa que compromisso é independente de
 * plano. Eles vivem em Hoje e em Trajetória.
 *
 * Sem porcentagem, sem etapa "3 de 7", sem progresso. Um plano com barra de
 * progresso vira placar, e placar é exatamente o que este produto não é.
 */
export default async function PlanoPage() {
  const { objetivo, erro } = await carregarObjetivoCorrente();

  return (
    <div className="flex min-h-screen w-full flex-col md:min-h-0 md:flex-1">
      <TopoDeTela
        titulo="Plano"
        direita={
          objetivo ? (
            <Contexto>
              desde {FORMATO.format(new Date(objetivo.declaradoEm))}
            </Contexto>
          ) : null
        }
      />

      {erro ? (
        <div className="px-[22px] pt-2.5">
          <Aviso>Não foi possível carregar seu plano agora.</Aviso>
        </div>
      ) : !objetivo ? (
        <Vazio icone={<IconePlano />} titulo="Seu plano ainda não começou.">
          Ele começa pelo que você quer e por quê. Enquanto isso, o Retoma
          acompanha um compromisso de cada vez em{" "}
          <Link href="/hoje" className="underline underline-offset-4">
            Hoje
          </Link>
          .
        </Vazio>
      ) : (
        <div className="flex flex-1 flex-col gap-[30px] px-[22px] pt-2.5">
          {/* Op. §8 · Objetivo — "objetivo atual e significado de recuperação". */}
          <section>
            <p className="tipo-rotulo mb-2.5 text-texto-terciario">Objetivo</p>
            {objetivo.goalDeclaration ? (
              <p className="text-[1.1875rem] leading-[1.42] tracking-[-0.01em]">
                {objetivo.goalDeclaration}
              </p>
            ) : (
              <p className="tipo-corpo text-texto-secundario">
                Você ainda não escreveu o que quer conseguir.
              </p>
            )}
            {/*
              Q-02: o domínio é fechado e o valor veio de escolha explícita da
              pessoa na Etapa 6 — nunca de classificação do texto livre, que
              exigiria inferência. Aparece como ela o escolheu.
            */}
            <p className="tipo-apoio mt-2.5 text-texto-terciario">
              sobre as apostas: {objetivo.goalType}
            </p>
          </section>

          {/* Op. §8 · Motivação — "razões pessoais para mudar". */}
          {objetivo.motivationDeclaration && (
            <section>
              <p className="tipo-rotulo mb-2.5 text-texto-terciario">Motivação</p>
              <p className="tipo-corpo text-texto">
                {objetivo.motivationDeclaration}
              </p>
            </section>
          )}

          <p className="tipo-apoio mt-auto pb-6 text-texto-terciario">
            Isto é o que você declarou quando começou.
          </p>
        </div>
      )}

      <BarraDeAbas />
    </div>
  );
}
