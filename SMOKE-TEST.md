# Tabibo — Test de mise en production (≈30 min)

À dérouler **dans l'ordre**, le jour du déploiement, avec deux appareils :
un ordinateur (rôle médecin/admin) et un téléphone (rôle patient).
Chaque étape a un ✅ attendu — si vous ne l'obtenez pas, arrêtez-vous et notez
l'étape : c'est l'information qu'il me faut pour corriger.

## 0 · Pré-requis (déjà faits, cocher pour confirmer)

- [ ] `supabase db push` — 0 erreur (toutes les migrations, y compris time_off,
      waitlist, review_replies, consultation_flow).
- [ ] `supabase functions deploy` — les 6 fonctions : notify-verification,
      send-reminder, phone-login, invite-patient, admin-delete-user, guest-booking.
- [ ] Secrets fonctions : `RESEND_API_KEY`, `APP_URL=https://tabibo.ma`
      (+ `WHATSAPP_*` si Meta déjà prêt — sinon plus tard, rien ne casse).
- [ ] Vault (SQL editor) : `tabibo_functions_url` + `tabibo_cron_key`
      → active rappels J-1/J-2 **et** liste d'attente.
- [ ] Resend : domaine tabibo.ma vérifié (SPF/DKIM verts).
- [ ] Vercel : variables `VITE_*` en production, déploiement vert.
- [ ] Supabase Auth : CAPTCHA Turnstile activé, Site URL = https://tabibo.ma.
- [ ] Backups quotidiens activés (Settings → Database).

## 1 · Vitrine & SEO (3 min, téléphone)

1. Ouvrir https://tabibo.ma → ✅ landing propre, logo net, carte du Maroc
   avec les 11 villes.
2. Onglet du navigateur → ✅ titre « Tabibo — Prenez rendez-vous… ».
3. https://tabibo.ma/robots.txt et /sitemap.xml → ✅ 200, contenu visible.
4. Basculer la langue en **ع** sur /search → ✅ interface en arabe, sens RTL.

## 2 · Parcours médecin (10 min, ordinateur)

5. « Enregistrer mon cabinet » → créer un **médecin de test** (email réel à vous).
6. Console admin → approuver ce médecin → ✅ email d'approbation reçu.
7. Se connecter comme médecin → ✅ tableau de bord + checklist d'activation.
8. Disponibilités : définir les horaires (ex. lun–ven 9h–18h, pause 12h–14h)
   → « Enregistrer les horaires » → ✅ « Enregistré ✓ » et créneaux du jour
   reflètent les horaires (pause absente, prière en violet si activée).
9. Congés : fermer une date de la semaine prochaine → ✅ listée avec « Rouvrir ».
10. Inviter mes patients : ✅ lien tabibo.ma/dr-… copiable, QR téléchargeable.
11. **Partager le lien sur WhatsApp (vers vous-même)** → ✅ l'aperçu montre
    le NOM du médecin de test (pas la carte générique Tabibo).

## 3 · Parcours patient (10 min, téléphone)

12. Ouvrir le lien dr-… → ✅ profil du médecin, bandeau « Prochain créneau ».
13. Vérifier : la date fermée en congés (étape 9) est **grisée** dans le
    calendrier ; les créneaux hors horaires n'apparaissent pas.
14. Créer un **compte patient de test** (email réel) → réserver un créneau
    → ✅ page « Rendez-vous confirmé » + **email « Rendez-vous enregistré »**
    reçu, + **email « Nouveau rendez-vous » chez le médecin**.
15. « Ajouter au calendrier » → ✅ le .ics s'ouvre dans l'agenda du téléphone.
16. Côté médecin : Rendez-vous → **✓ Confirmer** → ✅ email « confirmé » patient.
17. Marquer « Patient arrivé » puis « → Consultation » → ✅ le tableau de bord
    montre les strips Salle d'attente / En consultation.
18. « Terminer & encaisser » (300 MAD, Espèces) → ✅ email « Merci de votre
    visite — laissez un avis » reçu côté patient.
19. Patient : laisser un avis 5★ → ✅ visible sur le profil public ;
    médecin : Statistiques → répondre à l'avis → ✅ « Réponse du praticien »
    visible sur le profil.

## 4 · Annulation & liste d'attente (5 min)

20. Patient : réserver un 2ᵉ rendez-vous **à +48h** (la règle des 24h bloque
    l'annulation en ligne d'un RDV plus proche — vérifier ce blocage au
    passage sur un RDV à demain si vous voulez : ✅ message « contactez le
    cabinet »).
21. Avec un **2ᵉ compte patient** : sur la même journée, cliquer
    « 🔔 M'avertir si un créneau se libère » (si la journée est pleine ;
    sinon réduire « max RDV/jour » à 1 pour la forcer).
22. Patient 1 : annuler le RDV → ✅ patient 2 reçoit l'email
    « Un créneau s'est libéré » en ~1 min ; le médecin reçoit l'email
    d'annulation.

## 5 · Rappels & WhatsApp (2 min, différé)

23. SQL editor : `select * from cron.job;` → ✅ `tabibo-reminders-hourly` présent.
24. Test manuel : `supabase functions invoke send-reminder --no-verify-jwt
    --body '{"type":"test","to":"+2126XXXXXXXX"}'` → ✅ retour ok
    (email si Resend seul ; WhatsApp si Meta configuré).
25. Si Meta configuré : réserver sans compte (invité) → ✅ code OTP WhatsApp
    reçu, réservation créée, message « réservé » reçu.

## 6 · Nettoyage

26. Console admin : supprimer les comptes de test (médecin + 2 patients)
    et leurs données. Vérifier Facturation (RIB réel) et Société (coordonnées).

**Résultat attendu : 26/26.** Tout écart → me l'envoyer avec le numéro d'étape
et une capture, je corrige en priorité.
