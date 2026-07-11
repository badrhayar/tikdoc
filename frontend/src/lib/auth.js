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
// Turn ANY auth error into a clean, human French message. Guarantees we never
// render junk like "{}" or "[object Object]" in the UI, and maps the common
// Supabase/GoTrue errors to friendly text. Returns { code, message } —
// code 'email_exists' lets forms show the "connectez-vous" path.
export function authErrorMessage(e) {
  const code = e?.code || '';
  let raw = e?.message ?? e?.error_description ?? e?.msg ?? '';
  raw = String(raw).trim();
  if (raw === '{}' || raw === '[object Object]' || raw === 'null' || raw === 'undefined') raw = '';
  const low = raw.toLowerCase();
  if (code === 'email_exists' || /already registered|already exists|user already|email.*taken/.test(low))
    return { code: 'email_exists', message: 'Cet email a déjà un compte Tabibo.' };
  if (/invalid login credentials/.test(low))
    return { code: 'bad_credentials', message: 'Email ou mot de passe incorrect.' };
  if (/password.*(6|short|weak)/.test(low))
    return { code: 'weak_password', message: 'Le mot de passe doit contenir au moins 6 caractères.' };
  if (/captcha/.test(low))
    return { code: 'captcha', message: 'Vérification anti-robot échouée — réessayez.' };
  if (/rate limit|too many|429/.test(low))
    return { code: 'rate_limit', message: 'Trop de tentatives — patientez quelques minutes puis réessayez.' };
  if (/database error|unexpected_failure|saving new user/.test(low))
    return { code: 'server', message: 'Création du compte impossible pour le moment. Réessayez dans un instant.' };
  return { code: code || 'unknown', message: raw || 'Une erreur est survenue. Vérifiez vos informations et réessayez.' };
}

export async function signUp({ email, password, fullName, phone, role = 'patient', cinOrInpe, sex, dob, captchaToken }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      // Confirmation links land on OUR page (role-aware "email confirmé"),
      // never on the Supabase default Site URL.
      emailRedirectTo: `${window.location.origin}/verified`,
      data: { full_name: fullName, phone: phone || null, role, cin_or_inpe: cinOrInpe || null, sex: sex || null, dob: dob || null },
    },
  });
  if (error) throw error;
  // Supabase obfuscates duplicate signups (fake success with no identity) so
  // attackers can't probe emails — surface it as a typed error for OUR forms.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const dup = new Error('email_exists');
    dup.code = 'email_exists';
    throw dup;
  }
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

/** Email a password-reset link. The link reopens the app with a recovery session,
 *  which fires a 'PASSWORD_RECOVERY' auth event (handled in AppContext). */
export async function resetPasswordRequest(email) {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail((email || '').trim(), { redirectTo });
  if (error) throw error;
  return true;
}

/** Set a new password for the user in the active (recovery) session. */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}


/** Re-send the signup confirmation email (rate-limited by Supabase). */
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/verified` },
  });
  if (error) throw error;
}
