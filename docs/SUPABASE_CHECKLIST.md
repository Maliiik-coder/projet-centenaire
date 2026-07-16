# Supabase checklist V0.7.1

Cette checklist doit être exécutée avant chaque release qui modifie le schéma.
Une base liée ne doit jamais être déclarée à jour à partir du seul contenu de
`schema.sql`.

## Rôle des fichiers SQL

- `supabase/schema.sql` initialise uniquement une base neuve avec l'état courant.
- `supabase/migrations/` fait évoluer une base existante et constitue la source
  de vérité de son historique.
- Exécuter `schema.sql` sur une base ancienne ne remplace pas les migrations.

Ordre attendu :

1. `20260711095000_v05_initial_schema.sql`
2. `20260711223000_v05_stabilization.sql`
3. `20260714090000_v06_preferences.sql`
4. `20260714100000_v061_dark_mode_preference.sql`
5. `20260714110000_v07_meal_tunnel.sql`
6. `20260715133410_v071_meal_boolean_defaults.sql`
7. `20260716090000_initial_behavior_assessment.sql`

## Contrôle avec Supabase CLI

Commandes validées avec Supabase CLI `2.109.1` :

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

Résultat attendu de `migration list --linked` après mise à niveau : chaque
timestamp apparaît dans les colonnes locale et distante. Le dry-run doit répondre
que la base distante est à jour. La dernière commande applique réellement les
migrations et exige une validation explicite du projet ciblé.

Contrôle historique en lecture seule du 15 juillet 2026, avant l'ajout de la
migration corrective :

- `20260711095000`, `20260711223000` et `20260714090000` sont présents à distance ;
- `20260714100000` et `20260714110000` sont absents à distance ;
- le dry-run proposait uniquement les migrations V0.6.1 et V0.7.

La migration `20260715133410_v071_meal_boolean_defaults.sql` a été ajoutée
localement après ce contrôle pour aligner les défauts de `starter_taken` et
`dessert_taken` avec `schema.sql`.

Nouveau contrôle en lecture seule après l'ajout :

- les trois premières migrations restent présentes localement et à distance ;
- `20260714100000`, `20260714110000` et `20260715133410` sont locaux uniquement ;
- le dry-run annonce exactement V0.6.1, V0.7 et la correction V0.7.1 ;
- aucun `db push` réel n'a été exécuté pendant cette passe.

Point restant avant release : relancer `npx supabase db push --linked --dry-run`,
valider le projet et les trois fichiers annoncés, puis seulement exécuter
`npx supabase db push --linked`. Relancer ensuite la liste, le dry-run et les
requêtes SQL ci-dessous.

## Tables et colonnes

Tables attendues :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

Colonnes de préférences attendues dans `profiles` :

- `show_active_mission boolean default true`
- `dark_mode boolean default false`
- `initial_behavior_assessment jsonb`

Colonnes stabilisées ou ajoutées dans `meal_observations` :

- `observed_date date`
- `observed_time text`
- `serving_pattern text`
- `starter_taken boolean default false`
- `starter_text text`
- `dessert_taken boolean default false`
- `dessert_text text`
- `snack_trigger text`
- `snack_context text`
- `clarifications jsonb default '[]'::jsonb`
- `questionnaire_version text`

Requête de contrôle dans SQL Editor ou avec `supabase db query --linked` :

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'meal_observations')
order by table_name, ordinal_position;
```

## Index et contraintes

Index uniques attendus :

- `weight_entries_user_entry_date_idx` sur `(user_id, entry_date)` ;
- `meal_observations_user_created_at_idx` sur `(user_id, created_at)` ;
- `meal_observation_tags_unique_idx` sur `(observation_id, tag)` ;
- `tobacco_events_user_created_at_idx` sur `(user_id, created_at)` ;
- `tobacco_events_one_explicit_none_per_day_idx` sur `(user_id, event_date)`
  avec `where event_type = 'aucun'` ;
- `weekly_reports_user_week_idx` sur `(user_id, week_start)`.

`profiles.user_id` doit aussi être unique. Les clés étrangères vers
`auth.users(id)` et les suppressions en cascade doivent rester présentes.

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

## Row Level Security

RLS doit être activée sur les six tables applicatives. Chacune doit disposer de
quatre politiques : `SELECT`, `INSERT`, `UPDATE` et `DELETE`.

- `SELECT` et `DELETE` : `user_id = auth.uid()` dans `using` ;
- `INSERT` : `user_id = auth.uid()` dans `with check` ;
- `UPDATE` : la même règle dans `using` et `with check`.

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'weight_entries',
    'meal_observations',
    'meal_observation_tags',
    'tobacco_events',
    'weekly_reports'
  )
order by c.relname;

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Contrôle distant du 15 juillet 2026 : RLS est activée et les quatre politiques
`auth.uid()` sont présentes sur chacune des six tables. Cette vérification doit
être répétée après le prochain push.

## Validation fonctionnelle

- [ ] Créer un profil avec le compte A.
- [ ] Modifier `show_active_mission` et `dark_mode`, puis recharger.
- [ ] Noter poids, repas et tabac avec le compte A.
- [ ] Vérifier les champs V0.7 du repas dans Table Editor.
- [ ] Se connecter avec le compte B et vérifier qu'aucune donnée de A n'est visible.
- [ ] Revenir au compte A et vérifier la synchronisation hors ligne.
- [ ] Relancer `npm run verify` avant la release.
