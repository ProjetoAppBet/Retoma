"use client";

import { useState, useTransition } from "react";

import { converterParaConta, sair } from "./acoes";

function Aviso({ texto }: { texto: string }) {
  return (
    <p
      role="alert"
      className="tipo-corpo mt-3 rounded-md border border-borda bg-superficie p-4 text-texto"
    >
      {texto}
    </p>
  );
}

/**
 * §4.3: C-CONTA não é pré-marcado. A caixa começa desmarcada e o envio é
 * recusado sem ela — na interface e também na ação de servidor.
 */
export function FormularioConversao({ jaConvertida }: { jaConvertida: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (jaConvertida) {
    return (
      <p className="tipo-corpo mt-3 text-texto-secundario">
        Sua conta permanente já está ativa.
      </p>
    );
  }

  return (
    <form
      action={(formData) =>
        iniciar(async () => {
          setErro(null);
          const r = await converterParaConta(formData);
          if (r?.erro) setErro(r.erro);
        })
      }
      className="mt-4 space-y-3"
    >
      <label className="block">
        <span className="tipo-apoio text-texto-secundario">E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1 h-12 w-full rounded-md border border-borda bg-superficie px-4 text-texto"
        />
      </label>

      <label className="block">
        <span className="tipo-apoio text-texto-secundario">Senha</span>
        <input
          type="password"
          name="senha"
          required
          autoComplete="new-password"
          className="mt-1 h-12 w-full rounded-md border border-borda bg-superficie px-4 text-texto"
        />
      </label>

      <label className="flex gap-3 pt-1">
        <input
          type="checkbox"
          name="consentimento"
          value="concedido"
          className="mt-1 size-4 shrink-0"
        />
        <span className="tipo-corpo text-texto-secundario">
          Concordo em guardar esse e-mail e essa senha para poder voltar.
        </span>
      </label>

      {erro && <Aviso texto={erro} />}

      <button
        type="submit"
        disabled={pendente}
        className="flex h-12 w-full items-center justify-center rounded-md bg-botao-primario px-5 text-base font-semibold text-botao-primario-texto transition hover:bg-botao-primario-hover disabled:opacity-60"
      >
        {pendente ? "Um instante…" : "Criar conta permanente"}
      </button>
    </form>
  );
}

/**
 * §17.5 (P-13): irreversível para identidade anônima. A consequência é dita
 * ANTES do ato, e a confirmação é explícita — não basta clicar em sair.
 */
export function FormularioSaida({ anonima }: { anonima: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <form
      action={(formData) =>
        iniciar(async () => {
          setErro(null);
          const r = await sair(formData);
          if (r?.erro) setErro(r.erro);
        })
      }
      className="mt-4 space-y-3"
    >
      {anonima && (
        <p className="tipo-corpo rounded-md border border-borda bg-superficie p-4 text-texto">
          Você ainda não tem conta permanente. Se sair agora, esta identidade se
          perde e <strong>ninguém consegue recuperá-la</strong> — nem você, nem
          o suporte. Seus dados continuam existindo, mas sem forma de acesso.
        </p>
      )}

      <label className="flex gap-3">
        <input
          type="checkbox"
          name="confirmacao"
          value="confirmado"
          className="mt-1 size-4 shrink-0"
        />
        <span className="tipo-corpo text-texto-secundario">
          {anonima
            ? "Entendo que não vou conseguir recuperar esta identidade."
            : "Quero encerrar a sessão neste aparelho."}
        </span>
      </label>

      {erro && <Aviso texto={erro} />}

      <button
        type="submit"
        disabled={pendente}
        className="flex h-12 w-full items-center justify-center rounded-md border border-borda px-5 text-base font-medium text-texto transition hover:bg-superficie disabled:opacity-60"
      >
        {pendente ? "Um instante…" : "Sair"}
      </button>
    </form>
  );
}
