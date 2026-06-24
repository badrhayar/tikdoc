// ─────────────────────────────────────────────────────────────────────────────
// Tabibo auth helpers — thin wrappers over Supabase Auth.
// Profile rows in public.users are created automatically by the
// `handle_new_user` trigger from the metadata passed to signUp().
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient';

/**
 * Create an account. Extra profile fields travel in `options.data` and are
 * picked up by the DB trigger to populate public.users.
 * @returns { user, session }  — session is null if email confirmation is on.
 */
export async function signUp({ email, password, fullName, phone, role = 'patient', cinOrInpe }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null, role, cin_or_inpe: cinOrInpe || null },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
