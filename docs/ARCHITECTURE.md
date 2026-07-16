# Architecture Haru

## Principe

`ProjetCentenaireApp.tsx` est désormais un shell d’interface. Il conserve la
navigation, les panneaux transversaux et la traduction des intentions métier,
mais ne possède plus directement le cycle de session, les caches locaux ou les
files cloud.

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
- `src/features/startup/StartupScreens.tsx` : chargement, réinitialisation locale
  et décision explicite de migration ;
- `src/features/session/useAppDataSession.ts` : sélection du scope invité ou
  utilisateur, chargement cloud, miroir hors ligne, reprise réseau, mutations
  pending, migration explicite, déconnexion et réinitialisation ;
- `src/app/sport/` et `src/features/sport/` : module Sport isolé par route.

## Ordre d’extraction suivant

1. Extraire les gestionnaires de repas et de suivi quotidien dans des
   contrôleurs dédiés si leur taille augmente de nouveau.
2. Déplacer les fonctions de formatage transversales vers leurs domaines.
3. Réduire encore `ProjetCentenaireApp.tsx` à la navigation et à la composition
   des contrôleurs déjà isolés.

Chaque étape doit compiler et passer les tests avant la suppression de son
ancienne implémentation. Une refonte produit ne doit pas être mélangée à une
extraction architecturale.
