"use client";

import { useRef, useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";

import { enviarMensagem } from "./acoes";

/**
 * Campo de escrita.
 *
 * Mesma superfície que já existia na tela — h-12, rounded-xl, Grafite —,
 * agora ligada ao banco. Nenhuma cor, medida ou forma nova.
 *
 * A trava contra envio duplo é dupla: `disabled` cobre o clique, e o `ref`
 * cobre a janela entre o envio e o `pendente` virar verdadeiro — Enter duas
 * vezes seguidas passa por ali.
 *
 * Não existe indicador de "digitando": nada responde, e sugerir o contrário
 * seria mentir sobre o que o produto faz.
 */
export function Escrever() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const enviando = useRef(false);
  const campo = useRef<HTMLInputElement>(null);

  function enviar(formData: FormData) {
    if (enviando.current) return;
    enviando.current = true;

    iniciar(async () => {
      setErro(null);
      const r = await enviarMensagem({
        texto: String(formData.get("texto") ?? ""),
      });
      enviando.current = false;
      if ("erro" in r) setErro(r.erro);
      else if (campo.current) campo.current.value = "";
    });
  }

  return (
    <div className="px-[22px] pt-3 pb-[22px]">
      {erro && <Aviso className="mb-3">{erro}</Aviso>}

      <form
        action={enviar}
        className="flex h-12 items-center gap-2 rounded-xl bg-superficie pr-2 pl-5"
      >
        <input
          ref={campo}
          name="texto"
          required
          disabled={pendente}
          autoComplete="off"
          placeholder="Escrever…"
          aria-label="Escrever mensagem"
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-texto placeholder:text-texto-terciario focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pendente}
          aria-label="Enviar"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-superficie-elevada text-texto-secundario transition hover:text-texto disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[17px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19 V6 M7 11 V6 H17 V11" />
          </svg>
        </button>
      </form>
    </div>
  );
}
