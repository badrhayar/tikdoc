import { createClient } from '@supabase/supabase-js';

// Vite only exposes env vars prefixed with VITE_ to the browser.
// These map to the SUPABASE_URL / SUPABASE_ANON_KEY values from your project.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surface a clear message during development instead of a cryptic network error.
  console.warn(
    '[Tabibo] Missing Supabase env vars. Copy frontend/.env.example to frontend/.env ' +
    'and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// True only when env vars are present — lets the UI fall back to mock data
// gracefully until the project is connected.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export default supabase;
