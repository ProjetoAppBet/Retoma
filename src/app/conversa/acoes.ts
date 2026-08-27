"use server";

import { revalidatePath } from "next/cache";

import { exigirAceite } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

/**
 * Envio de mensagem.
 *
 * §12.2: mutação por caso de uso no servidor. §20.3.1: a identidade vai no
 * `user_id`, e a RLS confere que ela é a da sessão — `with check (user_id =
 * auth.uid())`. A mensagem carrega ainda a chave composta
 * (user_id, conversation_id), que impede pendurar mensagem no fio de outra
 * identidade (mesmo mecanismo de R5).
 *
 * NENHUMA CHAMADA A MODELO. §14.4.30 permanece íntegra e D-04/P-07 segue
 * aberta: nada aqui contata provedor, e nada aqui produz resposta. Uma
 * resposta fabricada seria pior que a ausência dela.
 *
 * Nada é derivado da mensagem: sem resumo, sem rótulo, sem extração de fato.
 * §20.4.5 mantém memória e padrões vedados.
 */

export type Resultado = { erro: string } | { ok: true };

/** Q-06 tem análogo aqui: o domínio de `author` é fechado no CHECK. */
const AUTOR_USUARIO = "usuário";

export async function enviarMensagem(entrada: {
  texto: string;
}): Promise<Resultado> {
  const usuario = await exigirAceite();

  const texto = entrada.texto.trim();
  if (!texto) return { erro: "Escreva alguma coisa antes de enviar." };

  const supabase = await createClient();

  // O fio corrente, ou o primeiro. A conversa não nasce ao abrir a tela:
  // renderizar não é escrever, e uma linha vazia por visita seria lixo.
  const { data: fios, error: erroFio } = await supabase
    .from("conversations")
    .select("id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (erroFio) return { erro: "Não foi possível enviar agora. Tente de novo." };

  let conversaId = (fios ?? [])[0]?.id as string | undefined;

  if (!conversaId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: usuario.id })
      .select("id")
      .single();

    if (error || !data) {
      return { erro: "Não foi possível enviar agora. Tente de novo." };
    }
    conversaId = data.id as string;
  }

  const { error } = await supabase.from("messages").insert({
    user_id: usuario.id,
    conversation_id: conversaId,
    author: AUTOR_USUARIO,
    content: texto,
  });

  if (error) return { erro: "Não foi possível enviar agora. Tente de novo." };

  revalidatePath("/conversa");
  return { ok: true };
}
