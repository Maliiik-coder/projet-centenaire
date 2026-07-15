# Projet Centenaire — V0.7.1

Progressive Web App mobile-first conçue comme un carnet de terrain comportemental.

L'application n'est pas une app de régime, pas une app fitness et pas un tableau de bord. Elle sert à observer les faits, noter les comportements existants et produire une priorité active simple à partir des données disponibles.

La V0.7.1 stabilise le tunnel repas, le stockage local cloisonné par utilisateur,
la migration explicite vers le cloud, la synchronisation hors ligne et la
politique de cache PWA. La source de vérité produit détaillée se trouve dans
[`docs/PRODUCT_BOARD.md`](docs/PRODUCT_BOARD.md).

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Row Level Security
- PWA
- Recharts pour la trace de poids
- Vitest pour le moteur d'analyse hebdomadaire

## Lancer l'application

```bash
npm install
npm run dev
```

URL locale : `http://localhost:3000`

Sans variables Supabase, l'application reste utilisable en mode local.

## Variables d'environnement

Créer un fichier `.env.local` en développement et renseigner les mêmes variables dans Vercel :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optionnel côté serveur uniquement, pour supprimer aussi l'utilisateur Supabase Auth depuis `/account` :

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client.

Optionnel pour préparer Apple OAuth sans l'activer par défaut :

```bash
NEXT_PUBLIC_ENABLE_APPLE_OAUTH=false
```

## Supabase

### Base neuve et base existante

Les deux sources SQL n'ont pas le même rôle :

- `supabase/schema.sql` sert uniquement à initialiser une base neuve avec le
  schéma courant complet ;
- `supabase/migrations/` est la source de vérité pour faire évoluer une base
  existante sans perdre son historique ;
- exécuter `schema.sql` sur une base ancienne ne remplace jamais l'application
  des migrations manquantes.

Les migrations V0.7.1 attendues, dans l'ordre, sont :

1. `20260711095000_v05_initial_schema.sql`
2. `20260711223000_v05_stabilization.sql`
3. `20260714090000_v06_preferences.sql`
4. `20260714100000_v061_dark_mode_preference.sql`
5. `20260714110000_v07_meal_tunnel.sql`
6. `20260715133410_v071_meal_boolean_defaults.sql`

Tables créées :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

Toutes les tables applicatives doivent avoir Row Level Security activé. Les
politiques limitent `select`, `insert`, `update` et `delete` à
`user_id = auth.uid()`.

Le projet utilise Supabase CLI `2.109.1`. Pour contrôler une base existante liée :

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

La dernière commande modifie la base distante. Elle ne doit être lancée qu'après
lecture du dry-run et validation du projet ciblé.

Le contrôle historique effectué le 15 juillet 2026, avant la correction des
défauts booléens repas, avait trouvé les trois premières migrations à distance
et les migrations V0.6.1 et V0.7 localement uniquement.

La migration corrective V0.7.1 a ensuite été ajoutée localement. Le nouveau
contrôle en lecture seule annonce réellement trois migrations au prochain push :

- `20260714100000_v061_dark_mode_preference.sql` ;
- `20260714110000_v07_meal_tunnel.sql` ;
- `20260715133410_v071_meal_boolean_defaults.sql`.

Aucun push réel n'a été exécuté. La base distante ne doit donc pas être
considérée comme à jour V0.7.1. Le dry-run doit être relancé immédiatement avant
le futur push, puis les migrations doivent être appliquées explicitement.

La procédure SQL détaillée pour vérifier colonnes, index et RLS se trouve dans
[`docs/SUPABASE_CHECKLIST.md`](docs/SUPABASE_CHECKLIST.md).

## Authentification

Écrans ajoutés :

- `/login`
- `/auth/callback`
- `/account`

Méthodes V0.5 :

- email magic link ;
- Google OAuth ;
- Apple OAuth préparé mais désactivé par défaut.

Configuration Google OAuth :

1. Dans Google Cloud Console, créer un OAuth Client.
2. Ajouter l'URL de callback Supabase indiquée dans Supabase Auth Providers.
3. Dans Supabase, activer Google et renseigner Client ID / Client Secret.
4. Dans Supabase Auth URL Configuration, ajouter :
   - `http://localhost:3000/auth/callback`
   - `https://votre-domaine.vercel.app/auth/callback`

## Migration locale vers le cloud

Les données invitées, legacy et celles de chaque compte sont stockées dans des
scopes séparés. Une donnée locale sans propriétaire n'est jamais synchronisée
automatiquement.

Si une association explicite est nécessaire après connexion, l'application
propose notamment :

- `Associer ces données à mon compte` ;
- `Garder uniquement les données du compte`.

La fusion conserve les données locales et cloud sans remplacement global. Les
upserts utilisent des contraintes uniques par utilisateur pour rendre les
reprises idempotentes.

## Mode hors ligne

Si le cloud est indisponible :

- le miroir local du compte courant est utilisé ;
- les mutations restent dans la file pending de ce compte ;
- le cloud est relu avant toute reprise de synchronisation ;
- aucune donnée d'un autre compte ou du scope invité n'est envoyée.

## Fonctionnalités conservées

- Onboarding : profil, contexte, tabac, priorité initiale.
- Page du jour : priorité active, mesure du matin, observations de repas, tabac séparé si activé.
- Observation repas question par question.
- Carnet : chronologie filtrable par repas, tabac et mesures.
- Constats : bilan de semaine, faits observés, point de friction, priorité active et niveau de preuve.
- Profil : identité, objectif, contexte, tabac, export/import JSON, réinitialisation.
- PWA : manifest, icônes, service worker et page hors connexion.

Fonctionnalités explicitement non ajoutées :

- sport ;
- IA ;
- communauté ;
- calories ;
- badges ;
- graphiques complexes ;
- notifications avancées.

## Déploiement Vercel

1. Pousser le projet sur le dépôt Git.
2. Créer un projet Vercel.
3. Renseigner les variables :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` si suppression Auth complète souhaitée.
4. Configurer les redirects OAuth dans Supabase avec le domaine Vercel.
5. Lancer un build Vercel.

Commande de vérification locale complète :

```bash
npm run verify
```

## Déploiement OVH VPS

Principe recommandé :

1. Installer Node.js LTS, ou utiliser Docker.
2. Déployer le code sur le VPS.
3. Définir les variables d'environnement Supabase côté serveur.
4. Lancer :

```bash
npm install
npm run build
npm run start
```

5. Placer Nginx en reverse proxy devant l'application.
6. Activer HTTPS avec Let's Encrypt.
7. Ajouter l'URL du VPS dans les redirects OAuth Supabase.

Le VPS n'est pas configuré automatiquement par ce dépôt.

## Vérifications

```bash
npm run verify
npm audit
```

`npm run verify` exécute séquentiellement le typecheck, le lint, les tests puis
le build, sans doublon de build.

Au 15 juillet 2026, `npm audit` signale deux vulnérabilités modérées provenant du
PostCSS imbriqué dans Next.js 16.2.10, et aucune vulnérabilité high ou critical.
Next.js 16.2.10 est encore la dernière version stable ; le correctif PostCSS est
présent en canary 16.3 mais aucune canary n'est installée en production.

## Fichiers principaux

- `src/components/ProjetCentenaireApp.tsx`
- `src/app/login/page.tsx`
- `src/app/account/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/services/profileService.ts`
- `src/services/weightService.ts`
- `src/services/mealService.ts`
- `src/services/tobaccoService.ts`
- `src/services/reportService.ts`
- `src/services/localMigrationService.ts`
- `src/services/offlineSyncService.ts`
- `supabase/schema.sql`
