import type { Metadata } from "next";
import Link from "next/link";

import { Simbolo } from "@/components/marca/simbolo";
import { Aviso } from "@/components/ui/aviso";
import { exigirAceite } from "@/lib/auth/sessao";
import { carregarConversa } from "@/lib/conversa/mensagens";

import { Escrever } from "./escrever";

export const metadata: Metadata = { title: "Conversa — Retoma" };

/**
 * A conversa, na medida em que ela existe.
 *
 * O que passou a existir: o que a pessoa escreve é **guardado** (§20, E-07).
 * O que continua não existindo: **resposta**. §14.4.30 proíbe a chamada ao
 * modelo enquanto D-04/P-07 estiver aberta, e P-05 mantém indefinida a
 * conduta diante de sinal de risco.
 *
 * Por isso a tela diz, em texto, que ninguém responde ainda. Deixar a pessoa
 * escrever e esperar em silêncio seria enganá-la — e num produto sobre
 * vergonha, escrever no vazio sem aviso é pior que uma tela desligada.
 *
 * Nenhuma resposta é fabricada, nenhum "digitando…", nenhum eco.
 *
 * Abre em tela cheia, sem barra de abas: conversar é um ato, não um destino.
 */

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ConversaPage() {
  await exigirAceite();

  const conversa = await carregarConversa();

  return (
    <main className="flex min-h-screen flex-col bg-fundo text-texto">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="flex items-center justify-between px-[22px] pt-[18px] pb-4">
          <span className="flex items-center gap-3">
            <Simbolo className="h-[17px] w-[30px] text-texto-secundario" />
            <span className="text-base font-medium">Retoma</span>
          </span>
          <Link href="/hoje" className="tipo-apoio text-texto-terciario">
            Fechar
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-end gap-5 px-[22px] pb-3">
          {conversa.erro ? (
            <Aviso>Não foi possível carregar a conversa agora.</Aviso>
          ) : conversa.mensagens.length === 0 ? (
            <>
              <p className="tipo-corpo text-center text-texto-secundario">
                Ainda não há nada aqui.
              </p>
              <p className="tipo-apoio text-center text-texto-terciario">
                O que você escrever fica guardado. Por enquanto, ninguém
                responde.
              </p>
            </>
          ) : (
            <ul className="flex flex-col gap-5">
              {conversa.mensagens.map((m) => (
                <li key={m.id}>
                  <p className="tipo-rotulo mb-1.5 text-texto-terciario">
                    {m.author === "usuário" ? "Você" : "Retoma"}
                    {" · "}
                    <span className="font-mono">
                      {HORA.format(new Date(m.createdAt))}
                    </span>
                  </p>
                  <p className="tipo-corpo whitespace-pre-wrap text-texto">
                    {m.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Escrever />
      </div>
    </main>
  );
}
