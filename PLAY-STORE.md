# Publier Tabibo sur le Google Play Store (TWA)

Ce guide transforme la PWA Tabibo en une vraie application Android publiable, sans
recoder l'app : un **TWA** (Trusted Web Activity) est une coquille Android qui
affiche votre site `https://tabibo.ma` en plein écran. Comme **vous** construisez
l'APK (avec la dernière version Android cible) et que l'installation vient du Play
Store, l'avertissement « Appli non sécurisée / conçue pour une version plus
ancienne d'Android » de Play Protect **disparaît complètement**.

> Rappel : l'avertissement sur la PWA n'est pas un bug de Tabibo. Sur Android,
> installer une PWA fait générer par Google un « WebAPK » dont la version Android
> cible n'est pas contrôlable par nous. Le TWA règle ça définitivement.

---

## Ce dont vous avez besoin (une fois)

- Un **compte Google Play Developer** — 25 $ une seule fois : https://play.google.com/console/signup
- **Node.js** (déjà installé) et un **JDK 17** + le **Android SDK** — installés
  automatiquement par Bubblewrap au premier lancement (`bubblewrap doctor`).
- Les fichiers déjà préparés dans ce dépôt :
  - `twa/twa-manifest.json` — la configuration (nom, couleurs, package `ma.tabibo.app`).
  - `frontend/public/.well-known/assetlinks.json` — le lien de confiance domaine ↔ app
    (il ne manque qu'une valeur : l'empreinte SHA-256, obtenue à l'étape 4).

---

## Étapes

### 1) Installer Bubblewrap

```bash
npm install -g @bubblewrap/cli
bubblewrap doctor          # installe/vérifie le JDK + Android SDK
```

### 2) Générer le projet Android à partir de notre config

Depuis le dossier `twa/` du dépôt :

```bash
cd twa
bubblewrap init --manifest ./twa-manifest.json
```

Bubblewrap pose quelques questions — les valeurs par défaut viennent déjà du fichier.
Points importants à confirmer :
- **Application ID** : `ma.tabibo.app` (⚠️ définitif après publication — ne plus le changer).
- **Signing key** : laissez-le **créer un nouveau keystore** (`android.keystore`, alias `tabibo`).
  👉 **Sauvegardez ce fichier `android.keystore` + son mot de passe** dans un endroit sûr
  (gestionnaire de mots de passe). Sans lui, vous ne pourrez plus publier de mises à jour.

### 3) Construire l'app

```bash
bubblewrap build
```

Cela produit deux fichiers :
- **`app-release-bundle.aab`** → c'est celui à envoyer au Play Store.
- `app-release-signed.apk` → pour tester en direct sur un téléphone (`adb install`).

### 4) Récupérer l'empreinte SHA-256 et compléter assetlinks.json

```bash
bubblewrap fingerprint list
```

Copiez la valeur **SHA-256** affichée et collez-la dans
`frontend/public/.well-known/assetlinks.json`, à la place de
`REMPLACER_PAR_VOTRE_EMPREINTE_SHA256` :

```json
"sha256_cert_fingerprints": [
  "AA:BB:CC:… votre empreinte …"
]
```

> ⚠️ Si vous utilisez **Play App Signing** (recommandé, coché par défaut au premier
> upload), Google **re-signe** l'app avec sa propre clé. Dans ce cas, l'empreinte à
> mettre dans `assetlinks.json` est celle affichée dans **Play Console → votre app →
> Test et publication → Intégrité de l'app → Signature d'app → certificat de signature
> d'app (SHA-256)**. Vous pouvez mettre **les deux** empreintes (upload + Play) dans
> le tableau — c'est plus sûr.

Puis **redéployez le frontend** (Vercel) pour que
`https://tabibo.ma/.well-known/assetlinks.json` serve la bonne valeur. Vérifiez :

```bash
curl https://tabibo.ma/.well-known/assetlinks.json
```

Ce lien de confiance est ce qui fait que l'app s'ouvre **en plein écran sans barre
d'adresse**. S'il est absent ou faux, l'app marche quand même mais affiche l'URL en haut.

### 5) Publier sur le Play Store

1. Play Console → **Créer une application** → nom « Tabibo », langue, type *App*, gratuit.
2. **Production → Créer une release** → importez le fichier **`.aab`**.
3. Remplissez la fiche : description, icône (512×512, déjà dans `frontend/public/icons/`),
   captures d'écran (téléphone), catégorie **Médecine**, politique de confidentialité
   (URL `https://tabibo.ma/confidentialite` — déjà en ligne).
4. Remplissez le questionnaire **contenu / données** (app médicale : données de santé →
   déclarez la collecte de RDV/coordonnées, chiffrées en transit, supprimables).
5. Envoyez en révision. Première validation Google : généralement **quelques jours**.

---

## Mettre à jour l'app plus tard

Le TWA affiche votre site live : **toute mise à jour du site est instantanément dans
l'app**, sans repasser par le Play Store. Vous ne reconstruisez un nouveau `.aab` que
si vous changez une propriété *native* (nom, icône, couleurs, permissions). Dans ce cas :
incrémentez `appVersionCode` dans `twa/twa-manifest.json`, `bubblewrap update && bubblewrap build`,
puis importez le nouveau `.aab`.

## Notes

- **iOS** ne fait pas de TWA. Sur iPhone, Tabibo s'installe toujours via Safari →
  Partager → « Sur l'écran d'accueil » (déjà géré par l'app). Pas d'App Store requis.
- `android.keystore` et les `.aab`/`.apk` **ne doivent pas** être commités (déjà
  ignorés dans `.gitignore`). Gardez le keystore hors du dépôt, en lieu sûr.
- Le package `ma.tabibo.app` et le keystore sont **permanents** : choisis une fois,
  gardés à vie pour pouvoir publier les mises à jour.
