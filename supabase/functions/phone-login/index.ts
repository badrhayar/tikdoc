// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · phone-login
// Lets a patient sign in with their phone number instead of their email, WITHOUT
// ever exposing the email to the browser and without an enumeration oracle.
//
//   1) resolve the account email from the phone (service-role, server-side);
//   2) sign in with email + password (anon client, so Supabase still enforces
//      CAPTCHA via the forwarded captchaToken);
//   3) return the session — or a single uniform "invalid" error for BOTH an
//      unknown number and a wrong password.
//
// Deploy:  supabase functions deploy phone-login
//          (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//           injected automatically.)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SB_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Uniform failure — never reveal whether it was the number or the password.
  const invalid = () => json({ error: "invalid_credentials" }, 401);
  try {
    const { phone, password, captchaToken } = await req.json().catch(() => ({}));
    if (!phone || !password) return invalid();

    // 1) Resolve the email server-side (service role; RPC is no longer public).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: email } = await admin.rpc("email_for_phone", { p: String(phone) });
    if (!email) return invalid();

    // 2) Authenticate with the public anon client so CAPTCHA is enforced.
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error || !data?.session) return invalid();

    // 3) Hand the session back; the browser calls supabase.auth.setSession().
    return json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (_e) {
    return invalid();
  }
});
