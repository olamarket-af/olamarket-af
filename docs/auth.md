# O'LA Market — Auth (inscription / connexion)

## Installation

```bash
npm install @supabase/ssr @supabase/supabase-js
```

Copier `.env.local.example` en `.env.local` et renseigner les clés du projet
Supabase (Project Settings → API).

Dans Supabase Auth → Providers, activer "Email" ; dans Auth → URL
Configuration, ajouter `http://localhost:3000/auth/callback` (et l'URL de
prod) comme Redirect URL.

Importer `app/auth.css` dans `app/layout.tsx` (ou fusionner ses classes avec
vos styles globaux) :

```tsx
import './auth.css'
```

## Fichiers fournis

- `lib/supabase/client.ts` — client Supabase pour les composants navigateur.
- `lib/supabase/server.ts` — client Supabase pour Server Components / Route
  Handlers, + `getCurrentProfile()` pour récupérer le profil connecté.
- `middleware.ts` — rafraîchit la session à chaque requête et protège
  `/account`, `/seller`, `/admin` selon le rôle stocké dans `profiles.role`.
- `app/register/page.tsx` — inscription avec choix du rôle (client / vendeur).
  Le rôle est passé en métadonnée à `supabase.auth.signUp()` et repris par le
  trigger `handle_new_user()` du schéma SQL pour créer la ligne `profiles`.
- `app/login/page.tsx` — connexion, avec redirection selon le rôle
  (`/admin`, `/seller/dashboard` ou `/account`) et blocage si le compte est
  suspendu (`profiles.status = 'suspended'`).
- `app/forgot-password/page.tsx` et `app/reset-password/page.tsx` —
  réinitialisation de mot de passe par e-mail.
- `app/auth/callback/route.ts` — échange le lien reçu par e-mail (confirmation
  d'inscription ou reset de mot de passe) contre une session.

## Ce qui reste à faire ensuite

- `/seller/register` : formulaire de création de boutique (déclenché après
  l'inscription d'un vendeur) — table `stores` déjà prête côté SQL.
- Vérification email obligatoire ou non : réglable dans Supabase Auth →
  Settings → "Confirm email".
- Connexion sociale (Google, etc.) si souhaitée plus tard : s'ajoute dans
  `login/page.tsx` via `supabase.auth.signInWithOAuth()`, sans toucher au
  reste.
