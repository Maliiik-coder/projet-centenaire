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
- `src/features/onboarding/OnboardingFlow.tsx` : progression complète du
  premier onboarding et bilan final ;
- `src/features/onboarding/BehaviorProfileEditor.tsx` : révision du portrait
  comportemental depuis le Profil ;
- `src/features/onboarding/onboardingModel.ts` : brouillons, validations,
  navigation conditionnelle et création du profil ;
- `src/features/tracking/SmokingPanel.tsx` : saisie rapide d’un état ou événement
  tabac ;
- `src/features/tracking/dailyTrackingModel.ts` : validation et création des
  entrées quotidiennes Poids et Tabac ;
- `src/components/centenaire/TodayScreen.tsx` : possède localement l’ouverture,
  le brouillon et l’historique navigateur de la roue Poids ;
- `src/app/sport/` et `src/features/sport/` : module Sport isolé par route.

## Ordre d’extraction suivant

1. Extraire les écrans de démarrage et de migration locale.
2. Isoler l’orchestration de session et de persistance dans des hooks dédiés.
3. Extraire les gestionnaires de repas et de suivi quotidien dans des
   contrôleurs dédiés si leur taille augmente de nouveau.
4. Réduire `ProjetCentenaireApp.tsx` à un shell de session, navigation et
   orchestration.

Chaque étape doit compiler et passer les tests avant la suppression de son
ancienne implémentation. Une refonte produit ne doit pas être mélangée à une
extraction architecturale.
