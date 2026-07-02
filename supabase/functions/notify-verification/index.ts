// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · notify-verification
// Sends branded emails for the doctor credentialing workflow:
//   • type "new_registration" → emails every admin: a doctor is pending review
//   • type "decision"         → emails the doctor: approved or rejected (+reason)
//
// Deploy:   supabase functions deploy notify-verification
// Secrets:  supabase secrets set RESEND_API_KEY=...  TABIBO_FROM="Tabibo <noreply@tabibo.ma>"
//           (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TABIBO_FROM") ?? "Tabibo <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Prefer an explicit secret key (new API-key system); fall back to the
// auto-injected legacy service-role key.
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const G = "#16A06A";

// Escape dynamic values before interpolating them into email HTML. Without this
// any caller-supplied (or stored) field — doctor name, rejection note, etc. —
// could inject markup/links and turn a Tabibo-branded email into a phishing page.
function esc(v: unknown) {
  return String(v ?? "—").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Doctor title driven by specialty: physicians/dentist → "Dr."; paramedical → none.
const NON_DR_SPECS = new Set(["kine","psychologue","orthophoniste","orthoptiste","podologue","osteopathe","sagefemme","dieteticien","audioprothesiste","opticien","infirmier"]);
function docTitle(name: string, spec?: string) {
  const clean = String(name || "").replace(/^\s*(d(?:r|octeur)\.?|pr\.?)\s+/i, "").trim();
  if (!clean) return "votre médecin";
  return spec && NON_DR_SPECS.has(spec) ? clean : `Dr. ${clean}`;
}

// A polished, brand-consistent transactional email (email-client-safe tables).
function apptEmail(d: {
  name: string; title: string; sentence: string; ctaLabel: string; subLine: string;
  accent: string; accentSoft: string; emoji: string; url: string;
}) {
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


function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F8F5;font-family:Inter,Arial,sans-serif;color:#15314A">
    <div style="max-width:560px;margin:0 auto;padding:28px 18px">
      <div style="font-size:24px;font-weight:800;color:${G};letter-spacing:-.5px;margin-bottom:18px">Tabibo</div>
      <div style="background:#fff;border:1px solid #EAEFEC;border-radius:16px;padding:28px">
        <h1 style="font-size:19px;margin:0 0 14px">${title}</h1>
        ${body}
      </div>
      <p style="font-size:12px;color:#6B7B76;text-align:center;margin-top:20px">Tabibo · Plateforme médicale digitale · Maroc</p>
    </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const body = await res.text();
  if (!res.ok) console.error("Resend error", body);
  return { ok: res.ok, status: res.status, body };
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ── Caller authorization ──────────────────────────────────────────────────────
// This function holds the service-role key (bypasses RLS), so it must verify WHO
// is calling. Every legitimate caller is a logged-in app user; we validate their
// JWT and read their role. The public anon key resolves to no user → rejected.
const SERVICE_KEYS = [
  SERVICE_KEY,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  Deno.env.get("SB_SECRET_KEY"),
].filter(Boolean) as string[];

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  const deny = { ok: false, isService: false, isAdmin: false, me: null as any };
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny;
  if (SERVICE_KEYS.includes(token)) return { ok: true, isService: true, isAdmin: true, me: null as any };
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return deny;
  const { data: me } = await admin.from("users").select("id, role, email").eq("auth_id", user.id).maybeSingle();
  if (!me) return deny;
  return { ok: true, isService: false, isAdmin: (me as any).role === "admin", me: me as any };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authz = await authorize(req, admin);
    if (!authz.ok) return json({ ok: false, error: "unauthorized" }, 401);

    // ── Diagnostic: send a test email and return the real result ──
    if (p.type === "test") {
      if (!authz.isAdmin) return json({ ok: false, error: "forbidden" }, 403);
      if (!RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY manquant dans les secrets de la fonction." });
      if (!p.to) return json({ ok: false, error: "Adresse destinataire manquante." });
      const r = await sendEmail(p.to, "Email de test — Tabibo", shell("Email de test ✓", `<p>Ceci est un email de test envoyé depuis la console d'administration Tabibo.</p><p>Si vous le recevez, votre configuration Resend (clé API + adresse d'envoi) fonctionne correctement.</p>`));
      let detail: unknown = r.body;
      try { detail = JSON.parse(r.body); } catch { /* keep raw */ }
      const errMsg = !r.ok ? ((detail as any)?.message || (detail as any)?.error?.message || r.body) : null;
      return json({ ok: r.ok, from: FROM, status: r.status, to: p.to, error: errMsg, detail });
    }

    if (p.type === "new_registration") {
      // 1) Notify every admin that a doctor is awaiting review.
      const { data: admins } = await admin.from("users").select("email").eq("role", "admin");
      const recipients = (admins ?? []).map((a: any) => a.email).filter(Boolean);
      const adminBody = `
        <p>Un nouveau médecin vient de s'inscrire et attend votre validation.</p>
        <table style="font-size:14px;margin:10px 0 18px">
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Nom</td><td style="font-weight:600">${esc(p.doctorName)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Spécialité</td><td style="font-weight:600">${esc(p.specialty)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Ville</td><td style="font-weight:600">${esc(p.city)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">INPE</td><td style="font-weight:600">${esc(p.inpe)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Ordre (CNOM)</td><td style="font-weight:600">${esc(p.cnom)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Email</td><td style="font-weight:600">${esc(p.doctorEmail)}</td></tr>
        </table>
        <p style="font-size:14px"><strong>Action requise :</strong> connectez-vous à la console d'administration Tabibo pour examiner les documents et accepter ou refuser ce médecin.</p>`;
      for (const to of recipients) await sendEmail(to, `Nouveau médecin en attente de validation — ${esc(p.doctorName)}`, shell("Médecin en attente de validation", adminBody));

      // 2) Confirm to the doctor that their application was received. Send to the
      //    caller's OWN account email (never a body-supplied address), so this
      //    branch can't be abused to mail arbitrary recipients.
      const docTo = authz.me?.email ?? null;
      if (docTo) {
        const docBody = `
          <p>Bonjour Dr. ${esc(p.doctorName)},</p>
          <p>Nous avons bien reçu votre demande d'inscription sur <strong>Tabibo</strong>. Merci de votre confiance.</p>
          <p>Votre dossier et vos documents sont en cours d'examen par notre équipe de vérification. Cette étape garantit la sécurité et la confiance de nos patients.</p>
          <div style="background:#F4F8F5;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:13px;color:#6B7B76;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Récapitulatif</div>
            <table style="font-size:14px">
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Spécialité</td><td style="font-weight:600">${esc(p.specialty)}</td></tr>
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Ville</td><td style="font-weight:600">${esc(p.city)}</td></tr>
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Ordre (CNOM)</td><td style="font-weight:600">${esc(p.cnom)}</td></tr>
            </table>
          </div>
          <p><strong>Et maintenant ?</strong> Vous recevrez un email dès qu'une décision sera prise — généralement sous <strong>24 à 48 h</strong>. Aucune action n'est requise de votre part pour le moment.</p>
          <p style="margin-top:18px">À très bientôt,<br/>L'équipe Tabibo</p>`;
        await sendEmail(docTo, "Nous avons bien reçu votre inscription Tabibo", shell("Inscription reçue — en cours de vérification", docBody));
      }

      return new Response(JSON.stringify({ ok: true, sent: recipients.length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (p.type === "payment_declared") {
      // A doctor signalled a transfer → notify admins to validate.
      const { data: admins } = await admin.from("users").select("email").eq("role", "admin");
      const recipients = (admins ?? []).map((a: any) => a.email).filter(Boolean);
      const body = `
        <p>Un médecin a signalé un paiement par virement. Validation requise.</p>
        <table style="font-size:14px;margin:10px 0 18px">
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Médecin</td><td style="font-weight:600">${esc(p.doctorName)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Formule</td><td style="font-weight:600">${esc(p.plan)}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Montant</td><td style="font-weight:600">${esc(p.amount)} MAD</td></tr>
        </table>
        <p style="font-size:14px"><strong>Action requise :</strong> vérifiez la réception sur le compte bancaire puis cliquez « Valider » dans la console Tabibo pour activer le compte.</p>`;
      for (const to of recipients) await sendEmail(to, `Paiement à valider — ${esc(p.doctorName)}`, shell("Paiement signalé — validation en attente", body));
      return new Response(JSON.stringify({ ok: true, sent: recipients.length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (p.type === "decision" && p.doctorEmail) {
      if (!authz.isAdmin) return json({ ok: false, error: "forbidden" }, 403);
      if (p.status === "approved") {
        const body = `
          <p>Bonjour Dr. ${esc(p.doctorName)},</p>
          <p>Excellente nouvelle — votre compte médecin sur <strong>Tabibo</strong> a été <span style="color:${G};font-weight:700">approuvé</span>.</p>
          <p>Votre profil est désormais visible par les patients et vous pouvez gérer votre agenda, vos rendez-vous et votre cabinet depuis votre espace.</p>
          <p style="margin-top:18px"><a href="${p.appUrl ?? "https://tabibo.ma"}" style="background:${G};color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700;display:inline-block">Accéder à mon espace</a></p>
          <p style="margin-top:18px">Bienvenue parmi nous,<br/>L'équipe Tabibo</p>`;
        await sendEmail(p.doctorEmail, "Votre compte Tabibo a été approuvé ✓", shell("Votre compte est approuvé", body));
      } else {
        const reason = p.reason ?? "Dossier incomplet";
        const note = p.note ? `<p style="background:#F4F8F5;border-radius:10px;padding:12px 14px;font-size:14px"><strong>Détails :</strong> ${esc(p.note)}</p>` : "";
        const body = `
          <p>Bonjour Dr. ${esc(p.doctorName)},</p>
          <p>Après examen de votre dossier, votre inscription sur <strong>Tabibo</strong> n'a pas pu être validée pour le motif suivant :</p>
          <p style="background:#FCE7EE;color:#C2466A;border-radius:10px;padding:12px 14px;font-size:14px;font-weight:600">${reason}</p>
          ${note}
          <p>Vous pouvez corriger votre dossier et soumettre à nouveau vos documents. Pour toute question, répondez simplement à cet email.</p>
          <p style="margin-top:18px">Cordialement,<br/>L'équipe Tabibo</p>`;
        await sendEmail(p.doctorEmail, "Mise à jour de votre inscription Tabibo", shell("Inscription non validée", body));
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── appointment events → email the patient (+ the doctor for some events) ──
    if (p.type === "appointment" && p.appointment_id) {
      const APP_URL = Deno.env.get("APP_URL") ?? "https://tabibo.ma";
      const { data: a } = await admin
        .from("appointments")
        .select("datetime, patient_id, patient_name, patient:users(full_name, email), doctor:doctors(user_id, specialty, user:users!doctors_user_id_fkey(full_name, email))")
        .eq("id", p.appointment_id).maybeSingle();
      const av: any = a;
      if (!av) return new Response(JSON.stringify({ ok: true, skipped: "appt not found" }), { headers: { ...cors, "Content-Type": "application/json" } });
      // Only a party to this appointment (its patient or doctor), an admin, or the
      // server may trigger its emails — recipients are DB-derived regardless.
      const isParty = authz.isAdmin || (authz.me && (authz.me.id === av.patient_id || authz.me.id === av.doctor?.user_id));
      if (!isParty) return json({ ok: false, error: "forbidden" }, 403);
      const doctorEmail = av.doctor?.user?.email;
      const doctor = docTitle(av.doctor?.user?.full_name ?? "", av.doctor?.specialty);
      const patientEmail = av.patient?.email;
      const patientName = av.patient?.full_name ?? av.patient_name ?? "Patient";
      const dObj = new Date(av.datetime);
      const dateStr = dObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" });
      const heureStr = dObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" });
      const ev = p.event;
      const rdv = `le <strong>${esc(dateStr)}</strong> à <strong>${esc(heureStr)}</strong> avec <strong>${esc(doctor)}</strong>`;

      // → Patient email — one polished, on-brand template per event.
      if (patientEmail) {
        const GREEN = { accent: "#16A06A", accentSoft: "#E7F6EE" };
        const RED = { accent: "#E2546B", accentSoft: "#FCE7EE" };
        const AMBER = { accent: "#E8A33D", accentSoft: "#FEF3DC" };
        let cfg: any = null;
        if (ev === "booked")           cfg = { ...GREEN, emoji: "📅", title: "Rendez-vous enregistré", sentence: `votre rendez-vous ${rdv} a bien été enregistré.`, ctaLabel: "Gérer mes rendez-vous", subLine: "Gérez vos rendez-vous sur" };
        else if (ev === "confirmed")   cfg = { ...GREEN, emoji: "✅", title: "Rendez-vous confirmé", sentence: `votre rendez-vous ${rdv} est confirmé.`, ctaLabel: "Gérer mes rendez-vous", subLine: "Gérez vos rendez-vous sur" };
        else if (ev === "rescheduled") cfg = { ...AMBER, emoji: "🔁", title: "Rendez-vous reporté", sentence: `votre rendez-vous a été reporté ${rdv}.`, ctaLabel: "Gérer mes rendez-vous", subLine: "Gérez vos rendez-vous sur" };
        else if (ev === "cancelled" || ev === "cancelled_by_patient") cfg = { ...RED, emoji: "🗓️", title: "Rendez-vous annulé", sentence: `votre rendez-vous ${rdv} a bien été annulé.`, ctaLabel: "Prendre un rendez-vous", subLine: "Prenez un nouveau rendez-vous sur" };
        if (cfg) await sendEmail(patientEmail, `${cfg.title} — Tabibo`, apptEmail({ name: patientName, url: APP_URL, ...cfg }));
      }

      // → Doctor email (new booking / patient cancellation) — same brand template.
      if (doctorEmail && (ev === "booked" || ev === "cancelled_by_patient")) {
        const isCancel = ev === "cancelled_by_patient";
        const cfg = isCancel
          ? { accent: "#E2546B", accentSoft: "#FCE7EE", emoji: "🗓️", title: "Rendez-vous annulé", sentence: `<strong>${esc(patientName)}</strong> a annulé son rendez-vous du <strong>${esc(dateStr)}</strong> à <strong>${esc(heureStr)}</strong>. Le créneau est de nouveau disponible.`, ctaLabel: "Voir mon agenda", subLine: "Gérez votre agenda sur" }
          : { accent: "#16A06A", accentSoft: "#E7F6EE", emoji: "📅", title: "Nouveau rendez-vous", sentence: `<strong>${esc(patientName)}</strong> a réservé un rendez-vous le <strong>${esc(dateStr)}</strong> à <strong>${esc(heureStr)}</strong>. Connectez-vous pour le confirmer.`, ctaLabel: "Voir mon agenda", subLine: "Gérez votre agenda sur" };
        await sendEmail(doctorEmail, `${cfg.title} — Tabibo`, apptEmail({ name: doctor, url: APP_URL, ...cfg }));
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown type" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
