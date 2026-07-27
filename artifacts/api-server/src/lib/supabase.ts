import { createClient } from "@supabase/supabase-js";

function createSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Create a fresh client per call (tokens/connections are managed by Supabase client)
export function getSupabaseClient() {
  return createSupabaseClient();
}
