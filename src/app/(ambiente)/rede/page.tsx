import type { Metadata } from "next";
import Link from "next/link";

import { IconeRede } from "@/components/marca/icones";
import { BarraDeAbas } from "@/components/nav/abas";
import { TopoDeTela } from "@/components/ui/topo";
import { Vazio } from "@/components/ui/vazio";

export const metadata: Metadata = { title: "Rede — Retoma" };

/**
 * Vazio, e não por falta de trabalho: por falta de dado.
 *
 * Op. §4 ("Rede") e Op. §10 descrevem pessoa de confiança, relação,
 * conhecimento sobre o problema e participação autorizada. **Nenhuma coluna
 * do schema guarda qualquer um desses fatos** — nem em `profiles`, nem em
 * lugar nenhum. §11.3 mantém "rede de apoio completa" fora do núcleo mínimo,
 * §8.1 nomeia `support_permissions` como entidade futura que ainda não
 * existe, e §4.3 coloca C-APOIO na Fase 8.
 *
 * Sem ação de convite, e isso é decisão, não omissão: oferecer "convidar
 * alguém" anteciparia C-APOIO. Sem consulta ao banco, porque não há tabela
 * para consultar — inventar uma leitura vazia seria teatro.
 *
 * O que mudou nesta rodada: o vazio ganhou saída. Antes ele era um beco.
 */
export default function RedePage() {
  return (
    <div className="flex min-h-screen w-full flex-col md:min-h-0 md:flex-1">
      <TopoDeTela titulo="Rede" />

      <Vazio icone={<IconeRede />} titulo="Ninguém acompanha você aqui ainda.">
        Compartilhar com alguém depende de uma escolha separada, que o Retoma
        ainda não oferece. Enquanto isso, seus registros ficam em{" "}
        <Link href="/hoje" className="underline underline-offset-4">
          Hoje
        </Link>{" "}
        e em{" "}
        <Link href="/trajetoria" className="underline underline-offset-4">
          Trajetória
        </Link>
        .
      </Vazio>

      <BarraDeAbas />
    </div>
  );
}
