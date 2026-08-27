import { createClient } from "@/lib/supabase/server";

/**
 * Leitura da conversa.
 *
 * §20 (E-07) autorizou a existência de conversa e mensagem; §20.4 mantém
 * fora tudo o mais. Este módulo lê conteúdo bruto e **não deriva nada**:
 * nenhum fato, nenhuma hipótese, nenhum padrão, nenhum resumo. Memória e
 * padrões seguem vedados (§20.4.5), e Op. §2 é explícita — inferência não
 * vira fato automaticamente.
 *
 * A RLS limita a leitura ao dono (§7.3): não há filtro por `user_id` no
 * código porque pedir o que não é seu devolve conjunto vazio.
 *
 * Nenhuma escrita acontece aqui. Renderizar a página não cria conversa —
 * a linha nasce quando a pessoa escreve a primeira mensagem.
 */

export type Autor = "usuário" | "ia";

export type Mensagem = {
  id: string;
  author: Autor;
  content: string;
  createdAt: string;
};

export type Conversa = {
  /** Nulo quando a pessoa ainda não escreveu nada. */
  id: string | null;
  mensagens: Mensagem[];
  /** A consulta falhou. Distinto de "não há conversa". */
  erro: boolean;
};

/**
 * Conversa corrente e suas mensagens.
 *
 * Duas consultas, e as duas são necessárias: a primeira acha o fio, a
 * segunda o lê. Sem a primeira não há `conversation_id` para filtrar.
 *
 * Ordenação: a mais recente das conversas, com desempate por `id` pela
 * razão de L-04. As mensagens em ordem crescente — num diálogo, a ordem é
 * o próprio significado —, também com desempate por `id`. A garantia vem da
 * cláusula ORDER BY, não do índice.
 */
export async function carregarConversa(): Promise<Conversa> {
  const supabase = await createClient();

  const { data: fios, error: erroFio } = await supabase
    .from("conversations")
    .select("id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (erroFio) return { id: null, mensagens: [], erro: true };

  const fio = (fios ?? [])[0] as { id: string } | undefined;
  if (!fio) return { id: null, mensagens: [], erro: false };

  const { data, error } = await supabase
    .from("messages")
    .select("id, author, content, created_at")
    .eq("conversation_id", fio.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) return { id: fio.id, mensagens: [], erro: true };

  const mensagens = ((data ?? []) as {
    id: string;
    author: string;
    content: string;
    created_at: string;
  }[]).map((m) => ({
    id: m.id,
    author: m.author as Autor,
    content: m.content,
    createdAt: m.created_at,
  }));

  return { id: fio.id, mensagens, erro: false };
}
