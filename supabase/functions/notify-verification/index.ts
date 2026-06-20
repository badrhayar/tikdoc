// ─────────────────────────────────────────────────────────────────────────────
// TikDoc · Edge Function · notify-verification
// Sends branded emails for the doctor credentialing workflow:
//   • type "new_registration" → emails every admin: a doctor is pending review
//   • type "decision"         → emails the doctor: approved or rejected (+reason)
//
// Deploy:   supabase functions deploy notify-verification
// Secrets:  supabase secrets set RESEND_API_KEY=...  TIKDOC_FROM="TikDoc <noreply@tikdoc.ma>"
//           (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("TIKDOC_FROM") ?? "TikDoc <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const G = "#16A06A";

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F8F5;font-family:Inter,Arial,sans-serif;color:#15314A">
    <div style="max-width:560px;margin:0 auto;padding:28px 18px">
      <div style="font-size:24px;font-weight:800;color:${G};letter-spacing:-.5px;margin-bottom:18px">TikDoc</div>
      <div style="background:#fff;border:1px solid #EAEFEC;border-radius:16px;padding:28px">
        <h1 style="font-size:19px;margin:0 0 14px">${title}</h1>
        ${body}
      </div>
      <p style="font-size:12px;color:#6B7B76;text-align:center;margin-top:20px">TikDoc · Plateforme médicale digitale · Maroc</p>
    </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error", await res.text());
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (p.type === "new_registration") {
      // 1) Notify every admin that a doctor is awaiting review.
      const { data: admins } = await admin.from("users").select("email").eq("role", "admin");
      const recipients = (admins ?? []).map((a: any) => a.email).filter(Boolean);
      const adminBody = `
        <p>Un nouveau médecin vient de s'inscrire et attend votre validation.</p>
        <table style="font-size:14px;margin:10px 0 18px">
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Nom</td><td style="font-weight:600">${p.doctorName ?? "—"}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Spécialité</td><td style="font-weight:600">${p.specialty ?? "—"}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Ville</td><td style="font-weight:600">${p.city ?? "—"}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">INPE</td><td style="font-weight:600">${p.inpe ?? "—"}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Ordre (CNOM)</td><td style="font-weight:600">${p.cnom ?? "—"}</td></tr>
          <tr><td style="color:#6B7B76;padding:3px 14px 3px 0">Email</td><td style="font-weight:600">${p.doctorEmail ?? "—"}</td></tr>
        </table>
        <p style="font-size:14px"><strong>Action requise :</strong> connectez-vous à la console d'administration TikDoc pour examiner les documents et accepter ou refuser ce médecin.</p>`;
      for (const to of recipients) await sendEmail(to, `Nouveau médecin en attente de validation — ${p.doctorName ?? ""}`, shell("Médecin en attente de validation", adminBody));

      // 2) Confirm to the doctor that their application was received.
      if (p.doctorEmail) {
        const docBody = `
          <p>Bonjour Dr. ${p.doctorName ?? ""},</p>
          <p>Nous avons bien reçu votre demande d'inscription sur <strong>TikDoc</strong>. Merci de votre confiance.</p>
          <p>Votre dossier et vos documents sont en cours d'examen par notre équipe de vérification. Cette étape garantit la sécurité et la confiance de nos patients.</p>
          <div style="background:#F4F8F5;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:13px;color:#6B7B76;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Récapitulatif</div>
            <table style="font-size:14px">
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Spécialité</td><td style="font-weight:600">${p.specialty ?? "—"}</td></tr>
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Ville</td><td style="font-weight:600">${p.city ?? "—"}</td></tr>
              <tr><td style="color:#6B7B76;padding:2px 14px 2px 0">Ordre (CNOM)</td><td style="font-weight:600">${p.cnom ?? "—"}</td></tr>
            </table>
          </div>
          <p><strong>Et maintenant ?</strong> Vous recevrez un email dès qu'une décision sera prise — généralement sous <strong>24 à 48 h</strong>. Aucune action n'est requise de votre part pour le moment.</p>
          <p style="margin-top:18px">À très bientôt,<br/>L'équipe TikDoc</p>`;
        await sendEmail(p.doctorEmail, "Nous avons bien reçu votre inscription TikDoc", shell("Inscription reçue — en cours de vérification", docBody));
      }

      return new Response(JSON.stringify({ ok: true, sent: recipients.length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (p.type === "decision" && p.doctorEmail) {
      if (p.status === "approved") {
        const body = `
          <p>Bonjour Dr. ${p.doctorName ?? ""},</p>
          <p>Excellente nouvelle — votre compte médecin sur <strong>TikDoc</strong> a été <span style="color:${G};font-weight:700">approuvé</span>.</p>
          <p>Votre profil est désormais visible par les patients et vous pouvez gérer votre agenda, vos rendez-vous et votre cabinet depuis votre espace.</p>
          <p style="margin-top:18px"><a href="${p.appUrl ?? "https://tikdoc.ma"}" style="background:${G};color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700;display:inline-block">Accéder à mon espace</a></p>
          <p style="margin-top:18px">Bienvenue parmi nous,<br/>L'équipe TikDoc</p>`;
        await sendEmail(p.doctorEmail, "Votre compte TikDoc a été approuvé ✓", shell("Votre compte est approuvé", body));
      } else {
        const reason = p.reason ?? "Dossier incomplet";
        const note = p.note ? `<p style="background:#F4F8F5;border-radius:10px;padding:12px 14px;font-size:14px"><strong>Détails :</strong> ${p.note}</p>` : "";
        const body = `
          <p>Bonjour Dr. ${p.doctorName ?? ""},</p>
          <p>Après examen de votre dossier, votre inscription sur <strong>TikDoc</strong> n'a pas pu être validée pour le motif suivant :</p>
          <p style="background:#FCE7EE;color:#C2466A;border-radius:10px;padding:12px 14px;font-size:14px;font-weight:600">${reason}</p>
          ${note}
          <p>Vous pouvez corriger votre dossier et soumettre à nouveau vos documents. Pour toute question, répondez simplement à cet email.</p>
          <p style="margin-top:18px">Cordialement,<br/>L'équipe TikDoc</p>`;
        await sendEmail(p.doctorEmail, "Mise à jour de votre inscription TikDoc", shell("Inscription non validée", body));
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown type" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
