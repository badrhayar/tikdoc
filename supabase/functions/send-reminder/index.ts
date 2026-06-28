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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

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

// Send one reminder for an appointment row and record the attempt.
async function sendOne(
  admin: ReturnType<typeof createClient>,
  appt: { id: string; doctor_id: string; datetime: string; patient_name: string; phone: string; doctor_name: string },
  template: string,
) {
  const when = new Date(appt.datetime);
  const params = [appt.patient_name || "patient", dateFmt.format(when), timeFmt.format(when), appt.doctor_name || "votre médecin"];
  const bodyText = `Rappel RDV — ${params.join(" · ")}`;

  if (!WA_TOKEN || !WA_PHONE_ID) {
    await admin.from("reminder_log").insert({
      doctor_id: appt.doctor_id, appointment_id: appt.id, patient_name: appt.patient_name,
      phone: appt.phone, template, body: bodyText, status: "failed",
      error: "WhatsApp non configuré (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants).",
    });
    return { ok: false, error: "not_configured" };
  }

  const to = normalizePhone(appt.phone);
  const r = await sendTemplate(to, params, templateFor(template));
  await admin.from("reminder_log").insert({
    doctor_id: appt.doctor_id, appointment_id: appt.id, patient_name: appt.patient_name,
    phone: appt.phone, template, body: bodyText,
    status: r.ok ? "sent" : "failed", provider_id: r.providerId, error: r.error,
    sent_at: r.ok ? new Date().toISOString() : null,
  });
  return r;
}

// Fetch appointments whose datetime falls in [from, to], joined to patient + doctor.
async function dueAppointments(admin: ReturnType<typeof createClient>, fromISO: string, toISO: string) {
  const { data } = await admin
    .from("appointments")
    .select("id, doctor_id, datetime, status, patient_name, patient_phone, patient:users(full_name, phone), doctor:doctors(id, user:users!doctors_user_id_fkey(full_name))")
    .gte("datetime", fromISO).lte("datetime", toISO)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).map((a: any) => ({
    id: a.id, doctor_id: a.doctor_id, datetime: a.datetime,
    patient_name: a.patient?.full_name ?? a.patient_name ?? "", phone: a.patient?.phone ?? a.patient_phone ?? "",
    doctor_name: a.doctor?.user?.full_name ?? "",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── test ─────────────────────────────────────────────────────────────────
    // Optional `template`: 'reminder' (default) | 'confirmation' (booked) |
    // 'confirmed' | 'cancelled' | 'rescheduled' — to test any template.
    if (p.type === "test") {
      if (!WA_TOKEN || !WA_PHONE_ID) return json({ ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants dans les secrets." });
      if (!p.to) return json({ ok: false, error: "Numéro destinataire manquant." });
      const tpl = templateFor(p.template ?? "");
      const r = await sendTemplate(normalizePhone(p.to), ["Ahmed", "lundi 30 juin", "14:30", "Dr. Benali"], tpl);
      return json({ ...r, template_used: tpl });
    }

    // ── send one ───────────────────────────────────────────────────────────────
    if (p.type === "send" && p.appointment_id) {
      const { data, error: qErr } = await admin
        .from("appointments")
        .select("id, doctor_id, datetime, patient_name, patient_phone, patient:users(full_name, phone), doctor:doctors(id, user:users!doctors_user_id_fkey(full_name))")
        .eq("id", p.appointment_id).maybeSingle();
      if (!data) return json({ ok: false, error: "Rendez-vous introuvable.", detail: qErr?.message ?? null }, 404);
      const a: any = data;
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
        doctor_name: a.doctor?.user?.full_name ?? "",
      }, template);
      return json(r);
    }

    // ── dispatch (hourly cron) ─────────────────────────────────────────────────
    if (p.type === "dispatch") {
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
      return json({ ok: true, sent, skipped, failed });
    }

    return json({ ok: false, error: "unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
