# O'LA Market — projet Next.js + Supabase

Code généré au fil de la conversation : auth, catalogue public, panier,
commandes, espace vendeur. **Ce code n'a pas été exécuté ni testé** (pas
d'environnement Node.js dans ce chat) — prévoir une passe de vérification
(`npm run build`) avant mise en production.

## 1. Installer

```bash
npm install
cp .env.local.example .env.local
```

Renseigner dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://votre-domaine.com   # utilisé par le sitemap, robots.txt et les balises Open Graph
```

(clés visibles dans Supabase → Project Settings → API)

## 2. Base de données

Exécuter, dans l'ordre, dans l'éditeur SQL de votre projet Supabase :
1. `ola_market_schema.sql` — schéma complet + RLS
2. `ola_market_schema_fixes.sql` — 3 correctifs RLS repérés en cours de route
3. `ola_market_notifications.sql` — notifications automatiques (triggers +
   tâche planifiée quotidienne). Nécessite l'extension `pg_cron`
   (Database → Extensions dans le dashboard Supabase) ; si elle n'est pas
   disponible sur votre offre, appeler `select public.run_daily_notifications();`
   depuis un déclencheur externe (Edge Function + cron-job.org, par exemple).

Créer ensuite les buckets Storage suivants (Storage → New bucket) : `product-images`, `store-images`,
`profile-images`, `documents`, `banners` — publics pour les trois premiers,
privés pour les deux derniers.

Dans Authentication → URL Configuration, ajouter comme Redirect URL :
`http://localhost:3000/auth/callback` (et l'URL de production une fois
déployée).

**Policies RLS à corriger avant la mise en prod** : déjà couvertes par
`ola_market_schema_fixes.sql` ci-dessus (à exécuter, ne reste plus une
étape manuelle).

## 3. Lancer en local

```bash
npm run dev
```

→ http://localhost:3000

## 4. Déployer sur Cloudflare

Ce projet utilise du rendu serveur (Server Components, cookies de session
Supabase, middleware) — Cloudflare Pages ne peut pas le servir comme un
simple site statique. La voie recommandée est l'adaptateur **OpenNext pour
Cloudflare**, déjà configuré ici (`wrangler.toml`, `open-next.config.ts`,
scripts `cf:preview` / `cf:deploy`) car il supporte mieux les API Node.js
utilisées par `@supabase/ssr` que l'ancien `@cloudflare/next-on-pages`.

```bash
npx wrangler login          # une seule fois
npm run cf:preview          # build + aperçu local via Wrangler
npm run cf:deploy           # build + déploiement sur Cloudflare
```

Avant le premier déploiement, renseigner les variables d'environnement
réelles dans `wrangler.toml` (section `[vars]`) ou via :

```bash
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Puis, dans Supabase → Authentication → URL Configuration, ajouter l'URL
`https://votre-projet.pages.dev/auth/callback` comme Redirect URL
supplémentaire.

**Cet adaptateur évolue vite** : si `cf:deploy` échoue, vérifier la version
de `@opennextjs/cloudflare` dans `package.json` contre la documentation à
jour (https://opennext.js.org/cloudflare) — certaines API changent entre
versions mineures.

## 6. Paiements réels (FedaPay) — et solution manuelle en attendant

L'intégration utilise **FedaPay** (agrégateur béninois, siège à Cotonou) qui
couvre MTN Mobile Money, Moov Money et carte bancaire derrière une seule
API — c'est le choix le plus direct pour "brancher un vrai paiement local"
sans dépendre d'un opérateur unique.

**Pas encore de registre de commerce ?** FedaPay exige un compte marchand
vérifié pour délivrer des clés API. En attendant, une option de **paiement
manuel par Mobile Money** est déjà en place et fonctionne dès maintenant,
sans aucune clé FedaPay :
1. Renseigner vos numéros MTN / Moov et le nom du bénéficiaire dans
   `/admin/settings` (section "Paiement manuel Mobile Money").
2. Le vendeur voit un bouton "Payer manuellement par Mobile Money" sous
   chaque plan d'abonnement et chaque formule de publicité — il envoie
   l'argent, déclare son numéro d'envoi, et une notification part
   automatiquement à tous les admins.
3. Depuis `/admin/payments`, une fois la réception vérifiée sur votre
   téléphone, cliquez "Confirmer" : l'abonnement ou la publicité s'active
   automatiquement (même trigger SQL que pour FedaPay).

C'est une solution de transition assumée : pas d'automatisation possible
sans agrégateur, mais le vendeur n'est jamais bloqué en attendant vos
papiers.

Une fois le compte FedaPay actif :

1. Créer un compte sur [fedapay.com](https://fedapay.com), récupérer les
   clés **sandbox** (Workbench → API Keys) et les mettre dans `.env.local`
   (`FEDAPAY_SECRET_KEY`, `FEDAPAY_ENVIRONMENT=sandbox`).
2. Dans Supabase → Project Settings → API, copier la clé **service_role**
   dans `SUPABASE_SERVICE_ROLE_KEY` (jamais côté client, jamais dans un
   commit — ce n'est pas la même chose que la clé `anon`).
3. Configurer un Webhook dans FedaPay → Webhooks pointant vers
   `https://votre-domaine.com/api/payments/webhook`, copier le secret
   généré dans `FEDAPAY_WEBHOOK_SECRET`.
4. Tester en sandbox depuis `/seller/subscription` ou `/seller/advertising`
   — FedaPay fournit des numéros de test pour simuler un paiement Mobile
   Money sans argent réel.

**Comment ça s'articule** : `/api/payments/checkout` crée la ligne
`payments` (statut `pending`) puis la transaction FedaPay et redirige vers
la page de paiement hébergée. `/api/payments/callback` affiche un retour
immédiat à l'utilisateur (vérifié auprès de FedaPay, pas fait confiance à
l'URL). `/api/payments/webhook` est la source de vérité serveur-à-serveur :
quand FedaPay confirme (`transaction.approved`), il passe `payments.status`
à `completed`, ce qui déclenche automatiquement le trigger SQL
`notify_payment_completed()` (déjà dans `ola_market_notifications.sql`) qui
active l'abonnement ou la publicité et notifie le vendeur.

⚠️ **À vérifier avant la mise en prod** : la forme exacte de la charge utile
d'un événement webhook FedaPay (`event.object` vs `event.entity` selon les
versions du SDK) n'a pas pu être confirmée avec certitude depuis la
documentation publique — le code logue l'événement brut au premier webhook
reçu en sandbox pour que tu puisses ajuster le chemin exact si besoin.

## 7. Ce qui reste à construire

Il ne reste plus d'item en attente de la liste initiale. Pistes
d'amélioration possibles : liaison plus fine entre `/admin/payments` et le
Dashboard FedaPay (export CSV, rapprochement automatique), choix du moyen
de paiement affiché avant redirection (actuellement FedaPay affiche le
choix MTN/Moov/carte sur sa propre page hébergée).

**Remboursements — limite connue de FedaPay** : il n'existe pas d'API de
remboursement chez FedaPay ; l'opération se fait uniquement depuis leur
Dashboard, et uniquement pour les paiements MTN Mobile Money. `/admin/payments`
permet de marquer un paiement comme remboursé dans O'LA Market pour la
tenue de registre, mais ne déclenche aucun virement — l'admin doit d'abord
traiter le remboursement réel depuis le Dashboard FedaPay.

Déjà en place : auth, catalogue public, panier, commandes, espace vendeur
(avec choix du plan proposé juste après la création de boutique), espace
admin (utilisateurs, vendeurs, produits, commandes, paiements, catégories,
abonnements & tarifs pub, publicités, signalements, paramètres), logo,
notifications automatiques (triggers + rappels d'expiration planifiés),
PWA (manifest dynamique, service worker, bannière d'installation, page
hors-ligne), SEO (sitemap, robots.txt, métadonnées Open Graph par page,
données structurées Product/Organization/Breadcrumb), messagerie client ↔
vendeur en temps réel (blocage, signalement), paiements réels via FedaPay
(abonnements vendeurs + publicité, supervision admin des publicités et des
paiements).

