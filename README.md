# Projet Centenaire — V0.5

Progressive Web App mobile-first conçue comme un carnet de terrain comportemental.

L'application n'est pas une app de régime, pas une app fitness et pas un tableau de bord. Elle sert à observer les faits, noter les comportements existants et produire une priorité active simple à partir des données disponibles.

La V0.5 ajoute l'infrastructure cloud : Supabase Auth, Supabase Postgres, Row Level Security, migration des données locales et préparation au déploiement. Elle n'ajoute pas de nouvelles fonctionnalités produit.

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

Les fichiers SQL sont dans `supabase/` :

- `supabase/schema.sql`
- `supabase/migrations/20260711095000_v05_initial_schema.sql`

Tables créées :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

Toutes les tables ont Row Level Security activé. Les policies limitent `select`, `insert`, `update` et `delete` à `user_id = auth.uid()`.

Pour appliquer le schéma :

1. Créer un projet Supabase.
2. Ouvrir SQL Editor.
3. Exécuter `supabase/schema.sql`, ou appliquer la migration avec le CLI Supabase.
4. Copier l'URL du projet et la clé `anon` dans les variables d'environnement.

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

## Migration localStorage vers cloud

Si des données existent déjà sur l'appareil après connexion, l'application affiche :

- `Associer à mon compte`
- `Repartir de zéro`
- `Exporter avant de continuer`

La fonction `migrateLocalDataToSupabase` conserve les dates et constats. Les upserts utilisent des contraintes uniques par utilisateur et `created_at` pour éviter les doublons si la migration est relancée.

## Mode hors ligne simple

Il n'y a pas encore de synchronisation complexe.

Si une sauvegarde cloud échoue ou que le navigateur est hors ligne :

- les données sont conservées localement ;
- un message `Données en attente de synchronisation` est affiché ;
- une tentative de synchronisation est lancée au prochain retour en ligne.

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

Commande de vérification locale :

```bash
npm run build
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
npm run typecheck
npm run lint
npm run test
npm run build
```

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
