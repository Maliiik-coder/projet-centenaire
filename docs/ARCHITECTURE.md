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
- `src/features/today/TodayWeightCard.tsx` : interaction complète de la roue
  Poids, saisie directe et historique navigateur local ;
- `src/features/today/TodayTimeline.tsx` : tri et rendu des faits de la journée,
  dont le menu contextuel des repas ;
- `src/features/journal/JournalScreen.tsx` : vues Jours et Semaines du Carnet ;
- `src/features/insights/InsightsScreen.tsx` : ancienne vue autonome conservée
  temporairement comme source de lecture, mais retirée de la navigation ;
- `src/app/recipes/` et `src/features/recipes/` : frontière du futur module
  Recettes, actuellement limitée à un écran de développement ;
- `src/features/profile/ProfileScreen.tsx` : profil, préférences, compte et
  options avancées ;
- `src/features/meal/MealTunnelScreen.tsx` : progression et rendu du tunnel
  Repas ;
- `src/features/meal/MealTunnelControls.tsx` : contrôles visuels réutilisables
  du tunnel, quantités, clarifications et constat final ;
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
- `src/features/startup/StartupScreens.tsx` : chargement, réinitialisation locale
  et décision explicite de migration ;
- `src/features/session/useAppDataSession.ts` : sélection du scope invité ou
  utilisateur, chargement cloud, miroir hors ligne, reprise réseau, mutations
  pending, migration explicite, déconnexion et réinitialisation ;
- `src/features/startup/useAppEntryFlow.ts` et `useCurrentDate.ts` : lancement,
  reprise de route et changement de journée ;
- `src/features/meal/useMealJournalController.ts` : ouverture, modification,
  suppression et persistance des repas ;
- `src/lib/nutrition/` : contrats internes Ciqual, portions usuelles versionnées
  et estimation nutritionnelle à fourchettes, sans affichage dans le carnet ;
- `src/features/profile/useProfileController.ts` : brouillon, préférences,
  portrait comportemental et import du profil ;
- `src/features/tracking/useDailyTrackingController.ts` : mutations quotidiennes
  Poids et Tabac ;
- `src/features/today/todayViewModel.ts` : sélections et libellés purs de la
  page Aujourd’hui ;
- `src/components/centenaire/HaruAppShell.tsx` : header, messages, navigation et
  montage des panneaux transversaux ;
- `src/app/sport/` et `src/features/sport/` : module Sport isolé par route.

## Ordre d’extraction suivant

1. Découper `MealTunnelScreen.tsx` par familles de questions lorsque la refonte
   fonctionnelle du tunnel aura stabilisé leur ordre.
2. Découper `JournalScreen.tsx` entre vues Jours, Semaines et graphique.
3. Séparer le hook de session en cycle de vie, persistance et migration si ces
   sous-domaines doivent évoluer indépendamment.

Chaque étape doit compiler et passer les tests avant la suppression de son
ancienne implémentation. Une refonte produit ne doit pas être mélangée à une
extraction architecturale.
