# Haru Sport - tranche renforcement

## Perimetre livre

Cette tranche expose une route isolee `/sport`, sans integration dans le shell principal. Elle couvre :

- questionnaire de premiere ouverture Sport volontairement court ;
- objectifs multiples, activite marche/course unifiee et choix renforcement musculaire ;
- profil sportif local, puis arrivee sur le tableau de bord apres creation ;
- evaluation guidee ouverte volontairement depuis le tableau de bord ;
- test sequentiel en feuille : variante, illustration depart/fin, bouton pret, compte a rebours 3 s, effort 20 s, reponse oui/non ;
- capacites multidimensionnelles calibrees depuis le niveau de variante tenu ;
- bibliotheque initiale de mouvements de renforcement dans `src/lib/sport/exerciseLibrary.ts` ;
- tableau de bord `/sport` avec choix d'activite, seances faites et jauges de progression ;
- illustrations fournies pour les premieres variantes de pompes, avec fallback SVG interne pour les autres mouvements ;
- moteur deterministe et versionne dans `src/lib/sport/workoutGenerator.ts` ;
- aperçu de seance, chronometre, pause, reprise, passage d'etape et fin ;
- retour de seance neutre, historique basique et adaptation d'une seule variable ;
- migration Supabase locale `20260715165000_v08_sport_foundation.sql` avec RLS explicites.

Marche/course et natation sont representees dans les types du profil et dans le selecteur du tableau de bord, avec la mention "En developpement". Leur generation autonome n'est pas implementee dans cette tranche. La marche/course est une seule progression : une personne visant la course peut commencer par marcher, et une preference "marche seulement" pourra etre ajoutee dans l'arbre dedie.

La progression de renforcement privilegie les variantes sans materiel obligatoire. Exemple pour les pompes : mur, genoux, sol, puis pieds sureleves. Le dashboard ne liste pas toutes les variantes ; il affiche une visualisation globale par axes. Le moteur ne doit augmenter qu'une seule variable a la fois.

## Architecture

- `src/lib/sport/types.ts` : modeles domaine Sport.
- `src/lib/sport/config.ts` : version moteur et parametres configurables.
- `src/lib/sport/exerciseLibrary.ts` : catalogue initial, medias en emplacements reserves.
- `src/lib/sport/progression.ts` : adaptation a partir des retours.
- `src/lib/sport/workoutGenerator.ts` : generation pure et reproductible.
- `src/lib/sport/workoutTimer.ts` : chronometre pur fonde sur des horodatages.
- `src/services/sport/*` : profil, stockage local isole, historique et permissions.
- `src/features/sport/ExerciseIllustration.tsx` : illustrations schematiques locales, sans media externe.
- `src/features/sport/assets/*` : guides de mouvement fournis par l'utilisateur pour les variantes de pompes.
- `src/features/sport/SportApp.tsx` : experience client isolee.
- `src/app/sport/page.tsx` : route App Router.

## Contrat d'integration shell

Quand la conversation principale integrera l'onglet :

1. Ajouter une cinquieme entree `Sport` a la navigation basse partagee.
2. Router cette entree vers `/sport` ou monter `SportApp` dans le shell existant.
3. Brancher l'utilisateur authentifie a la place de `SPORT_LOCAL_USER_ID`.
4. Remplacer `sportLocalStore` par un miroir local officiel dans `AppData`.
5. Conserver le moteur pur : il doit recevoir ses donnees par props/services et ne pas lire directement Supabase.
6. Ajouter plus tard l'arbre marche/course : marche seulement, marche avant course, reprise course.
7. Brancher l'entree basse `Sport` sur le tableau de bord, pas directement sur l'onboarding ; l'onboarding reste affiche seulement si aucun profil Sport n'existe.

Aucun fichier de navigation partage n'a ete modifie dans cette branche.

## Contrat Supabase

Tables utilisateur : `sport_profiles`, `sport_user_equipment`, `sport_user_limitations`, `sport_user_capabilities`, `sport_workout_sessions`, `sport_workout_steps`, `sport_workout_feedback`.

`sport_profiles.goals` est un tableau, car les objectifs peuvent se cumuler. L'onboarding isole ne demande plus le materiel ni les limitations ; les tables restent prevues pour une integration future plus fine et pour les retours sensibles post-seance.

Chaque table utilisateur porte `user_id` et quatre politiques RLS `select/insert/update/delete` basees sur `auth.uid()`.

Tables catalogue : `sport_exercises`, `sport_exercise_variants`, `sport_exercise_media`, en lecture client uniquement. Les medias restent des emplacements avec source/licence/statut de validation. Aucun media Internet n'est importe.

Aucun `supabase db push` n'a ete execute pour cette tranche.

## Ajouter un exercice

1. Ajouter une famille dans `STRENGTH_EXERCISES`.
2. Definir `movementPattern`, `capabilityDimension`, `requiredEquipment`, `targetZones` et `cautionZones`.
3. Fournir deux a quatre variantes avec difficultes 0 a 4 et liens easier/harder.
4. Garder `validationStatus: "draft_unreviewed"` tant que le contenu n'est pas relu.
5. Ajouter un test si l'exercice influence une selection critique.

## Ajouter une regle moteur

1. Ajouter un parametre dans `STRENGTH_WORKOUT_CONFIG` si la valeur est configurable.
2. Ajouter une raison structuree dans `SportEngineReason` si la decision doit etre explicable.
3. Modifier `workoutGenerator.ts` ou `progression.ts`, jamais le composant React.
4. Ajouter un test qui verifie la decision et la non-modification simultanee de plusieurs axes.

## Limites volontaires

- Pas de calories brulees.
- Pas de compensation alimentaire.
- Pas d'IA decisionnelle.
- Pas de GPS, montre, carte, analyse video, classement, competition ni coaching vocal.
- Pas de diagnostic medical.
- Pas de marche/course ou natation autonome dans cette tranche.
