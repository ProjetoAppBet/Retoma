import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Sessão e estado de aceite.
 *
 * Normativo: D-01/D-02/D-09 §3 (identidade pseudônima), §8.2 (o registro de
 * consentimento é append-only: o estado corrente é a linha mais recente),
 * §12.1 e §12.2.
 */

/** Identidade da sessão corrente, ou null se não houver sessão. */
export async function obterUsuario() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Estado corrente do aceite principal.
 *
 * §8.2: nada é sobrescrito; conceder e revogar são linhas novas. O estado
 * corrente é, portanto, a linha mais recente de C-PRINCIPAL. O desempate por
 * `id` segue a mesma razão de L-04 (§17 e 11.7): `now()` é o horário da
 * transação, então duas linhas podem empatar em `recorded_at`.
 */
export async function possuiAceitePrincipal(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consent_records")
    .select("state")
    .eq("consent_type", "C-PRINCIPAL")
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  // A RLS já restringe as linhas às do próprio usuário (§7.3), por isso não
  // há filtro por user_id aqui: pedir o que não é seu devolve conjunto vazio.
  if (error || !data || data.length === 0) return false;
  return data[0].state === "concedido";
}

/**
 * Porta das rotas que dependem do aceite.
 *
 * §12.1: nenhum dado de domínio antes do aceite. Sem sessão ou sem aceite
 * corrente, o usuário volta para a tela de aceite — nunca prossegue.
 */
export async function exigirAceite() {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/aceite");

  if (!(await possuiAceitePrincipal())) redirect("/aceite");

  return usuario;
}

/**
 * Descarta os cookies de sessão do Supabase neste navegador.
 *
 * Usado apenas como recurso quando `signOut()` falha (§17.3): é a metade local
 * do que o signOut faria. Não revoga o refresh token no servidor — para isso
 * seria preciso credencial administrativa, que §12.8 e §14.3.19 mantêm fora da
 * aplicação. `@supabase/ssr` grava a sessão em `sb-<ref>-auth-token`, às vezes
 * fatiada em sufixos `.0`, `.1`.
 */
export async function descartarCookiesDeSessao() {
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (name.startsWith("sb-") && name.includes("-auth-token")) {
      cookieStore.delete(name);
    }
  }
}
