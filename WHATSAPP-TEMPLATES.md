# Tabibo — Pack de templates WhatsApp à soumettre à Meta

**À faire dès maintenant** : l'approbation Meta prend de quelques heures à
quelques jours, et les refus pour formulation sont courants. Ces 5 templates
sont rédigés selon les règles Meta (catégories correctes, variables numérotées,
pas de contenu promotionnel dans les catégories Utility/Authentication) et
leurs variables correspondent **exactement** à ce que le code envoie déjà.

## Où les créer

Meta Business Manager → WhatsApp Manager → **Message templates** → Create.
Pour chaque template : choisir la **catégorie**, le **nom** (exactement comme
ci-dessous), la **langue français** (et refaire une version **arabe** — même
nom, langue العربية — Meta gère les deux sous un seul template).

Le code envoie 4 variables dans cet ordre, pour les 4 templates « utility » :
`{{1}}` = nom du patient · `{{2}}` = date (ex. « jeudi 17 juillet ») ·
`{{3}}` = heure (ex. « 09:00 ») · `{{4}}` = nom du médecin.

---

## 1 · `tabibo_otp` — catégorie **Authentication** (réservation sans compte)

Meta impose son propre texte pour cette catégorie — vous ne rédigez rien :
- Cocher **Copy code** (bouton « Copier le code »).
- Cocher « Add security recommendation » (recommandé).
- Code expiry : 10 minutes (correspond au code).
- Langues : Français + العربية.

Secret à poser ensuite : `WHATSAPP_TEMPLATE_OTP=tabibo_otp`.

## 2 · `tabibo_booked` — catégorie **Utility** (rendez-vous enregistré)

**FR — Body :**
> Bonjour {{1}}, votre rendez-vous du {{2}} à {{3}} chez {{4}} est bien
> enregistré. Le cabinet vous le confirmera. — Tabibo

**AR — Body :**
> مرحباً {{1}}، تم تسجيل موعدكم يوم {{2}} على الساعة {{3}} عند {{4}}.
> ستؤكده العيادة قريباً. — Tabibo

Exemples de variables (Meta les exige) : `Fatima Benali` · `jeudi 17 juillet`
· `09:00` · `Dr. Adil Moutaouakil`.

## 3 · `tabibo_confirmed` — catégorie **Utility**

**FR :**
> Bonjour {{1}}, votre rendez-vous du {{2}} à {{3}} chez {{4}} est confirmé.
> À bientôt. — Tabibo

**AR :**
> مرحباً {{1}}، تم تأكيد موعدكم يوم {{2}} على الساعة {{3}} عند {{4}}.
> إلى اللقاء. — Tabibo

## 4 · `tabibo_reminder` — catégorie **Utility** (rappels J-1 et J-2)

**FR :**
> Bonjour {{1}}, rappel : votre rendez-vous chez {{4}} est prévu le {{2}}
> à {{3}}. En cas d'empêchement, merci de prévenir le cabinet. — Tabibo

**AR :**
> مرحباً {{1}}، تذكير : موعدكم عند {{4}} يوم {{2}} على الساعة {{3}}.
> في حال وجود مانع، يرجى إخبار العيادة. — Tabibo

(Le même template sert au J-1 et au J-2 — la date envoyée fait la différence.)

## 5 · `tabibo_cancelled` — catégorie **Utility**

**FR :**
> Bonjour {{1}}, votre rendez-vous du {{2}} à {{3}} chez {{4}} a été annulé.
> Vous pouvez réserver un nouveau créneau sur tabibo.ma. — Tabibo

**AR :**
> مرحباً {{1}}، تم إلغاء موعدكم يوم {{2}} على الساعة {{3}} عند {{4}}.
> يمكنكم حجز موعد جديد على tabibo.ma. — Tabibo

---

## Après approbation — les secrets à poser (une seule fois)

```
supabase secrets set \
  WHATSAPP_TOKEN=<token permanent de l'app Meta> \
  WHATSAPP_PHONE_ID=<Phone number ID du numéro> \
  WHATSAPP_LANG=fr \
  WHATSAPP_TEMPLATE_OTP=tabibo_otp \
  WHATSAPP_TEMPLATE_BOOKED=tabibo_booked \
  WHATSAPP_TEMPLATE_CONFIRMED=tabibo_confirmed \
  WHATSAPP_TEMPLATE_REMINDER=tabibo_reminder \
  WHATSAPP_TEMPLATE_CANCELLED=tabibo_cancelled
```

Puis redéployer `send-reminder` et `guest-booking`. Tout s'active tout seul :
rappels, messages réservé/confirmé/annulé, et la réservation sans compte.

## Pièges connus (pour éviter le refus Meta)

- **Ne pas** mettre d'appel à l'action commercial (« profitez de… ») dans un
  template Utility — Meta le reclasse en Marketing ou le refuse.
- Les exemples de variables sont **obligatoires** à la soumission.
- Le numéro d'envoi doit être en **mode production** (display name approuvé)
  pour joindre des numéros non enregistrés comme testeurs.
- `WHATSAPP_LANG=fr` : le code envoie la langue `fr` — si vous soumettez la
  version arabe, Meta la servira automatiquement… uniquement si vous changez
  la langue d'envoi. V1 : rester sur `fr` (les deux langues soumises = prêt
  pour la suite).
