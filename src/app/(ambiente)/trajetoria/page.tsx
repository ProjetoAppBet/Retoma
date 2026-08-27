import type { Metadata } from "next";
import Link from "next/link";

import { IconeTrajetoria } from "@/components/marca/icones";
import { Linha } from "@/components/marca/linha";
import { BarraDeAbas } from "@/components/nav/abas";
import { Aviso } from "@/components/ui/aviso";
import { Dado } from "@/components/ui/dado";
import { Contexto, TopoDeTela } from "@/components/ui/topo";
import { Vazio } from "@/components/ui/vazio";
import {
  type CadeiaDeCompromisso,
  carregarHistoricoDeCompromissos,
} from "@/lib/ambiente/compromissos";
import { carregarTrajetoria } from "@/lib/ambiente/dias";

export const metadata: Metadata = { title: "Trajetória — Retoma" };

const FORMATO = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const FORMATO_LONGO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * A Linha em tamanho real, sangrada de borda a borda, e abaixo dela o
 * histórico real dos compromissos.
 *
 * Um número só, e é contagem — não pontuação. Sem média, sem tendência, sem
 * comparação entre períodos: qualquer um dos três transformaria continuidade
 * em placar.
 *
 * O histórico mostra o que está gravado e nada além. "Não cumpri" é "não
 * cumpri" — não é recaída. "Cumpri" é "cumpri" — não é "não apostou"
 * (§18.1.2). Nenhum estado clínico é derivado daqui.
 */

/** Rótulo do desfecho. Os mesmos termos dos botões do Hoje, sem tradução. */
function desfecho(cadeia: CadeiaDeCompromisso) {
  if (cadeia.outcome === "cumprido") return "Cumpri";
  if (cadeia.outcome === "não_cumprido") return "Não cumpri";
  return "Em aberto";
}

function Registro({ cadeia }: { cadeia: CadeiaDeCompromisso }) {
  const quando = cadeia.respondidoEm ?? cadeia.declaradoEm;

  return (
    <li className="border-t border-borda py-4 first:border-t-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="tipo-apoio text-texto-secundario">
          {desfecho(cadeia)}
        </span>
        <span className="font-mono text-[0.6875rem] text-texto-terciario">
          {FORMATO_LONGO.format(new Date(quando))}
        </span>
      </div>

      {cadeia.declaracao && (
        <p className="tipo-corpo mt-1.5 text-texto">{cadeia.declaracao}</p>
      )}

      {/*
        A correção não é escondida nem apagada: Q-10 preserva a declaração
        anterior, e a trajetória diz que houve correção sem transformar isso
        em julgamento.
      */}
      {cadeia.correcoes > 0 && (
        <p className="tipo-apoio mt-1.5 text-texto-terciario">
          {cadeia.correcoes === 1
            ? "corrigido uma vez"
            : `corrigido ${cadeia.correcoes} vezes`}
        </p>
      )}
    </li>
  );
}

export default async function TrajetoriaPage() {
  const [t, historico] = await Promise.all([
    carregarTrajetoria(42),
    carregarHistoricoDeCompromissos(),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col md:min-h-0 md:flex-1">
      <TopoDeTela
        titulo="Trajetória"
        direita={
          t.inicio ? <Contexto>desde {FORMATO.format(t.inicio)}</Contexto> : null
        }
      />

      <div className="px-[22px] pt-2.5">
        <Dado unidade="dias acompanhados">{t.total}</Dado>
      </div>

      <section className="mt-[30px] bg-superficie pt-6">
        <Linha dias={t.dias} indiceDeHoje={t.indiceDeHoje} />
        <div className="flex justify-between px-[22px] pt-2.5 pb-[18px]">
          <span className="font-mono text-[0.6875rem] text-texto-terciario">
            {t.inicio ? FORMATO.format(t.inicio) : "início"}
          </span>
          <span className="font-mono text-[0.6875rem] text-destaque-sobre-escuro">
            hoje
          </span>
        </div>
      </section>

      {/*
        Sem legenda a Linha é bonita e muda.

        "com aposta" saiu da legenda: nenhuma entidade registra dia de aposta
        (§18.1.3), o estado nunca é produzido, e nomeá-lo aqui anunciaria uma
        leitura que o produto não faz. Volta quando existir fonte declarada.
      */}
      <div className="flex flex-wrap gap-[18px] px-[22px] pt-[18px]">
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-[3px] rounded-sm bg-texto" />
          <span className="tipo-apoio text-texto-terciario">com registro</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-[3px] rounded-sm bg-texto" />
          <span className="tipo-apoio text-texto-terciario">sem registro</span>
        </span>
      </div>

      <section className="mt-[30px] flex flex-1 flex-col px-[22px] pb-6">
        <p className="tipo-rotulo mb-1 text-texto-terciario">Compromissos</p>

        {historico.erro ? (
          <Aviso className="mt-3">
            Não foi possível carregar seu histórico agora.
          </Aviso>
        ) : historico.cadeias.length === 0 ? (
          <Vazio icone={<IconeTrajetoria />} titulo="Nada registrado ainda.">
            Seu primeiro compromisso aparece aqui depois que você o guardar em{" "}
            <Link href="/hoje" className="underline underline-offset-4">
              Hoje
            </Link>
            .
          </Vazio>
        ) : (
          <ul>
            {historico.cadeias.map((cadeia) => (
              <Registro key={cadeia.id} cadeia={cadeia} />
            ))}
          </ul>
        )}
      </section>

      <BarraDeAbas />
    </div>
  );
}
