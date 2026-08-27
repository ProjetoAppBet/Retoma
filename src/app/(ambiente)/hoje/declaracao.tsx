"use client";

import { useRef, useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo";

import { declararCompromisso } from "./acoes";

/**
 * Declarar um compromisso quando não há nenhum ativo.
 *
 * §18.1.1: sem compromisso ativo o "Hoje" não pergunta cumpriu ou não
 * cumpriu — não há sujeito para a pergunta. O que ele oferece é declarar.
 *
 * Sem prazo na interface: Op. §12 fixa 24 horas para o compromisso INICIAL,
 * e o horizonte dos seguintes não está decidido (P-31). Pedir prazo aqui, ou
 * assumir 24 horas, afirmaria o que o produto não definiu.
 *
 * A trava contra envio duplo é dupla de propósito: `disabled` cobre o clique,
 * e o `ref` cobre a janela entre o clique e o `pendente` virar verdadeiro —
 * duas teclas Enter em sequência passam por ali. A garantia de verdade é a
 * trava por usuário no banco (§19.1.1); esta aqui evita a ida à rede.
 */
export function DeclararCompromisso() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const enviando = useRef(false);

  function enviar(formData: FormData) {
    if (enviando.current) return;
    enviando.current = true;

    iniciar(async () => {
      setErro(null);
      const r = await declararCompromisso({
        commitmentDeclaration: String(formData.get("compromisso") ?? ""),
      });
      enviando.current = false;
      if ("erro" in r) setErro(r.erro);
    });
  }

  return (
    <form action={enviar}>
      <label className="block">
        <span className="tipo-corpo text-texto-secundario">
          Escolha algo pequeno e possível.
        </span>
        <CampoTexto
          name="compromisso"
          rows={3}
          required
          disabled={pendente}
          className="mt-3 disabled:opacity-60"
        />
      </label>

      {erro && <Aviso className="mt-3">{erro}</Aviso>}

      <div className="mt-3.5">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Um instante…" : "Guardar compromisso"}
        </Botao>
      </div>
    </form>
  );
}
