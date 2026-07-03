let clientPromise = null;

export function hasSupabaseConfig() {
  const url = window.TRIPBOARD_SUPABASE_URL || "";
  const key = window.TRIPBOARD_SUPABASE_ANON_KEY || "";
  return Boolean(url.trim() && key.trim());
}

export async function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 尚未設定。請先編輯 supabase-config.js。 ");
  }

  if (!clientPromise) {
    clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm").then(({ createClient }) =>
      createClient(window.TRIPBOARD_SUPABASE_URL, window.TRIPBOARD_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    );
  }

  return clientPromise;
}
