"use client";

import { useRef, useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";

import { registrarResultado } from "./acoes";

/**
 * As três respostas de Q-06, com peso idêntico: não cumprir não é erro, e a
 * interface não pode sugerir o contrário. Nenhuma das três recebe cor de
 * estado — a identidade não tem verde de sucesso nem vermelho de erro.
 *
 * "Depois" (§18.3) **não grava absolutamente nada**: sem ação de servidor,
 * sem linha nova, sem alteração de `outcome`. Ele apenas encerra a interação
 * atual — o compromisso permanece exatamente como estava, e `outcome is null`
 * já é a representação de "declarado e ainda não respondido". Nada é
 * persistido, então recarregar a página traz a pergunta de volta: adiar vale
 * para esta visita, e inventar persistência para ele seria inventar P-29.
 *
 * Trava contra envio duplo em duas camadas: `disabled` cobre o clique, e o
 * `ref` cobre a janela entre o clique e o `pendente` virar verdadeiro. A
 * garantia de verdade continua sendo a do banco — §19.1.1 (trava por
 * usuário) e a recusa de responder versão já superada.
 */
export function RespostaDoCompromisso({ commitmentId }: { commitmentId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [adiado, setAdiado] = useState(false);
  const [pendente, iniciar] = useTransition();
  const enviando = useRef(false);

  if (adiado) return null;

  function responder(outcome: string) {
    if (enviando.current) return;
    enviando.current = true;

    iniciar(async () => {
      setErro(null);
      const r = await registrarResultado({ commitmentId, outcome });
      enviando.current = false;
      if ("erro" in r) setErro(r.erro);
    });
  }

  return (
    <>
      <div className="flex gap-0.5">
        <button
          type="button"
          disabled={pendente}
          onClick={() => responder("cumprido")}
          className="h-[52px] flex-1 rounded-l-md bg-superficie text-[0.9375rem] text-texto transition hover:bg-superficie-elevada disabled:opacity-60"
        >
          Cumpri
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => responder("não_cumprido")}
          className="h-[52px] flex-1 bg-superficie text-[0.9375rem] text-texto transition hover:bg-superficie-elevada disabled:opacity-60"
        >
          Não cumpri
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => setAdiado(true)}
          className="h-[52px] flex-1 rounded-r-md bg-superficie text-[0.9375rem] text-texto-secundario transition hover:bg-superficie-elevada disabled:opacity-60"
        >
          Depois
        </button>
      </div>

      {erro && <Aviso className="mt-2.5">{erro}</Aviso>}
    </>
  );
}
