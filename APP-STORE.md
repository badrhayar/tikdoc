# Publier Tabibo sur l'App Store d'Apple (iOS)

⚠️ **À lire avant de vous lancer.** iOS ne fonctionne **pas** comme Android. Il n'existe
**aucun équivalent du TWA** côté Apple : on ne peut pas « emballer » une PWA en une
commande. Pour être sur l'App Store, Tabibo doit devenir une **vraie app iOS** qui
affiche votre site dans une `WKWebView` — et Apple **refuse** les apps qui ne sont
« qu'un site web repackagé » (règle **4.2 Minimum Functionality**). Il faut donc
ajouter de la **valeur native** pour passer la revue.

> Bonne nouvelle : sur iPhone, Tabibo **s'installe déjà gratuitement** via Safari →
> Partager → « Sur l'écran d'accueil » (déjà géré par l'app, sans store, sans frais).
> L'App Store n'apporte pas l'accès — il apporte la **visibilité** (recherche App
> Store) et la **crédibilité** (fiche officielle) pour une app médicale.

---

## 💰 Combien ça coûte

| | Google Play (Android) | **App Store (Apple)** |
|---|---|---|
| Frais d'inscription | **25 $ une seule fois** | **99 $ / an** (récurrent, tant que l'app est publiée) |
| Machine requise | n'importe quel PC | **un Mac obligatoire** (Xcode ne tourne que sur macOS) |
| Compte société | facultatif | D-U-N-S requis pour publier au nom d'une société |

**Coût direct : 99 $ par an.** C'est le seul frais obligatoire.
Pas de commission Apple **tant que Tabibo ne vend rien à l'intérieur de l'app iOS**
(voir l'avertissement business plus bas — c'est important pour votre modèle).

---

## ⚠️ Deux pièges qui peuvent tout bloquer

### a) La règle 4.2 — « pas juste un site web »
Une simple `WKWebView` qui charge `tabibo.ma` se fait **souvent refuser**. Pour passer,
l'app doit se comporter comme une vraie app :
- **Notifications push natives (APNs)** — le signal « valeur native » le plus fort.
- Gestion **hors-ligne** propre (écran de secours si pas de réseau).
- Intégration native quand c'est pertinent (appareil photo pour envoyer un document,
  partage, retour haptique…).
- Pas de barre d'adresse, pas de bouton « ouvrir dans Safari » visible.

### b) La règle 3.1.1 — les abonnements médecins (⚠️ votre seule source de revenus)
Apple impose son **achat intégré (commission 15–30 %)** pour tout service numérique
**vendu à l'intérieur** de l'app iOS. Si un médecin peut **s'abonner ou payer depuis
l'app iOS**, Apple prendra sa commission — ou refusera l'app.

👉 **Solution (déjà alignée avec Tabibo) :** les médecins s'inscrivent et paient leur
abonnement **sur le site**, pas dans l'app iOS. L'app iOS ne doit **ni proposer, ni
afficher un bouton d'achat, ni même un lien** vers la page d'abonnement. Côté patient
tout est gratuit → aucun problème. Gardez donc, dans le build iOS, l'espace médecin en
lecture/gestion uniquement, sans parcours de paiement.

---

## Les deux façons de construire l'app

| Route | Effort | Risque de refus 4.2 | Recommandé si |
|---|---|---|---|
| **PWABuilder** (Microsoft, gratuit) | faible | moyen–élevé | vous voulez tester vite |
| **Capacitor** (Ionic) | moyen | faible | vous voulez le faire proprement (push natif, etc.) |

Pour une app médicale qu'on veut voir **acceptée du premier coup**, je recommande
**Capacitor** : il permet d'ajouter le push natif et l'accès appareil photo, ce qui
satisfait la règle 4.2. PWABuilder est plus rapide mais historiquement plus refusé.

---

## Étapes — route Capacitor (recommandée)

> Tout se fait sur un **Mac** avec **Xcode** installé (gratuit sur le Mac App Store).

### 1) Créer le compte
- Apple Developer Program : https://developer.apple.com/programs/ → **99 $/an**.
- Pour publier au nom **« Tabibo »** (société) : obtenir un **numéro D-U-N-S** (gratuit,
  quelques jours) — https://developer.apple.com/support/D-U-N-S/. Sinon, publier en
  **individuel** (votre nom apparaît comme vendeur). *Tabibo n'étant pas encore une
  entité légale, l'option individuelle est la plus rapide pour démarrer.*

### 2) Ajouter Capacitor au projet (dans `frontend/`)
```bash
cd frontend
npm install @capacitor/core @capacitor/ios
npx cap init "Tabibo" "ma.tabibo.app" --web-dir=dist
npm run build
npx cap add ios
```
Dans `capacitor.config.json`, pointez l'app sur le site live :
```json
{
  "appId": "ma.tabibo.app",
  "appName": "Tabibo",
  "webDir": "dist",
  "server": { "url": "https://tabibo.ma", "cleartext": false }
}
```

### 3) Ajouter la valeur native (pour passer la 4.2)
```bash
npm install @capacitor/push-notifications @capacitor/camera @capacitor/app
npx cap sync ios
```
Configurez le **push APNs** (clé de push dans le compte Apple) — c'est l'argument
« valeur native » le plus solide en revue.

### 4) Ouvrir dans Xcode et régler l'app
```bash
npx cap open ios
```
Dans Xcode : icône (512×512 déjà dans `frontend/public/icons/`), écran de lancement
aux couleurs Tabibo (`#0F6E56`), orientation portrait, **Bundle ID** `ma.tabibo.app`,
activer la capability **Push Notifications**.

### 5) (Optionnel) Universal Links — ouvrir les liens tabibo.ma dans l'app
Créez `frontend/public/.well-known/apple-app-site-association` (⚠️ **sans extension**,
servi en `application/json`) :
```json
{
  "applinks": {
    "apps": [],
    "details": [
      { "appID": "VOTRE_TEAM_ID.ma.tabibo.app", "paths": ["*"] }
    ]
  }
}
```
`VOTRE_TEAM_ID` = l'identifiant à 10 caractères visible dans Apple Developer → Membership.
Redéployez le frontend, puis vérifiez :
`curl https://tabibo.ma/.well-known/apple-app-site-association`.

### 6) Envoyer sur l'App Store
1. Dans Xcode : **Product → Archive** → **Distribute App → App Store Connect**.
2. Sur https://appstoreconnect.apple.com : créez la fiche « Tabibo » — description,
   captures d'écran (iPhone 6.7" + 6.5" obligatoires), catégorie **Médecine**,
   politique de confidentialité `https://tabibo.ma/confidentialite` (déjà en ligne),
   questionnaire **confidentialité des données** (app santé : déclarez RDV/coordonnées,
   chiffrées en transit, supprimables).
3. **Soumettez pour révision.** Délai Apple : typiquement **24 h à 3 jours**.

---

## Mettre à jour l'app plus tard

Comme le build charge votre site live (`server.url`), **toute mise à jour du site est
instantanément dans l'app** — sans repasser par Apple. Vous ne renvoyez un build à
Apple que si vous changez une partie **native** (icône, permissions, plugins, push).

---

## Mon conseil honnête

- **Pour ouvrir maintenant, sans rien payer :** l'iPhone installe déjà Tabibo via Safari
  (Partager → écran d'accueil). C'est suffisant pour lancer et recruter vos premiers
  médecins.
- **L'App Store vaut le coup plus tard**, quand : (1) vous avez une entité légale (ou
  acceptez de publier en votre nom), (2) le revenu des premiers médecins couvre les
  99 $/an, et (3) vous avez un Mac. C'est surtout un gain de **visibilité et de confiance**,
  pas d'accès.
- **Priorité technique si vous y allez :** le **push natif APNs** — c'est lui qui fait la
  différence entre « accepté » et « refusé au titre de la 4.2 », et le contournement des
  abonnements médecins **hors de l'app iOS** pour éviter la commission d'Apple.
