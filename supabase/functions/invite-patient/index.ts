// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · invite-patient
// A doctor invites a walk-in patient to create an account (email now, SMS once
// you wire a provider). This function can send mail to a caller-supplied address,
// so — like the other functions — it AUTHORIZES the caller first: only a logged-in
// doctor or admin may use it. The public anon key is rejected, which prevents it
// being abused as an open email/SMS relay.
//
// Deploy:  supabase functions deploy invite-patient
// Secrets: supabase secrets set RESEND_API_KEY=...  TABIBO_FROM="Tabibo <noreply@tabibo.ma>"
//          (+ your SMS provider creds when you enable SMS)
//          SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TABIBO_FROM") ?? "Tabibo <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const G = "#16A06A";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const SERVICE_KEYS = [
  SERVICE_KEY, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("SB_SECRET_KEY"),
].filter(Boolean) as string[];

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  const deny = { ok: false, isAdmin: false, me: null as any };
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny;
  if (SERVICE_KEYS.includes(token)) return { ok: true, isAdmin: true, me: null as any };
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return deny;
  const { data: me } = await admin.from("users").select("id, role").eq("auth_id", user.id).maybeSingle();
  if (!me) return deny;
  return { ok: true, isAdmin: (me as any).role === "admin", me: me as any };
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, skipped: "RESEND_API_KEY manquant" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return { ok: res.ok, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Only a logged-in doctor or admin may send invitations.
    const authz = await authorize(req, admin);
    if (!authz.ok) return json({ ok: false, error: "unauthorized" }, 401);
    if (!authz.isAdmin && authz.me?.role !== "doctor") return json({ ok: false, error: "forbidden" }, 403);

    const { name, phone, email, link } = await req.json().catch(() => ({}));
    if (!email && !phone) return json({ ok: false, error: "Un email ou un téléphone est requis." }, 400);

    const url = typeof link === "string" && /^https?:\/\//.test(link) ? link : "https://tabibo.ma";
    let emailed = false;

    if (email) {
      const html = `<!doctype html><html><body style="margin:0;background:#F4F8F5;font-family:Inter,Arial,sans-serif;color:#15314A">
        <div style="max-width:560px;margin:0 auto;padding:28px 18px">
          <div style="font-size:24px;font-weight:800;color:${G};margin-bottom:18px">Tabibo</div>
          <div style="background:#fff;border:1px solid #EAEFEC;border-radius:16px;padding:28px">
            <h1 style="font-size:19px;margin:0 0 14px">Bonjour ${esc(name) || "et bienvenue"},</h1>
            <p>Votre médecin vous invite à créer votre compte <strong>Tabibo</strong> pour suivre vos rendez-vous et vos documents.</p>
            <p style="margin-top:18px"><a href="${esc(url)}" style="background:${G};color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700;display:inline-block">Créer mon compte</a></p>
          </div>
          <p style="font-size:12px;color:#6B7B76;text-align:center;margin-top:20px">Tabibo · Plateforme médicale digitale · Maroc</p>
        </div></body></html>`;
      const r = await sendEmail(email, "Votre médecin vous invite sur Tabibo", html);
      emailed = !!r.ok;
    }

    // TODO: SMS delivery — plug in your provider (e.g. Twilio) here, sending `url`
    // to `phone`. Keep it behind this same authorization gate.
    return json({ ok: true, emailed, sms: false });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
