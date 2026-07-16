# Architecture Haru

## Principe

`ProjetCentenaireApp.tsx` reste temporairement le shell historique. Il possède
la session, l’état applicatif, les mutations, les files hors ligne et les
transitions entre les grands modes. Il ne doit plus porter le rendu détaillé de
chaque onglet.

Les modules de `src/features/` suivent une frontière simple :

- un écran reçoit des données déjà sélectionnées et des callbacks explicites ;
- un écran peut gérer son état d’interface local ;
- un écran n’appelle pas directement Supabase, `localStorage` ou les services de
  synchronisation ;
- les transformations pures vivent dans un fichier `*Model.ts` testable ;
- le shell traduit les intentions de l’écran en mutations locales ou cloud.

## Frontières actuelles

- `src/components/centenaire/TodayScreen.tsx` : page Aujourd’hui ;
- `src/features/journal/JournalScreen.tsx` : vues Jours et Semaines du Carnet ;
- `src/features/insights/InsightsScreen.tsx` : constats hebdomadaires ;
- `src/features/profile/ProfileScreen.tsx` : profil, préférences, compte et
  options avancées ;
- `src/features/meal/MealTunnelScreen.tsx` : progression et rendu du tunnel
  Repas ;
- `src/features/meal/mealDraftModel.ts` : brouillon, validation, navigation,
  reconstruction et création d’une observation repas ;
- `src/app/sport/` et `src/features/sport/` : module Sport isolé par route.

## Ordre d’extraction suivant

1. Déplacer l’onboarding et son brouillon dans `src/features/onboarding/`.
2. Extraire les panneaux Poids et Tabac.
3. Extraire les écrans de démarrage et de migration locale.
4. Réduire `ProjetCentenaireApp.tsx` à un shell de session, navigation et
   orchestration.

Chaque étape doit compiler et passer les tests avant la suppression de son
ancienne implémentation. Une refonte produit ne doit pas être mélangée à une
extraction architecturale.
