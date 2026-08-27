/**
 * Variáveis de ambiente do Supabase, lidas e conferidas num lugar só.
 *
 * Antes, cada fábrica de cliente lia `process.env...!`. Faltando a variável,
 * o `!` deixa passar `undefined` e o erro só aparece lá dentro da biblioteca,
 * como falha de rede ou de URL inválida — difícil de ler num deploy novo.
 * Aqui a falta vira erro imediato, dizendo qual variável falta.
 *
 * Só valores públicos: §12.8 mantém segredo fora do cliente, e a chave
 * publicável do Supabase é protegida por RLS, não por sigilo.
 */

function exigir(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Veja .env.example e configure ` +
        `o ambiente antes de subir a aplicação.`,
    );
  }
  return valor;
}

export function urlDoSupabase(): string {
  return exigir(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function chavePublicaDoSupabase(): string {
  return exigir(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
