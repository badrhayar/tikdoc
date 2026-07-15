// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · invite-patient
// A doctor invites a patient to create their Tabibo account. Sends a fully
// branded, trilingual (FR · AR · EN) email explaining, step by step, how to
// register WITH THE SAME EMAIL the doctor entered — and, when a phone number is
// provided and WhatsApp is configured, the same invitation over WhatsApp.
//
// Like every Tabibo function it AUTHORIZES the caller first: only a signed-in
// doctor or admin may send invitations (the public anon key is rejected), so it
// can never be abused as an open email/WhatsApp relay.
//
// Deploy:  supabase functions deploy invite-patient
// Secrets: RESEND_API_KEY, TABIBO_FROM="Tabibo <noreply@tabibo.ma>"
//          WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_LANG (optional, default fr)
//          SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//          The WhatsApp channel uses an approved template named `patient_invite`
//          (see supabase/functions/invite-patient/README or WHATSAPP-TEMPLATES.md).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TABIBO_FROM") ?? "Tabibo <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WA_LANG = Deno.env.get("WHATSAPP_LANG") ?? "fr";

// Brand palette (kept in one place so the email always matches the app).
const G = "#16A06A";
const G_DARK = "#0B6A46";
const GRAD = "linear-gradient(135deg,#1AAE74 0%,#12875A 52%,#0B6A46 100%)";
const INK = "#15314A";
const MUT = "#6B7B76";
const BG = "#F4F8F5";
const LINE = "#EAEFEC";

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
  const { data: me } = await admin.from("users").select("id, role, full_name").eq("auth_id", user.id).maybeSingle();
  if (!me) return deny;
  return { ok: true, isAdmin: (me as any).role === "admin", me: me as any };
}

// Moroccan numbers → E.164 digits with no "+": 06.. → 2126.., +212.. → 212..
function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "212" + d.slice(1);
  else if (!d.startsWith("212") && d.length <= 9) d = "212" + d;
  return d;
}

// ── The brand logo tile (green gradient rounded square + white stethoscope).
// Inline SVG renders in Apple Mail / Outlook / most modern clients; where a
// client strips SVG (older Gmail), the gradient tile + wordmark still carry the
// brand, so the header never looks broken.
function logoTile() {
  return `<span style="display:inline-block;width:46px;height:46px;border-radius:13px;background:${GRAD};vertical-align:middle;text-align:center;line-height:46px;box-shadow:0 6px 16px -6px rgba(22,160,106,.55)">
    <svg width="30" height="30" viewBox="0 0 48 48" style="vertical-align:middle" aria-hidden="true">
      <g transform="translate(3.84 8.81) scale(1.44)" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 3v-.5a1.4 1.4 0 0 1 1.4-1.4h.4"/><path d="M14 3v-.5a1.4 1.4 0 0 0-1.4-1.4h-.4"/>
        <path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/>
      </g>
    </svg></span>`;
}

// One numbered step (green badge + text).
function step(n: number, text: string, rtl = false) {
  const dir = rtl ? "rtl" : "ltr";
  const mSide = rtl ? "margin-left:11px" : "margin-right:11px";
  return `<tr><td dir="${dir}" style="padding:5px 0;vertical-align:top">
    <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#E7F6EE;color:${G_DARK};font-weight:800;font-size:12.5px;text-align:center;line-height:24px;${mSide};vertical-align:top">${n}</span>
    <span style="display:inline-block;max-width:430px;font-size:14px;line-height:1.55;color:${INK};vertical-align:top">${text}</span>
  </td></tr>`;
}

// A full language section: heading, intro, 3 steps.
function section(opts: {
  rtl?: boolean; flag: string; heading: string; intro: string; steps: string[]; font?: string;
}) {
  const { rtl = false, heading, intro, steps: st, font = "Inter,Arial,sans-serif" } = opts;
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  return `<div dir="${dir}" style="text-align:${align};font-family:${font};margin:0 0 6px">
    <div style="font-size:16px;font-weight:800;color:${INK};margin:0 0 8px">${heading}</div>
    <div style="font-size:14px;line-height:1.6;color:${MUT};margin:0 0 12px">${intro}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">${st.join("")}</table>
  </div>`;
}

function inviteEmailHtml(o: { name: string; doctorName: string; email: string; url: string }) {
  const patient = esc(o.name) || "";
  const dr = esc(o.doctorName) || "";
  const email = esc(o.email);
  const url = esc(o.url);
  const drFr = dr ? `Le Dr ${dr}` : "Votre médecin";
  const drEn = dr ? `Dr ${dr}` : "Your doctor";
  const drAr = dr ? `الطبيب ${dr}` : "طبيبكم";

  const emailChip = (label: string, rtl = false) =>
    `<div dir="${rtl ? "rtl" : "ltr"}" style="background:#E7F6EE;border:1px solid #CDE7DA;border-radius:10px;padding:10px 14px;margin:2px 0 4px">
      <span style="font-size:12.5px;color:${G_DARK};font-weight:700">${label} </span>
      <span style="font-size:13.5px;color:${INK};font-weight:800;direction:ltr;unicode-bidi:embed">${email}</span>
    </div>`;

  const fr = section({
    flag: "FR", heading: "Créez votre compte Tabibo",
    intro: `${drFr} vous invite sur <strong style="color:${INK}">Tabibo</strong> pour réserver vos rendez-vous, recevoir vos rappels et retrouver vos ordonnances et documents en un seul endroit.`,
    steps: [
      step(1, `Cliquez sur le bouton <strong>« Créer mon compte »</strong> ci-dessous.`),
      step(2, `Inscrivez-vous avec <strong>cette même adresse email</strong> :${emailChip("")}`),
      step(3, `C'est fait — vos rendez-vous avec ${drFr.toLowerCase()} apparaissent automatiquement.`),
    ],
  });
  const ar = section({
    rtl: true, flag: "AR", font: "'Noto Sans Arabic',Inter,Arial,sans-serif",
    heading: "أنشئوا حسابكم على Tabibo",
    intro: `${drAr} يدعوكم إلى <strong style="color:${INK}">Tabibo</strong> لحجز مواعيدكم، وتلقّي التذكيرات، والوصول إلى وصفاتكم ووثائقكم في مكان واحد.`,
    steps: [
      step(1, `اضغطوا على زر <strong>«إنشاء حسابي»</strong> أسفله.`, true),
      step(2, `سجّلوا بنفس <strong>عنوان البريد الإلكتروني</strong> هذا:${emailChip("", true)}`, true),
      step(3, `هذا كل شيء — ستظهر مواعيدكم مع ${drAr} تلقائياً.`, true),
    ],
  });
  const en = section({
    flag: "EN", heading: "Create your Tabibo account",
    intro: `${drEn} invites you to <strong style="color:${INK}">Tabibo</strong> to book appointments, get reminders, and keep your prescriptions and documents in one place.`,
    steps: [
      step(1, `Tap the <strong>“Create my account”</strong> button below.`),
      step(2, `Sign up with <strong>this same email address</strong>:${emailChip("")}`),
      step(3, `Done — your appointments with ${drEn} show up automatically.`),
    ],
  });

  const divider = `<div style="height:1px;background:${LINE};margin:22px 0"></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:${BG};font-family:Inter,Arial,sans-serif;color:${INK}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Créez votre compte Tabibo · أنشئوا حسابكم · Create your account</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:26px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="padding:6px 6px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle">${logoTile()}</td>
            <td style="vertical-align:middle;padding-left:12px">
              <div style="font-size:23px;font-weight:800;letter-spacing:-.5px;color:${INK}">Tabibo</div>
              <div style="font-size:12.5px;color:${MUT}">Votre santé, notre priorité</div>
            </td>
          </tr></table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:18px;padding:30px 28px;box-shadow:0 10px 26px -18px rgba(13,43,30,.18)">
          <div style="font-size:12px;font-weight:800;color:${G_DARK};text-transform:uppercase;letter-spacing:.6px;margin:0 0 6px">Invitation</div>
          <h1 style="font-size:21px;line-height:1.3;margin:0 0 6px;color:${INK}">${patient ? "Bonjour " + patient + "," : "Bonjour,"}</h1>
          <p style="font-size:14px;line-height:1.6;color:${MUT};margin:0 0 22px">${drFr} vous a ajouté(e) comme patient(e) et vous invite à créer votre compte. Suivez les étapes ci-dessous — <strong style="color:${INK}">FR · العربية · EN</strong>.</p>

          ${fr}${divider}${ar}${divider}${en}

          <!-- Shared CTA -->
          <div style="text-align:center;margin:26px 0 6px">
            <a href="${url}" style="background:${GRAD};color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:12px;font-weight:800;font-size:15px;display:inline-block;box-shadow:0 10px 22px -8px rgba(22,160,106,.6)">Créer mon compte · إنشاء حسابي · Create my account</a>
          </div>
          <div style="text-align:center;font-size:12px;color:${MUT};margin-top:8px;word-break:break-all">${url}</div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 8px;text-align:center">
          <div style="font-size:12.5px;color:${MUT};line-height:1.7">
            <strong style="color:${INK}">Tabibo</strong> — Plateforme médicale digitale · Maroc<br>
            Vous recevez cet email car un médecin vous a invité(e). Si vous ne le connaissez pas, ignorez ce message.
          </div>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
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

// WhatsApp invitation via the approved `patient_invite` template. Business-
// initiated messages must use a template; params fill {{1}} patient name,
// {{2}} doctor name, {{3}} the registration link. Register the trilingual
// template text in Meta (see WHATSAPP-TEMPLATES.md).
async function sendWhatsAppInvite(to: string, params: string[]) {
  if (!WA_TOKEN || !WA_PHONE_ID) return { ok: false, skipped: "WhatsApp non configuré" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "patient_invite",
        language: { code: WA_LANG },
        components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: t })) }],
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, error: res.ok ? null : (body?.error?.message || JSON.stringify(body)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Only a signed-in doctor or admin may send invitations.
    const authz = await authorize(req, admin);
    if (!authz.ok) return json({ ok: false, error: "unauthorized" }, 401);
    if (!authz.isAdmin && authz.me?.role !== "doctor") return json({ ok: false, error: "forbidden" }, 403);

    const p = await req.json().catch(() => ({}));
    const { name, phone, email } = p;
    if (!email && !phone) return json({ ok: false, error: "Un email ou un téléphone est requis." }, 400);

    // The doctor's name personalises the invite (caller may override; otherwise
    // use the authenticated doctor's own name).
    const doctorName = String(p.doctorName || authz.me?.full_name || "").replace(/^Dr\.?\s*/i, "").trim();
    // Registration link — carries the email so the sign-up form can pre-fill it.
    const base = typeof p.link === "string" && /^https?:\/\//.test(p.link) ? p.link.replace(/\/+$/, "") : "https://tabibo.ma";
    const url = email ? `${base}/pregister?email=${encodeURIComponent(email)}` : `${base}/pregister`;

    let emailed = false, wa = false, waError: string | null = null;

    if (email) {
      const r = await sendEmail(
        email,
        `${doctorName ? "Dr " + doctorName + " vous invite" : "Votre médecin vous invite"} sur Tabibo — créez votre compte`,
        inviteEmailHtml({ name, doctorName, email, url }),
      );
      emailed = !!r.ok;
    }

    if (phone) {
      const r = await sendWhatsAppInvite(normalizePhone(phone), [name || "", doctorName || "votre médecin", url]);
      wa = !!r.ok;
      waError = r.error ?? (r as any).skipped ?? null;
    }

    return json({ ok: true, emailed, wa, waError });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
