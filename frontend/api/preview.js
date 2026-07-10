// Vercel serverless function — server-rendered link previews for doctor pages.
// Crawlers (WhatsApp, Facebook, Google, …) don't run the SPA's JavaScript, so
// vercel.json routes bot requests for /dr-<slug> here; we return minimal HTML
// whose OG tags carry the DOCTOR's name/specialty/city/photo. Humans never see
// this (the rewrite only matches crawler user-agents), and even if one lands
// here, the inline script sends them straight to the SPA.

const SPEC_FR = {
  generaliste: 'Médecin généraliste', gyneco: 'Gynécologue-obstétricien', cardio: 'Cardiologue',
  dermato: 'Dermatologue', pediatre: 'Pédiatre', ophtalmo: 'Ophtalmologue', dentiste: 'Chirurgien-dentiste',
  psy: 'Psychiatre', orl: 'ORL', kine: 'Kinésithérapeute', neuro: 'Neurologue',
  neurochirurgien: 'Neurochirurgien', gastro: 'Gastro-entérologue', endocrino: 'Endocrinologue',
  diabetologue: 'Diabétologue', rhumato: 'Rhumatologue', pneumo: 'Pneumologue', nephro: 'Néphrologue',
  uro: 'Urologue', ortho: 'Chirurgien orthopédiste',
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').replace(/[^a-z0-9-]/gi, '');
  const base = 'https://tabibo.ma';
  let title = 'Tabibo — Prenez rendez-vous avec un médecin au Maroc';
  let desc = 'Trouvez le bon spécialiste et réservez en ligne, 24h/24 et 7j/7.';
  let image = `${base}/icons/icon-512.png`;

  try {
    const SUPA = process.env.VITE_SUPABASE_URL;
    const KEY = process.env.VITE_SUPABASE_ANON_KEY;
    if (SUPA && KEY && slug) {
      const r = await fetch(
        `${SUPA}/rest/v1/doctor_directory?slug=eq.${encodeURIComponent(slug)}&select=full_name,specialty,city,avatar_url,rating,reviews_count&limit=1`,
        { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
      );
      const [doc] = (await r.json()) || [];
      if (doc) {
        const name = /^dr/i.test(doc.full_name || '') ? doc.full_name : `Dr. ${doc.full_name}`;
        const spec = SPEC_FR[doc.specialty] || 'Médecin';
        title = `${name} — ${spec}${doc.city ? ` à ${doc.city}` : ''} | Tabibo`;
        const stars = doc.reviews_count > 0 ? ` ★ ${doc.rating}/5 (${doc.reviews_count} avis).` : '';
        desc = `Prenez rendez-vous en ligne avec ${name}, ${spec.toLowerCase()}${doc.city ? ` à ${doc.city}` : ''} — créneaux en temps réel, confirmation immédiate.${stars}`;
        if (doc.avatar_url) image = doc.avatar_url;
      }
    }
  } catch (_) { /* fall back to the generic preview */ }

  const url = `${base}/${slug}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Tabibo">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:locale" content="fr_MA">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${esc(url)}">
</head><body>
<p><a href="${esc(url)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(url)});</script>
</body></html>`);
}
