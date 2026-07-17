// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · guest-booking
// Phone-VERIFIED guest booking: a patient books with name + phone only, and
// proves control of the phone with a one-time code before the appointment is
// created. Nobody can book with a number they don't own.
//
// Actions:
//   • status → { enabled }  (true iff an OTP channel is configured)
//   • start  → { doctorId, datetime, name, phone, reason } → sends the code
//   • verify → { phone, code } → creates the appointment (status 'pending')
//
// Anti-abuse (protects the doctors):
//   • ≤3 codes / phone / hour and ≤10 codes / IP / hour
//   • codes: 6 digits, 10-min expiry, 5 attempts, single-use
//   • one active upcoming booking per phone per doctor
//   • ≥3 no-shows at that cabinet → refused
//   • doctor's blocklist (roster status 'Bloqué') → refused
//
// Secrets (WhatsApp ONLY — no SMS by product decision):
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE_OTP
//   (an APPROVED Meta "authentication" template, body {{1}} = code)
//   After verification, the booked/confirmed WhatsApps reuse send-reminder.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WA_TPL_OTP = Deno.env.get("WHATSAPP_TEMPLATE_OTP") ?? "";
const WA_LANG = Deno.env.get("WHATSAPP_LANG") ?? "fr";
const waEnabled = !!(WA_TOKEN && WA_PHONE_ID && WA_TPL_OTP);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Normalise to E.164; Moroccan local numbers (0XXXXXXXXX) get +212.
function normPhone(raw: string): string | null {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p.length >= 9 && p.length <= 16 ? p : null;
  if (p.startsWith("0") && p.length === 10) return "+212" + p.slice(1);
  if (p.startsWith("212")) return "+" + p;
  return p.length >= 9 && p.length <= 15 ? "+" + p : null;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendWhatsAppOtp(to: string, code: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: WA_TPL_OTP,
        language: { code: WA_LANG },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  return res.ok;
}

// Cabinet closed (congés / absences) on that date. This depends only on PUBLIC
// data (doctor_time_off is world-readable), so it is safe to reveal in `start`.
async function cabinetClosedOnDate(admin: ReturnType<typeof createClient>, doctorId: string, datetime?: string): Promise<string | null> {
  if (!datetime) return null;
  const dayStr = new Date(datetime).toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
  const { data: off } = await admin.from("doctor_time_off")
    .select("id").eq("doctor_id", doctorId)
    .lte("start_date", dayStr).gte("end_date", dayStr).limit(1);
  if (off && off.length) return "Le cabinet est fermé à cette date — choisissez une autre date.";
  return null;
}

// FULL doctor-protection checks. These are IDENTITY-dependent (they reveal
// whether a phone has a booking / no-show / blocklist history with the doctor)
// and MUST run only in `verify`, after the OTP has proven phone ownership —
// running them in `start` would be an unauthenticated phone↔doctor enumeration
// oracle (each returns a distinct message and, refusing before any OTP row is
// written, never consumes rate-limit quota).
async function bookingRefusal(admin: ReturnType<typeof createClient>, doctorId: string, phone: string, datetime?: string): Promise<string | null> {
  const closed = await cabinetClosedOnDate(admin, doctorId, datetime);
  if (closed) return closed;
  // Blocklist: any roster entry for this cabinet with this phone and status 'Bloqué'.
  const { data: blocked } = await admin.from("doctor_patients")
    .select("id").eq("doctor_id", doctorId).eq("status", "Bloqué").eq("phone", phone).limit(1);
  if (blocked && blocked.length) return "La réservation en ligne n'est pas disponible pour ce numéro auprès de ce cabinet.";
  // Repeat no-shows at this cabinet.
  const { count: noShows } = await admin.from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId).eq("patient_phone", phone).eq("status", "no_show");
  if ((noShows ?? 0) >= 3) return "Réservation en ligne indisponible — contactez directement le cabinet.";
  // One active upcoming booking per phone per doctor.
  const { count: active } = await admin.from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId).eq("patient_phone", phone)
    .gt("datetime", new Date().toISOString()).in("status", ["pending", "confirmed"]);
  if ((active ?? 0) >= 1) return "Vous avez déjà un rendez-vous à venir chez ce praticien.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const p = await req.json().catch(() => ({}));
    // Trust the LAST x-forwarded-for hop (the platform appends the real peer
    // address on the right; the left-most token is client-spoofable). Sanitize
    // to IP characters so it can never perturb a query.
    const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const ip = (xff.length ? xff[xff.length - 1] : "").replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45) || "unknown";

    // ── status ────────────────────────────────────────────────────────────────
    if (p.action === "status") return json({ ok: true, enabled: waEnabled });

    if (!waEnabled) return json({ ok: false, error: "guest_unavailable" }, 400);

    // ── start: validate → rate-limit → send the code ─────────────────────────
    if (p.action === "start") {
      const phone = normPhone(p.phone);
      const name = String(p.name || "").trim().slice(0, 120);
      const doctorId = String(p.doctorId || "");
      const datetime = String(p.datetime || "");
      if (!phone) return json({ ok: false, error: "Numéro de téléphone invalide." }, 400);
      if (name.length < 3) return json({ ok: false, error: "Indiquez votre nom complet." }, 400);
      if (!doctorId || !datetime || isNaN(new Date(datetime).getTime())) return json({ ok: false, error: "Rendez-vous invalide." }, 400);
      if (new Date(datetime) < new Date()) return json({ ok: false, error: "Ce créneau est déjà passé." }, 400);

      // Doctor must be live in the public directory.
      const { data: doc } = await admin.from("doctor_directory").select("id").eq("id", doctorId).maybeSingle();
      if (!doc) return json({ ok: false, error: "Praticien indisponible." }, 400);

      const hourAgo = new Date(Date.now() - 3600e3).toISOString();
      const { count: perPhone } = await admin.from("booking_otps")
        .select("id", { count: "exact", head: true }).eq("phone", phone).gt("created_at", hourAgo);
      if ((perPhone ?? 0) >= 3) return json({ ok: false, error: "Trop de tentatives — réessayez dans une heure." }, 429);
      const { count: perIp } = await admin.from("booking_otps")
        .select("id", { count: "exact", head: true }).eq("ip", ip).gt("created_at", hourAgo);
      if ((perIp ?? 0) >= 10) return json({ ok: false, error: "Trop de tentatives — réessayez plus tard." }, 429);

      // Only the PUBLIC cabinet-closed check runs pre-verification. The identity-
      // dependent refusals (existing booking, no-shows, blocklist) are deferred to
      // `verify` — running them here would leak a phone↔doctor relationship to an
      // unauthenticated probe. They are still enforced after OTP verification.
      const closed = await cabinetClosedOnDate(admin, doctorId, datetime);
      if (closed) return json({ ok: false, error: closed }, 403);

      // Slot still free? (final race handled by the unique index at insert)
      const { count: taken } = await admin.from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctorId).eq("datetime", new Date(datetime).toISOString())
        .in("status", ["pending", "confirmed", "completed"]);
      if ((taken ?? 0) > 0) return json({ ok: false, error: "slot_taken" }, 409);

      // Cryptographically secure 6-digit code (Math.random is predictable).
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
      const payload = { doctorId, datetime: new Date(datetime).toISOString(), name, reason: String(p.reason || "").slice(0, 500) || null };
      await admin.from("booking_otps").insert({
        phone, ip, code_hash: await sha256(code + phone), payload,
        expires_at: new Date(Date.now() + 10 * 60e3).toISOString(),
      });

      if (!(await sendWhatsAppOtp(phone, code))) {
        return json({ ok: false, error: "Envoi du code WhatsApp impossible — vérifiez le numéro." }, 502);
      }
      return json({ ok: true, sent: "whatsapp", phone });
    }

    // ── verify: check the code → create the appointment ──────────────────────
    if (p.action === "verify") {
      const phone = normPhone(p.phone);
      const code = String(p.code || "").replace(/\D/g, "");
      if (!phone || code.length !== 6) return json({ ok: false, error: "Code invalide." }, 400);

      const { data: rows } = await admin.from("booking_otps")
        .select("*").eq("phone", phone).eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(1);
      const otp = rows?.[0];
      if (!otp) return json({ ok: false, error: "Code expiré — recommencez la réservation." }, 400);
      if (otp.attempts >= 5) return json({ ok: false, error: "Trop d'essais — recommencez la réservation." }, 429);

      if (otp.code_hash !== (await sha256(code + phone))) {
        await admin.from("booking_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
        return json({ ok: false, error: "Code incorrect." }, 400);
      }

      const pl = otp.payload as { doctorId: string; datetime: string; name: string; reason: string | null };
      const refusal = await bookingRefusal(admin, pl.doctorId, phone, pl.datetime);
      if (refusal) return json({ ok: false, error: refusal }, 403);

      const { data: dr } = await admin.from("doctors").select("fee_mad").eq("id", pl.doctorId).maybeSingle();
      const { data: appt, error } = await admin.from("appointments").insert({
        doctor_id: pl.doctorId, patient_id: null, datetime: pl.datetime,
        patient_name: pl.name, patient_phone: phone,
        reason: pl.reason, status: "pending",
        fee: (dr as any)?.fee_mad ?? null,
      }).select().single();
      if (error) {
        if ((error as any).code === "23505") return json({ ok: false, error: "slot_taken" }, 409);
        console.error("guest-booking insert error:", (error as any).code);
        return json({ ok: false, error: "server_error" }, 500);
      }
      await admin.from("booking_otps").update({ used: true }).eq("id", otp.id);
      // Fire-and-forget: the "réservé" WhatsApp goes out through the same
      // pipeline as account bookings (send-reminder logs it in reminder_log).
      fetch(`${SUPABASE_URL}/functions/v1/send-reminder`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "send", appointment_id: (appt as any).id, template: "confirmation" }),
      }).catch(() => {});
      return json({ ok: true, appointmentId: (appt as any).id });
    }

    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e) {
    console.error("guest-booking error:", (e as Error)?.message ?? e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
