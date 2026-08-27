"use client";

import { useState, useTransition } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";

import { aceitar, recusar } from "./acoes";

/**
 * §4.3: o aceite não é pré-marcado. O botão é o ato explícito — não há
 * checkbox marcado por padrão, e recusar é uma saída de mesmo peso visual,
 * sem retenção (§5.2).
 */
export function FormularioAceite() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="pt-8">
      {erro && <Aviso className="mb-4">{erro}</Aviso>}

      <Botao
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const resultado = await aceitar();
            if (resultado?.erro) setErro(resultado.erro);
          })
        }
      >
        {pendente ? "Um instante…" : "Aceitar e começar"}
      </Botao>

      {/* §5.2: recusar tem o mesmo peso visual que aceitar. */}
      <Botao
        variante="secundario"
        className="mt-3"
        disabled={pendente}
        onClick={() => iniciar(() => recusar())}
      >
        Não aceitar
      </Botao>
    </div>
  );
}
