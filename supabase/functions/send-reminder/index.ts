// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · send-reminder
// Sends appointment reminders over the WhatsApp Cloud API and logs every attempt
// to public.reminder_log (the doctor dashboard reads from there).
//
//   • type "dispatch"  → scan appointments in the J-1 / J-2 windows and send any
//                        reminder not yet sent (call this hourly from pg_cron)
//   • type "send"      → send one reminder for a given appointment_id + template
//   • type "test"      → send a test message to a phone number
//
// Deploy:  supabase functions deploy send-reminder
// Secrets: supabase secrets set \
//            WHATSAPP_TOKEN=...           # permanent token of the WA Business app
//            WHATSAPP_PHONE_ID=...        # phone-number ID from Meta
//            WHATSAPP_TEMPLATE_REMINDER=tabibo_reminder   # approved template name
//            WHATSAPP_LANG=fr
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// The reminder template must be created & approved in Meta with 4 body
// placeholders, in this order:  {{1}} patient · {{2}} date · {{3}} heure · {{4}} médecin
//   e.g. "Bonjour {{1}}, rappel de votre rendez-vous le {{2}} à {{3}} avec
//         {{4}}. Répondez ANNULER pour annuler. — Tabibo"
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushPayload } from "https://esm.sh/@block65/webcrypto-web-push@1.0.2";

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WA_LANG = Deno.env.get("WHATSAPP_LANG") ?? "fr";
// One template per event type. All share the same 4 body params
// (patient · date · heure · médecin), so they're interchangeable.
const TPL = {
  reminder:  Deno.env.get("WHATSAPP_TEMPLATE_REMINDER")  ?? "tabibo_reminder",
  booked:    Deno.env.get("WHATSAPP_TEMPLATE_BOOKED")    ?? "tabibo_booked",
  confirmed: Deno.env.get("WHATSAPP_TEMPLATE_CONFIRMED") ?? "tabibo_confirmed",
  cancelled: Deno.env.get("WHATSAPP_TEMPLATE_CANCELLED") ?? "tabibo_cancelled",
};
function templateFor(label: string): string {
  if (label === "confirmation") return TPL.booked;             // brand-new booking ("réservé")
  if (label === "confirmed" || label === "rescheduled") return TPL.confirmed;
  if (label === "cancelled") return TPL.cancelled;
  return TPL.reminder; // j1, j2, followup, test
}
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Prefer an explicitly-provided key (new API-key system: a `sb_secret_…` key),
// falling back to the auto-injected legacy service-role key.
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Email channel (Resend) — works with zero WhatsApp/Meta setup. Reminders are
// sent by email whenever the patient has an email and RESEND_API_KEY is set.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TABIBO_FROM") ?? "Tabibo <onboarding@resend.dev>";
function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
const NON_DR_SPECS = new Set(["kine","psychologue","orthophoniste","orthoptiste","podologue","osteopathe","sagefemme","dieteticien","audioprothesiste","opticien","infirmier"]);
function docTitle(name: string, spec?: string) {
  const clean = String(name || "").replace(/^\s*(d(?:r|octeur)\.?|pr\.?)\s+/i, "").trim();
  if (!clean) return "votre médecin";
  return spec && NON_DR_SPECS.has(spec) ? clean : `Dr. ${clean}`;
}
const APP_URL = Deno.env.get("APP_URL") ?? "https://tabibo.ma";

// ── Web Push (free channel on the patient's home screen) ────────────────────
// Inert until the VAPID secrets exist. Subscriptions gone stale (404/410) are
// pruned so the table stays clean.
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@tabibo.ma";
const pushReady = !!(VAPID_PUBLIC && VAPID_PRIVATE);

// A push endpoint we are willing to call from the server: https, default port,
// a real public hostname (not an IP literal / localhost / internal suffix).
function isSafePushEndpoint(raw: unknown): boolean {
  try {
    const u = new URL(String(raw ?? ""));
    if (u.protocol !== "https:") return false;
    if (u.port && u.port !== "443") return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".")) return false;                                  // "localhost", bare names
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;                 // IPv4 literal
    if (h.startsWith("[") || h.includes(":")) return false;              // IPv6 literal
    if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;
    return true;
  } catch { return false; }
}

async function sendPushToUser(
  admin: ReturnType<typeof createClient>,
  userId: string | null,
  message: { title: string; body: string; url?: string; tag?: string },
) {
  if (!pushReady || !userId) return;
  try {
    const { data: subs } = await admin.from("push_subscriptions")
      .select("id, endpoint, p256dh, auth").eq("user_id", userId);
    for (const s of (subs ?? []) as any[]) {
      // SSRF guard: the endpoint is client-supplied at subscribe time. Only ever
      // POST to a public https host on the default port — never IP literals,
      // localhost, or internal names (blocks cloud-metadata / intranet probes).
      if (!isSafePushEndpoint(s.endpoint)) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
        continue;
      }
      try {
        const payload = await buildPushPayload(
          { data: JSON.stringify(message), options: { ttl: 3600 * 12 } },
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE },
        );
        const res = await fetch(s.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      } catch (_) { /* one bad subscription must not stop the rest */ }
    }
  } catch (_) { /* push is best-effort */ }
}

// A polished, brand-consistent email (email-client-safe tables).
function apptEmail(d: { name: string; title: string; sentence: string; ctaLabel: string; subLine: string; accent: string; accentSoft: string; emoji: string; url: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F4F8F5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F8F5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:2px 4px 16px;">
        <img src="${d.url}/icons/icon-192.png" width="30" height="30" alt="Tabibo" style="border-radius:8px;vertical-align:middle;border:0;"/>
        <span style="font-size:21px;font-weight:700;color:#15314A;letter-spacing:-0.4px;vertical-align:middle;margin-left:8px;">Tabib<span style="color:#16A06A;">o</span></span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #EAEFEC;border-radius:14px;">
        <div style="height:3px;background:${d.accent};border-radius:14px 14px 0 0;"></div>
        <div style="padding:30px 34px 32px;">
          <h1 style="font-size:19px;font-weight:600;color:#15314A;margin:0 0 16px;letter-spacing:-0.2px;line-height:1.35;">${d.title}</h1>
          <p style="font-size:15px;color:#42504B;line-height:1.7;margin:0 0 26px;">Salut <strong style="color:#15314A;">${esc(d.name)}</strong>, ${d.sentence}</p>
          <a href="${d.url}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;background:#16A06A;border-radius:9px;text-decoration:none;letter-spacing:.2px;">${d.ctaLabel}</a>
          <p style="font-size:13px;color:#7A8983;margin:16px 0 0;">${d.subLine} <a href="${d.url}" style="color:#16A06A;text-decoration:none;font-weight:600;">Tabibo.ma</a></p>
          <div style="border-top:1px solid #EEF2F0;margin:26px 0 0;"></div>
          <p style="font-size:13.5px;color:#7A8983;margin:18px 0 0;">Cordialement,<br/><span style="color:#15314A;font-weight:600;">L'équipe Tabibo</span></p>
        </div>
      </td></tr>
      <tr><td style="padding:16px 6px;text-align:center;font-size:12px;color:#9AA8A2;">
        Tabibo · Plateforme de rendez-vous médicaux au Maroc
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

// Reminder email. label 'j1' → "demain à {heure}"; 'j2'/other → "le {date} à {heure}".
async function sendEmailReminder(to: string, params: string[], label: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY manquant" };
  const [patient, date, heure, medecin] = params;
  const rdv = label === "j1"
    ? `<strong>demain</strong> à <strong>${esc(heure)}</strong> avec <strong>${esc(medecin)}</strong>`
    : `le <strong>${esc(date)}</strong> à <strong>${esc(heure)}</strong> avec <strong>${esc(medecin)}</strong>`;
  const html = apptEmail({
    name: patient, url: APP_URL,
    accent: "#E8A33D", accentSoft: "#FEF3DC", emoji: "⏰",
    title: "Rappel de rendez-vous",
    sentence: `n'oubliez pas votre rendez-vous ${rdv}.`,
    ctaLabel: "Gérer mes rendez-vous",
    subLine: "Gérez vos rendez-vous sur",
  });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: "Rappel de votre rendez-vous — Tabibo", html }),
  });
  return { ok: res.ok, error: res.ok ? null : await res.text() };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ── Caller authorization ──────────────────────────────────────────────────────
// This function holds the service-role key (bypasses RLS), so it must verify WHO
// is calling. Two kinds of legitimate callers:
//   • the pg_cron dispatcher, which presents the service-role key as its bearer;
//   • logged-in app users (admin "test", patient/doctor "send"), whose JWT we
//     validate. The public anon key resolves to no user and is rejected.
const SERVICE_KEYS = [
  SERVICE_KEY,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  Deno.env.get("SB_SECRET_KEY"),
].filter(Boolean) as string[];

// A dedicated secret for the pg_cron dispatcher — decoupled from the service-role
// key (which can rotate / differ between the dashboard and the injected env).
// Set CRON_SECRET as a function secret AND as the Vault `tabibo_cron_key`, same value.
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  const deny = { ok: false, isService: false, isAdmin: false, me: null as any };
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny;
  if (CRON_SECRET && token === CRON_SECRET) return { ok: true, isService: true, isAdmin: true, me: null as any };
  if (SERVICE_KEYS.includes(token)) return { ok: true, isService: true, isAdmin: true, me: null as any };
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return deny;
  const { data: me } = await admin.from("users").select("id, role, email").eq("auth_id", user.id).maybeSingle();
  if (!me) return deny;
  return { ok: true, isService: false, isAdmin: (me as any).role === "admin", me: me as any };
}

// Moroccan numbers → E.164 digits with no "+": 06.. → 2126.., +212.. → 212..
function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "212" + d.slice(1);
  else if (!d.startsWith("212") && d.length <= 9) d = "212" + d;
  return d;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" });

// Send an approved WhatsApp template (named) with 4 body parameters.
async function sendTemplate(to: string, params: string[], tplName: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: tplName,
        language: { code: WA_LANG },
        components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: t })) }],
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  const providerId = body?.messages?.[0]?.id ?? null;
  const error = res.ok ? null : (body?.error?.message || JSON.stringify(body));
  return { ok: res.ok, providerId, error };
}

// Send one reminder over every configured channel (WhatsApp + email) and record
// each attempt. Works email-only when WhatsApp isn't set up.
async function sendOne(
  admin: ReturnType<typeof createClient>,
  appt: { id: string; doctor_id: string; datetime: string; patient_name: string; phone: string; email?: string; doctor_name: string; patient_user_id?: string | null },
  template: string,
) {
  const when = new Date(appt.datetime);
  const params = [appt.patient_name || "patient", dateFmt.format(when), timeFmt.format(when), appt.doctor_name || "votre médecin"];
  // Push (best-effort, free channel) — mirrors whatever this send is about.
  const PUSH_TITLES: Record<string, string> = {
    j1: "⏰ Rappel de rendez-vous", j2: "⏰ Rappel de rendez-vous",
    confirmation: "📅 Rendez-vous enregistré", confirmed: "✅ Rendez-vous confirmé",
    rescheduled: "🔁 Rendez-vous reporté", cancelled: "🗓️ Rendez-vous annulé",
  };
  sendPushToUser(admin, appt.patient_user_id ?? null, {
    title: PUSH_TITLES[template] ?? "Tabibo",
    body: `${params[1]} à ${params[2]} — ${params[3]}`,
    url: "/paccount", tag: `appt-${appt.id}`,
  });
  const bodyText = `Rappel RDV — ${params.join(" · ")}`;
  const waReady = !!(WA_TOKEN && WA_PHONE_ID);
  const now = new Date().toISOString();
  let waRes: any = null, mailRes: any = null;

  if (waReady && appt.phone) {
    waRes = await sendTemplate(normalizePhone(appt.phone), params, templateFor(template));
    await admin.from("reminder_log").insert({
      doctor_id: appt.doctor_id, appointment_id: appt.id, patient_name: appt.patient_name,
      phone: appt.phone, channel: "whatsapp", template, body: bodyText,
      status: waRes.ok ? "sent" : "failed", provider_id: waRes.providerId, error: waRes.error,
      sent_at: waRes.ok ? now : null,
    });
  }
  // Email only for the scheduled reminders (j1/j2/followup). Booking/confirm/
  // cancel emails are sent by notify-verification — avoid duplicate emails here.
  const emailTemplates = new Set(["j1", "j2", "reminder", "followup"]);
  if (RESEND_API_KEY && appt.email && emailTemplates.has(template)) {
    mailRes = await sendEmailReminder(appt.email, params, template);
    await admin.from("reminder_log").insert({
      doctor_id: appt.doctor_id, appointment_id: appt.id, patient_name: appt.patient_name,
      phone: appt.email, channel: "email", template, body: bodyText,
      status: mailRes.ok ? "sent" : "failed", error: mailRes.error,
      sent_at: mailRes.ok ? now : null,
    });
  }

  if (!waReady && !RESEND_API_KEY) {
    await admin.from("reminder_log").insert({
      doctor_id: appt.doctor_id, appointment_id: appt.id, patient_name: appt.patient_name,
      phone: appt.phone, template, body: bodyText, status: "failed",
      error: "Aucun canal configuré (WhatsApp ni Email).",
    });
    return { ok: false, error: "not_configured" };
  }
  const ok = !!(waRes?.ok || mailRes?.ok);
  return { ok, error: ok ? null : (waRes?.error || mailRes?.error || "échec d'envoi") };
}

// Fetch appointments whose datetime falls in [from, to], joined to patient + doctor.
async function dueAppointments(admin: ReturnType<typeof createClient>, fromISO: string, toISO: string) {
  const { data } = await admin
    .from("appointments")
    .select("id, doctor_id, datetime, status, patient_id, patient_name, patient_phone, patient_email, patient:users(full_name, phone, email), doctor:doctors(id, specialty, user:users!doctors_user_id_fkey(full_name))")
    .gte("datetime", fromISO).lte("datetime", toISO)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).map((a: any) => ({
    id: a.id, doctor_id: a.doctor_id, datetime: a.datetime,
    patient_name: a.patient_name ?? a.patient?.full_name ?? "", phone: a.patient?.phone ?? a.patient_phone ?? "",
    email: a.patient?.email ?? a.patient_email ?? "",
    doctor_name: docTitle(a.doctor?.user?.full_name ?? "", a.doctor?.specialty),
    patient_user_id: a.patient_id ?? null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Unauthenticated deployment/health probe — confirms THIS code is live and
    // which secrets are configured. Never returns the secret values themselves.
    if (p?.type === "ping" || new URL(req.url).searchParams.get("ping") === "1") {
      return json({
        ok: true,
        version: "cron-secret-v2",
        cronSecretSet: CRON_SECRET.length > 0,
        resendSet: RESEND_API_KEY.length > 0,
        waConfigured: !!(WA_TOKEN && WA_PHONE_ID),
      });
    }

    const authz = await authorize(req, admin);
    if (!authz.ok) return json({ ok: false, error: "unauthorized" }, 401);

    // ── test ─────────────────────────────────────────────────────────────────
    // Optional `template`: 'reminder' (default) | 'confirmation' (booked) |
    // 'confirmed' | 'cancelled' | 'rescheduled' — to test any template.
    if (p.type === "test") {
      if (!authz.isAdmin) return json({ ok: false, error: "forbidden" }, 403);
      if (!p.to) return json({ ok: false, error: "Destinataire manquant (email ou numéro)." });
      const demo = ["Ahmed", "lundi 30 juin", "14:30", "Dr. Benali"];
      // An address with "@" → email test (works with zero WhatsApp setup).
      if (String(p.to).includes("@")) {
        if (!RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY manquant dans les secrets." });
        const r = await sendEmailReminder(p.to, demo, p.template ?? "");
        return json({ ...r, channel: "email" });
      }
      if (!WA_TOKEN || !WA_PHONE_ID) return json({ ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants dans les secrets." });
      const tpl = templateFor(p.template ?? "");
      const r = await sendTemplate(normalizePhone(p.to), demo, tpl);
      return json({ ...r, template_used: tpl, channel: "whatsapp" });
    }

    // ── send one ───────────────────────────────────────────────────────────────
    if (p.type === "send" && p.appointment_id) {
      const { data, error: qErr } = await admin
        .from("appointments")
        .select("id, doctor_id, patient_id, datetime, patient_name, patient_phone, patient_email, patient:users(full_name, phone, email), doctor:doctors(id, user_id, specialty, user:users!doctors_user_id_fkey(full_name))")
        .eq("id", p.appointment_id).maybeSingle();
      if (!data) return json({ ok: false, error: "Rendez-vous introuvable.", detail: qErr?.message ?? null }, 404);
      const a: any = data;
      // Only a party to the appointment (its patient or its doctor), an admin, or
      // the server may trigger its messages.
      const isParty = authz.isAdmin || (authz.me && (authz.me.id === a.patient_id || authz.me.id === a.doctor?.user_id));
      if (!isParty) return json({ ok: false, error: "forbidden" }, 403);
      const template = p.template ?? "confirmation";

      // Respect the doctor's toggle for confirmation / follow-up sends.
      if (template === "confirmation" || template === "followup") {
        const { data: s } = await admin.from("reminder_settings").select("confirmation, followup").eq("doctor_id", a.doctor_id).maybeSingle();
        const on = s ? (s as any)[template] : template === "confirmation"; // default: confirmation ON, followup OFF
        if (!on) return json({ ok: true, skipped: "disabled" });
      }

      const r = await sendOne(admin, {
        id: a.id, doctor_id: a.doctor_id, datetime: a.datetime,
        patient_name: a.patient?.full_name ?? a.patient_name ?? "", phone: a.patient?.phone ?? a.patient_phone ?? "",
        email: a.patient?.email ?? a.patient_email ?? "",
        doctor_name: docTitle(a.doctor?.user?.full_name ?? "", a.doctor?.specialty),
        patient_user_id: a.patient_id ?? null,
      }, template);
      return json(r);
    }

    // ── waitlist (freed-slot trigger) ─────────────────────────────────────────
    // A cancellation freed a slot for doctor_id on date → email everyone still
    // pending on that day's waitlist and mark them notified.
    if (p.type === "waitlist" && p.doctor_id && p.date) {
      if (!authz.isService) return json({ ok: false, error: "forbidden" }, 403);
      if (!RESEND_API_KEY) return json({ ok: true, skipped: "no RESEND_API_KEY" });
      const { data: rows } = await admin.from("slot_waitlist")
        .select("id, patient_id, patient:users!slot_waitlist_patient_id_fkey(full_name, email)")
        .eq("doctor_id", p.doctor_id).eq("date", p.date).is("notified_at", null);
      if (!rows?.length) return json({ ok: true, notified: 0 });
      const { data: doc } = await admin.from("doctors")
        .select("specialty, user:users!doctors_user_id_fkey(full_name)")
        .eq("id", p.doctor_id).maybeSingle();
      const docName = docTitle((doc as any)?.user?.full_name ?? "", (doc as any)?.specialty);
      const dateStr = new Date(`${p.date}T12:00:00`).toLocaleDateString("fr-FR",
        { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" });
      let notified = 0;
      for (const r of rows as any[]) {
        const email = r.patient?.email;
        if (!email) continue;
        const html = apptEmail({
          name: r.patient?.full_name ?? "Patient", url: APP_URL,
          accent: "#16A06A", accentSoft: "#E7F6EE", emoji: "🔔",
          title: "Un créneau s'est libéré",
          sentence: `bonne nouvelle — une place s'est libérée chez <strong>${esc(docName)}</strong> le <strong>${esc(dateStr)}</strong>. Les créneaux libérés partent vite : réservez dès maintenant.`,
          ctaLabel: "Réserver ce créneau",
          subLine: "Réservez votre rendez-vous sur",
        });
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM, to: email, subject: `Un créneau s'est libéré chez ${docName} — Tabibo`, html }),
        });
        if (res.ok) {
          notified++;
          await admin.from("slot_waitlist").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
        }
        sendPushToUser(admin, r.patient_id ?? null, {
          title: "🔔 Un créneau s'est libéré",
          body: `${docName} — ${dateStr}. Réservez vite !`,
          url: "/search", tag: `waitlist-${r.id}`,
        });
      }
      return json({ ok: true, notified });
    }

    // ── dispatch (hourly cron) ─────────────────────────────────────────────────
    if (p.type === "dispatch") {
      if (!authz.isService) return json({ ok: false, error: "forbidden" }, 403);
      const now = Date.now();
      const windows: { template: string; flag: "j1" | "j2"; from: number; to: number }[] = [
        { template: "j1", flag: "j1", from: now + 23 * 3600e3, to: now + 25 * 3600e3 },
        { template: "j2", flag: "j2", from: now + 47 * 3600e3, to: now + 49 * 3600e3 },
      ];

      // Which doctors enabled which reminder.
      const { data: settings } = await admin.from("reminder_settings").select("doctor_id, j1, j2");
      const enabled: Record<string, { j1: boolean; j2: boolean }> = {};
      for (const s of settings ?? []) enabled[(s as any).doctor_id] = { j1: (s as any).j1, j2: (s as any).j2 };

      let sent = 0, skipped = 0, failed = 0;
      for (const w of windows) {
        const appts = await dueAppointments(admin, new Date(w.from).toISOString(), new Date(w.to).toISOString());
        for (const a of appts) {
          // Default ON for j1 when a doctor has no settings row; j2 default OFF.
          const pref = enabled[a.doctor_id];
          const on = pref ? pref[w.flag] : w.flag === "j1";
          if (!on) { skipped++; continue; }
          // Skip if already logged (non-failed) for this appointment+template.
          const { count } = await admin
            .from("reminder_log")
            .select("id", { count: "exact", head: true })
            .eq("appointment_id", a.id).eq("template", w.template).neq("status", "failed");
          if ((count ?? 0) > 0) { skipped++; continue; }
          const r = await sendOne(admin, a, w.template);
          r.ok ? sent++ : failed++;
        }
      }
      // ── Follow-up recalls due today ("revoir dans X mois") ──────────────
      let recalls = 0;
      if (RESEND_API_KEY) {
        const todayCasa = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
        const { data: due } = await admin.from("appointments")
          .select("id, patient_id, patient_name, followup_on, patient:users(full_name, email), doctor:doctors(id, specialty, user:users!doctors_user_id_fkey(full_name))")
          .lte("followup_on", todayCasa).is("followup_sent_at", null)
          .eq("status", "completed").limit(200);
        for (const a of (due ?? []) as any[]) {
          const email = a.patient?.email;
          const name = a.patient_name ?? a.patient?.full_name ?? "Patient";
          const docName = docTitle(a.doctor?.user?.full_name ?? "", a.doctor?.specialty);
          if (email) {
            const html = apptEmail({
              name, url: APP_URL,
              accent: "#16A06A", accentSoft: "#E7F6EE", emoji: "🩺",
              title: "C'est le moment de votre visite de suivi",
              sentence: `lors de votre dernière consultation, <strong>${esc(docName)}</strong> a recommandé une visite de suivi — c'est le moment idéal pour la programmer.`,
              ctaLabel: "Reprendre rendez-vous",
              subLine: "Réservez votre rendez-vous sur",
            });
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: FROM, to: email, subject: `Visite de suivi chez ${docName} — Tabibo`, html }),
            });
            if (res.ok) recalls++;
          }
          sendPushToUser(admin, a.patient_id ?? null, {
            title: "🩺 Visite de suivi recommandée",
            body: `${docName} vous recommande une visite de suivi — reprenez rendez-vous.`,
            url: "/search", tag: `followup-${a.id}`,
          });
          // Mark handled even without email so we never loop on the same visit.
          await admin.from("appointments").update({ followup_sent_at: new Date().toISOString() }).eq("id", a.id);
        }
      }

      return json({ ok: true, sent, skipped, failed, recalls });
    }

    return json({ ok: false, error: "unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
