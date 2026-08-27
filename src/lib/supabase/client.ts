import { createBrowserClient } from "@supabase/ssr";

import { chavePublicaDoSupabase, urlDoSupabase } from "@/lib/supabase/ambiente";

/**
 * Supabase client for use in Client Components (browser).
 * Reads the public URL/anon key — safe to expose to the browser.
 */
export function createClient() {
  return createBrowserClient(
    urlDoSupabase(),
    chavePublicaDoSupabase(),
  );
}
