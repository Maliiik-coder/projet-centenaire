# Supabase checklist V0.5

Checklist manuelle a effectuer dans Supabase Studio apres `supabase db push`.

## Tables attendues

Dans **Table Editor**, verifier que les tables suivantes existent :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

Dans `meal_observations`, verifier aussi la presence de :

- `observed_date`
- `observed_time`

## RLS

Dans **Authentication > Policies**, verifier que RLS est activee pour chaque table applicative :

- `profiles`
- `weight_entries`
- `meal_observations`
- `meal_observation_tags`
- `tobacco_events`
- `weekly_reports`

Pour chaque table, les policies doivent limiter les operations a l'utilisateur connecte :

- `select` : `user_id = auth.uid()`
- `insert` : `user_id = auth.uid()`
- `update` : `user_id = auth.uid()`
- `delete` : `user_id = auth.uid()`

Pour `profiles`, la meme regle s'applique : un utilisateur ne peut lire, creer,
modifier ou supprimer que son propre profil.

## Contraintes utiles

Verifier dans **Database > Indexes** :

- `weight_entries_user_entry_date_idx` : une seule mesure officielle par date et par utilisateur.
- `tobacco_events_one_explicit_none_per_day_idx` : un seul etat `aucun` explicite par date et par utilisateur.
- `weekly_reports_user_week_idx` : un seul rapport par semaine et par utilisateur.

## Test rapide

Avec un utilisateur connecte :

- creer un profil ;
- noter un poids ;
- noter une observation repas ;
- noter un evenement tabac ;
- recharger l'application.

Avec un autre utilisateur, verifier qu'aucune donnee du premier compte n'est visible.
