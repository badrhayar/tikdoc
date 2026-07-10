// Runtime SEO: per-screen <title> + meta description (+ OG mirrors).
// Googlebot executes JS, so distinct titles/descriptions per route help
// indexing; they also fix browser tabs & history entries. True per-doctor
// link previews (WhatsApp) need prerendering — see LAUNCH.md roadmap.

const upsert = (selector, attr, value) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [k, v] = selector.replace(/^meta\[|\]$/g, '').split('=');
    el.setAttribute(k, v.replace(/"/g, ''));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

export function setPageMeta(title, description) {
  const t = title ? `${title} | Tabibo` : 'Tabibo — Prenez rendez-vous avec un médecin au Maroc';
  document.title = t;
  upsert('meta[property="og:title"]', 'content', t);
  if (description) {
    upsert('meta[name="description"]', 'content', description);
    upsert('meta[property="og:description"]', 'content', description);
  }
}

// Screen → SEO copy for the public/patient routes (private screens get a
// neutral title; nothing sensitive ever goes into the tab or history).
export const SCREEN_META = {
  home:        ['', ''],
  search:      ['Trouver un médecin', 'Recherchez un généraliste ou un spécialiste au Maroc et réservez en ligne, 24h/24.'],
  forpatients: ['Pour les patients', 'Réservez vos rendez-vous médicaux en ligne gratuitement — rappels automatiques, dossier et ordonnances au même endroit.'],
  fordoctors:  ['Pour les médecins', 'Agenda en ligne, rappels WhatsApp, dossier patient : l\'outil de cabinet qui remplit votre agenda.'],
  about:       ['À propos', 'Tabibo simplifie l\'accès aux soins au Maroc — pour les patients comme pour les médecins.'],
  contact:     ['Contact', 'Contactez l\'équipe Tabibo — support patients et médecins.'],
  confidentialite: ['Confidentialité', 'Politique de confidentialité et protection des données de santé sur Tabibo.'],
  plogin:      ['Connexion patient', ''],
  pregister:   ['Créer un compte patient', ''],
  login:       ['Espace médecin', ''],
  docregister: ['Inscription médecin', ''],
  pinfo:       ['Confirmer le rendez-vous', ''],
  confirm:     ['Rendez-vous confirmé', ''],
  paccount:    ['Mon espace patient', ''],
  pmessages:   ['Mes messages', ''],
  doctor:      ['Espace cabinet', ''],
};
