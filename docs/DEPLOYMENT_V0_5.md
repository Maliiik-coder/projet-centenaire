# Deploiement V0.5

Objectif : deployer Projet Centenaire V0.5 avec Supabase, Vercel et PWA iPhone.

## A. Prerequis

- Node.js installe.
- npm installe.
- Supabase CLI installe.
- Un compte Supabase.
- Un compte Vercel.
- Un compte Google Cloud si OAuth Google est active.

## B. Etapes Supabase

1. Creer un nouveau projet Supabase.
2. Recuperer le `project ref` du projet.
3. Se connecter a la CLI :

```bash
supabase login
```

4. Lier le projet local :

```bash
supabase link --project-ref <project-ref>
```

5. Pousser les migrations :

```bash
supabase db push
```

6. Verifier les tables :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

7. Verifier RLS avec `docs/SUPABASE_CHECKLIST.md`.
8. Recuperer la Supabase URL.
9. Recuperer la anon key.
10. Recuperer la service role key.

## C. Etapes Google OAuth

1. Ouvrir Google Cloud Console.
2. Creer un OAuth Client ID de type **Web application**.
3. Ajouter les **Authorized JavaScript origins** :

- `http://localhost:3000`
- l'URL de production Vercel apres deploiement.

4. Ajouter l'**Authorized redirect URI** fourni par Supabase dans la page du provider Google.
5. Copier le Client ID et le Client Secret dans Supabase Auth provider Google.
6. Activer le provider Google.

## D. Etapes Supabase Auth URLs

Dans Supabase Auth :

1. Configurer la Site URL locale pendant le developpement :

```text
http://localhost:3000
```

2. Ajouter les Redirect URLs :

```text
http://localhost:3000/auth/callback
https://<url-production-vercel>/auth/callback
```

3. Apres deploiement, remplacer la Site URL par l'URL de production.

## E. Etapes Vercel

1. Connecter le repo a Vercel.
2. Ajouter les variables d'environnement :

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ENABLE_APPLE_OAUTH=false
NEXT_PUBLIC_APP_URL=
```

3. Deployer.
4. Recuperer l'URL de production.
5. Mettre a jour `NEXT_PUBLIC_APP_URL` avec l'URL de production.
6. Redeployer.
7. Ajouter l'URL production `/auth/callback` dans Supabase Redirect URLs.
8. Ouvrir `/health` sur l'URL de production et verifier les statuts.

## F. Test final

Tester dans cet ordre :

1. Magic link.
2. Login Google.
3. Migration des donnees locales vers le cloud.
4. Poids du jour : modifier deux fois, verifier une seule mesure.
5. Observation repas : ajouter une note et verifier la chronologie.
6. Tabac : verifier `Non renseigne`, `Aucun`, `Envie forte`, `Cigarette`.
7. Reload navigateur : donnees toujours presentes.
8. Installation PWA iPhone : bonne icone, ouverture plein ecran, donnees presentes.

Si un point bloque le test reel, corriger ce bug avant d'ajouter quoi que ce soit.
