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
- `src/app/sport/` et `src/features/sport/` : module Sport isolé par route.

## Ordre d’extraction suivant

1. Déplacer le modèle et l’écran du tunnel Repas sans modifier son contrat.
2. Déplacer l’onboarding et son brouillon dans `src/features/onboarding/`.
3. Extraire les panneaux Poids et Tabac.
4. Réduire `ProjetCentenaireApp.tsx` à un shell de session, navigation et
   orchestration.

Chaque étape doit compiler et passer les tests avant la suppression de son
ancienne implémentation. Une refonte produit ne doit pas être mélangée à une
extraction architecturale.
