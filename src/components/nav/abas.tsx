"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconeCheckIn,
  IconePlano,
  IconeRede,
  IconeTrajetoria,
} from "@/components/marca/icones";

/**
 * Navegação do ambiente — quatro destinos.
 *
 * O que separa navegação de "quatro links no rodapé" é anatomia: pílula de
 * estado ativo, hairline superior, área segura embaixo, rótulo pequeno sob
 * ícone de 22 px. A pílula em Grafite Elevado é o mesmo par visual da opção
 * selecionada no onboarding.
 *
 * Mineral Claro só no ativo — é o único significado que a cor tem no sistema:
 * "onde você está agora".
 *
 * Quatro, não cinco: a conta vive no topo, e a conversa não é destino — nasce
 * de Hoje, em tela cheia. Dar-lhe aba afirmaria arquitetura que D-04 não
 * decidiu.
 */

const DESTINOS = [
  { href: "/hoje", rotulo: "Hoje", Icone: IconeCheckIn },
  { href: "/trajetoria", rotulo: "Trajetória", Icone: IconeTrajetoria },
  { href: "/plano", rotulo: "Plano", Icone: IconePlano },
  { href: "/rede", rotulo: "Rede", Icone: IconeRede },
] as const;

export function BarraDeAbas() {
  const atual = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="mt-auto flex bg-fundo pb-3.5 shadow-[inset_0_1px_0_var(--color-borda)] md:hidden"
    >
      {DESTINOS.map(({ href, rotulo, Icone }) => {
        const ativo = atual === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1.5 pt-2.5 text-[0.6875rem] tracking-[0.03em] ${
              ativo ? "text-destaque-sobre-escuro" : "text-texto-terciario"
            }`}
          >
            <span
              className={`flex h-[30px] w-11 items-center justify-center rounded-md ${
                ativo ? "bg-superficie-elevada" : ""
              }`}
            >
              <Icone />
            </span>
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Desktop: o mesmo conjunto vira trilho à esquerda. Não é outro produto — são
 * os mesmos quatro destinos e a mesma pílula, em outra orientação.
 */
export function TrilhoLateral() {
  const atual = usePathname();

  return (
    <aside className="hidden w-[212px] shrink-0 flex-col gap-0.5 p-[22px_14px] shadow-[inset_-1px_0_0_var(--color-borda)] md:flex">
      <div className="flex items-center gap-3 px-2.5 pb-[22px] text-texto-secundario">
        <svg viewBox="13 28 70 40" className="h-[19px] w-[34px]" aria-hidden="true">
          <path
            d="M 19 62 L 43 62 L 43 34 L 77 34"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="tipo-wordmark text-[0.8125rem]">RETOMA</span>
      </div>

      {DESTINOS.map(({ href, rotulo, Icone }) => {
        const ativo = atual === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center gap-3.5 rounded-md px-3 py-2.5 text-[0.9375rem] ${
              ativo
                ? "bg-superficie-elevada text-destaque-sobre-escuro"
                : "text-texto-terciario hover:text-texto-secundario"
            }`}
          >
            <Icone />
            {rotulo}
          </Link>
        );
      })}

      <Link
        href="/conta"
        className="mt-auto flex items-center gap-3.5 rounded-md px-3 py-2.5 text-[0.9375rem] text-texto-terciario hover:text-texto-secundario"
      >
        Sua conta
      </Link>
    </aside>
  );
}
