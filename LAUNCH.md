# Tabibo — Checklist de lancement (S-7 → J0)

Objectif de la semaine : signer les premiers médecins. Le produit se vend comme
**outil de cabinet + lien de réservation personnel** — la marketplace se remplira
d'elle-même quand chaque médecin invitera ses propres patients.

## 1 · Technique (jour 1)

- [ ] `supabase db push` — toutes les migrations (dont `security_hardening` + `chat_media_private` + `reminders_cron`, critiques).
- [ ] `supabase functions deploy` — les 5 fonctions (notify-verification, send-reminder, phone-login, invite-patient, **admin-delete-user**).
- [ ] Secrets des fonctions posés : `RESEND_API_KEY`, `APP_URL=https://tabibo.ma` (+ WhatsApp `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` si canal WhatsApp).
- [ ] Resend : domaine `tabibo.ma` vérifié (DNS SPF/DKIM) → les emails partent de `@tabibo.ma`, pas du mode test.
- [ ] Supabase Auth : **activer l'enforcement CAPTCHA** (Turnstile) + configurer le Site URL `https://tabibo.ma`.
- [ ] Vercel : `VITE_APP_URL=https://tabibo.ma`, `VITE_SUPABASE_URL/ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_MAPTILER_KEY` en production. Brancher la branche de prod.
- [ ] **Rappels — activer le cron** (voir §1a) : le job pg_cron existe déjà (migration `reminders_cron`), il ne reste qu'à poser les 2 secrets Vault.
- [ ] Supabase → Settings → Database : **activer les sauvegardes quotidiennes** (backups).

### 1a · Activer l'envoi des rappels (une seule fois, SQL editor Supabase)

Le dispatcher horaire est déjà planifié mais reste inerte tant que ces 2 secrets
n'existent pas (aucune fuite dans le repo). Coller dans le SQL editor, avec vos
vraies valeurs :

```sql
select vault.create_secret('https://<votre-ref>.supabase.co', 'tabibo_functions_url');
select vault.create_secret('<service_role_ou_sb_secret_key>',  'tabibo_cron_key');
```

Ensuite le job `tabibo-reminders-hourly` appelle `send-reminder` chaque heure et
envoie les rappels J-1 (activé par défaut) / J-2 (opt-in par médecin). Test manuel :
`supabase functions invoke send-reminder --no-verify-jwt --body '{"type":"test","to":"+2126..."}'`.

Ces 2 mêmes secrets activent aussi la **liste d'attente** (migration `waitlist`) :
quand un rendez-vous à venir est annulé, les patients inscrits sur la liste de ce
jour reçoivent automatiquement l'email « un créneau s'est libéré ».

Canal par défaut : **email** (marche dès que `RESEND_API_KEY` est posé, zéro config
Meta). Pour WhatsApp, créer les templates approuvés côté Meta et poser les secrets
`WHATSAPP_*` (voir l'en-tête de `supabase/functions/send-reminder/index.ts`).

### 1b · Réservation sans compte (vérifiée par code) — optionnelle

La fonction `guest-booking` permet aux patients de réserver avec nom + téléphone,
validés par un **code à usage unique envoyé par WhatsApp** (anti-faux numéros ;
limites anti-abus, liste noire par cabinet, blocage des récidivistes d'absence).
Après vérification, le patient reçoit le WhatsApp « rendez-vous réservé », puis le
« confirmé » quand le cabinet confirme — exactement comme les comptes classiques.
Activation automatique dès que ces secrets existent :
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE_OTP`
  (template Meta de catégorie **Authentication**, corps `{{1}}` = code).
Sans ces secrets, les patients passent par le compte classique (aucun risque).

## 2 · Configuration admin (jour 1, dans la console admin)

- [ ] **RIB réel** dans Facturation — sans lui, les médecins bloqués voient « contactez le support ».
- [ ] **Coordonnées société** dans Société (adresse, téléphone, emails) — alimentent la page Contact
      ET le bouton WhatsApp « Parler à notre équipe » de la page Pour les médecins.
- [ ] Créer le compte admin définitif ; supprimer tous les comptes de test (médecins ET patients).
- [ ] Vider les données de test : rendez-vous, paiements, conversations.

## 3 · Parcours de vente (à répéter pour CHAQUE médecin)

1. Pitch : page **tabibo.ma/fordoctors** → bouton **« Essayer la démo interactive »**
   (tableau de bord complet avec données fictives, aucun compte requis).
2. Inscription sur place (10 min, mobile OK) : compte + documents (CIN, diplôme, Ordre, autorisation).
3. **Approuver immédiatement** depuis la console admin (l'email d'approbation part tout seul) →
   l'essai 14 jours démarre.
4. Activation guidée : le tableau de bord du médecin affiche la **checklist 6 étapes**
   (photo, bio, disponibilités, lien personnalisé, affiche QR, premier patient).
   Ne pas partir avant que les disponibilités + le lien soient faits.
5. Imprimer **l'affiche QR** (page « Inviter mes patients ») et la poser en salle d'attente.
6. Envoyer le message WhatsApp pré-rédigé à ses patients (même page).

→ Chaque médecin activé = des dizaines de patients qui découvrent Tabibo par son lien.

## 4 · Points de vigilance semaine 1

- Approuver les inscriptions **le jour même** (la première impression du médecin, c'est la vitesse).
- Surveiller l'onglet **Paiements** de la console dès J+14 (fins d'essai) — renouvellement 100 % manuel.
- Guetter les violations CSP dans la console navigateur (l'en-tête est en Report-Only) ;
  après une semaine calme, passer la CSP en mode bloquant dans `vercel.json`.
- Sauvegarde : activer les backups quotidiens Supabase (Settings → Database).

## 5 · Ce qu'on ne promet PAS encore (discours honnête)

- « De nouveaux patients via la recherche » — vrai plus tard, pas à J0. Le pitch J0 :
  *vos* patients réservent en ligne, zéro téléphone, zéro no-show, dossier + ordonnances au même endroit.
- Paiement en ligne (CMI) : sur la roadmap ; aujourd'hui virement mensuel simple.
