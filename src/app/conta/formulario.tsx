"use client";

import { useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { CampoLinha, Rotulo } from "@/components/ui/campo";

import { converterParaConta, sair } from "./acoes";

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
        <Rotulo>E-mail</Rotulo>
        <CampoLinha type="email" name="email" required autoComplete="email" className="mt-1" />
      </label>

      <label className="block">
        <Rotulo>Senha</Rotulo>
        <CampoLinha
          type="password"
          name="senha"
          required
          autoComplete="new-password"
          className="mt-1"
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

      {erro && <Aviso className="mt-3">{erro}</Aviso>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Um instante…" : "Criar conta permanente"}
      </Botao>
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
        <p className="tipo-corpo rounded-md bg-superficie p-4 text-texto">
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

      {erro && <Aviso className="mt-3">{erro}</Aviso>}

      <Botao variante="secundario" type="submit" disabled={pendente}>
        {pendente ? "Um instante…" : "Sair"}
      </Botao>
    </form>
  );
}
