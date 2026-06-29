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
export async function signUp({ email, password, fullName, phone, role = 'patient', cinOrInpe, sex, dob, captchaToken }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      data: { full_name: fullName, phone: phone || null, role, cin_or_inpe: cinOrInpe || null, sex: sex || null, dob: dob || null },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password, captchaToken }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) throw error;
  return data;
}

/**
 * Sign in with a phone number. Resolution + authentication happen entirely in the
 * `phone-login` Edge Function so the account email is never exposed to the client
 * and unknown numbers are indistinguishable from wrong passwords. On success the
 * returned session is installed into the Supabase client.
 */
export async function phoneLogin({ phone, password, captchaToken }) {
  const { data, error } = await supabase.functions.invoke('phone-login', {
    body: { phone, password, captchaToken },
  });
  // The function returns a uniform 401; surface it as the standard credentials
  // error so the UI shows "Email ou mot de passe incorrect."
  if (error || !data?.session?.access_token) throw new Error('Invalid login credentials');
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  const { data: sess } = await supabase.auth.getSession();
  return sess;
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
