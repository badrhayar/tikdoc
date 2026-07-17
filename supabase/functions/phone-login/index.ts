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
  // Flatten the unknown-number vs wrong-password timing difference so response
  // latency can't be used to enumerate which phone numbers have accounts.
  const jitter = () => new Promise((r) => setTimeout(r, 180 + crypto.getRandomValues(new Uint32Array(1))[0] % 220));
  try {
    const { phone, password, captchaToken } = await req.json().catch(() => ({}));
    if (!phone || !password) return invalid();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Brute-force guard: at most 20 attempts per phone / 40 per IP per 10 min
    // (uniform "invalid" response — a limiter must not become its own oracle).
    // Client IP: trust the LAST x-forwarded-for hop — the platform appends the
    // real peer address on the right, so the left-most token is client-spoofable.
    // Sanitize to IP characters so the value can never perturb a query.
    const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const ip = (xff.length ? xff[xff.length - 1] : "").replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45) || "unknown";
    const ident = String(phone).replace(/\D/g, "").slice(-12) || "unknown";
    const since = new Date(Date.now() - 10 * 60e3).toISOString();

    // Per-phone limit — values bound via .eq() (never interpolated into a filter),
    // and FAIL CLOSED: if the count cannot be read we treat the attempt as
    // throttled rather than letting brute force through. (login_throttle lives in
    // the same DB as auth, so a real outage here already blocks logins anyway.)
    try {
      const { count, error } = await admin.from("login_throttle")
        .select("id", { count: "exact", head: true })
        .eq("identifier", ident).gte("created_at", since);
      if (error || (count ?? 0) >= 20) { await jitter(); return invalid(); }
    } catch (_) { await jitter(); return invalid(); }

    // Per-IP limit — best-effort (IP is only semi-trustworthy); never fail closed
    // on it so a shared NAT or a limiter hiccup can't lock legitimate users out.
    try {
      const { count } = await admin.from("login_throttle")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip).gte("created_at", since);
      if ((count ?? 0) >= 40) { await jitter(); return invalid(); }
    } catch (_) { /* ignore */ }

    try {
      await admin.from("login_throttle").insert({ identifier: ident, ip });
      // Opportunistic cleanup so the table never grows unbounded.
      if (crypto.getRandomValues(new Uint8Array(1))[0] < 8) {
        await admin.from("login_throttle").delete().lt("created_at", new Date(Date.now() - 24 * 3600e3).toISOString());
      }
    } catch (_) { /* recording the attempt is best-effort */ }

    // 1) Resolve the email server-side (service role; RPC is no longer public).
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: email } = await admin.rpc("email_for_phone", { p: String(phone) });
    if (!email) {
      // Unknown number: perform an equivalent anon sign-in against a bogus email
      // so latency can't distinguish "no account" from "wrong password", then the
      // same uniform jitter + response as every other failure path.
      await anon.auth.signInWithPassword({
        email: `x${crypto.getRandomValues(new Uint32Array(1))[0]}@no-account.invalid`,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      }).catch(() => {});
      await jitter();
      return invalid();
    }

    // 2) Authenticate with the public anon client so CAPTCHA is enforced.
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error || !data?.session) { await jitter(); return invalid(); }

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
