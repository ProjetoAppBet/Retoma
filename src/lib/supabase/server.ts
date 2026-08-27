import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { chavePublicaDoSupabase, urlDoSupabase } from "@/lib/supabase/ambiente";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Must be created per-request (cookies() is request-scoped).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    urlDoSupabase(),
    chavePublicaDoSupabase(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component during render — the proxy
            // (proxy.ts) already refreshes the session on every request,
            // so it's safe to ignore writes attempted here.
          }
        },
      },
    },
  );
}
