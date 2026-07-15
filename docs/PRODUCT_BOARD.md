# Haru — Product Board

Ce document est la source de vérité produit pour Haru, nom public du projet jusque-là appelé Projet Centenaire : idées, décisions, retours terrain, backlog, arbitrages et prochains sprints.

Chaque nouvelle idée doit être placée dans une des catégories suivantes :
- bug immédiat ;
- sprint en cours ;
- prochain sprint ;
- backlog ;
- idée parking.

## 1. Vision

Haru n’est pas une application de calories.
C’est un carnet comportemental qui aide l’utilisateur à observer ses faits, comprendre ses habitudes, et identifier ses vrais points de friction.

Principes :
- pas de calories ;
- pas de jugement de la personne ;
- vérité factuelle ;
- une action claire ;
- alimentation, tabac, mouvement et santé globale à terme ;
- l’application doit rester simple à renseigner.

## 2. Statut actuel — V0.7.1

Haru est actuellement en V0.7.1.

État :
- application en production sur Vercel ;
- Supabase connecté ;
- Google OAuth fonctionnel ;
- PWA installable ;
- page du jour mobile validée dans son principe ;
- onboarding nettoyé ;
- profil personnel par défaut supprimé ;
- V0.6.1 appliquée, commitée et pushée sur `main` après la note initiale ;
- V0.7 tunnel repas appliquée, commitée et pushée sur `main` ;
- V0.7.1 corrections ciblées appliquées localement avant redéploiement ;
- contrôles de release Supabase renforcés : une base existante n'est plus
  considérée à jour sans comparaison explicite des migrations locales et distantes.

Commit de référence :
- `a6641db` — `Prepare V0.6.1 production fixes`
- `da2f90f` — `Prepare V0.7 meal tunnel`
- `390a051` — `Fix meal tunnel continue button`

## 3. Décisions validées

- Nom public définitif : Haru. « Projet Centenaire » reste le nom historique du projet et du dépôt.
- Kit de marque officiel :
  - `public/brand/Haru.png` : mot-symbole horizontal pour les en-têtes ;
  - `public/brand/Haru2.png` : monogramme pour l’icône PWA et mobile ;
  - `public/brand/Haru3.png` : signature « Un jour à la fois. » pour le démarrage et l’accueil de l’onboarding ;
  - les trois masters sont transparents et recadrés au contenu utile.
- Direction artistique : interface mobile claire, calme et humaine, pensée comme un compagnon du quotidien.
- Structure visuelle : succession de fenêtres mobiles plein format, avec grands espaces, surfaces blanches, progression courte et action principale basse.
- Palette active : fond blanc ou bleu brume très clair, texte noir et actions allant du bleu pastel au bleu profond.
- Typographie d'interface : Nunito Sans variable, choisie pour une présence plus ronde, mobile et chaleureuse ; le futur mot-symbole reste indépendant.
- Pas de sport dans la V0.
- Pas de communauté dans la V0.
- Pas d’IA tant que le tunnel repas n’est pas stabilisé.
- Le tabac est intégré mais doit devenir un vrai module plus tard.
- Le profil par défaut personnel a été supprimé.
- La page du jour mobile est validée dans son principe.
- Les types de repas doivent être : Petit déjeuner, Déjeuner, Dîner, Grignotage.
- “Collation” et “Autre” ne doivent plus être proposés comme choix actifs.
- Les anciennes données “Collation” restent lisibles et sont traitées comme “Grignotage”.
- Le grignotage doit être un type d’observation, pas une question après repas.
- Le petit déjeuner ne doit pas demander entrée/dessert.

## 4. Retours terrain

Retours remontés après 3/4 jours de test réel.

### Bugs / irritants immédiats

- L’application ne change pas automatiquement de jour après minuit si elle reste ouverte.
- Le logo historique était parfois rogné ou coupé ; le kit Haru recadré le remplace.
- La mission en cours doit pouvoir être masquée/affichée.
- La question “grignotage après repas” est incohérente et doit disparaître.
- Les étiquettes repas sont trop pauvres.
- Exemple : “Muffin oeuf bacon” ne doit pas ressortir seulement comme “Protéines”.
- La chronologie doit permettre modifier/supprimer un repas via appui long.
- Les paramètres sont trop techniques.

### UX repas

- La partie repas est encore trop chiante.
- L’application n’est pas assez curieuse.
- Si l’utilisateur écrit “salade de pâtes, tomates et wrap”, l’app devrait demander “Un wrap à quoi ?”.
- Les choix “assiette raisonnable / très chargée” sont subjectifs et peuvent être minimisés.
- La faim avant repas pourrait être simplifiée.
- “Pourquoi l’arrêt ?” est flou.
- “Contrainte extérieure” n’est pas clair.
- Il faudrait plutôt demander entrée/dessert.
- Le constat est trop formel et trop scientifique.

### Tabac

- Le tabac est noté mais pas réellement accompagné.
- Il faudra probablement un module tabac dédié.
- Le bilan quotidien pourrait intégrer la clope si l’utilisateur est fumeur.

### Journal / bilan

- Le journal doit être regroupé intelligemment par jour.
- L’application doit faire une remarque sur la journée.
- Le bilan quotidien paraît plus utile qu’un bilan seulement hebdomadaire.
- Le bilan semaine ne doit pas faire étude scientifique.

### Paramètres

- Profil doit être cliquable et modifiable.
- Mode sombre doit être un switch On/Off.
- Compte et Profil peuvent probablement être regroupés.
- Export/import JSON doivent être cachés dans options avancées.
- Les paramètres doivent ressembler à de vrais paramètres d’application.

## 5. Sprint V0.6.1 — Corrections UX immédiates

Statut : appliqué, vérifié localement, commit/push effectués.

Objectif :
Corriger les irritants immédiats sans ajouter de grosse fonctionnalité.

Changements réalisés :

- Logo header corrigé :
  - SVG non rogné ;
  - ratio carré conservé ;
  - tracés inchangés.

- Mission en cours :
  - préférence persistée ;
  - switch immédiat ;
  - plus besoin d’enregistrer tout le profil pour voir l’effet.

- Tunnel repas :
  - suppression de la question “grignotage après repas” ;
  - tunnel passé à 8 étapes ;
  - “Grignotage” reste un type d’observation, pas une question après repas.

- Étiquettes repas :
  - règles enrichies ;
  - exemple : “Muffin oeuf bacon” sort maintenant plusieurs tags :
    - Protéines ;
    - Féculents ;
    - Dessert ;
    - Très transformé.

- Chronologie du jour :
  - suppression des petits points permanents ;
  - appui long environ 2 secondes sur une observation ;
  - menu Modifier / Supprimer ;
  - clic ailleurs pour fermer le menu.

- Paramètres :
  - résumé profil ;
  - édition de profil repliée ;
  - vrais switches ;
  - compte séparé ;
  - export/import/reset rangés en Options avancées.

- Mode sombre :
  - vrai switch persisté ;
  - thème sombre léger ajouté.

### Vérifications V0.6.1

Vérifications locales annoncées comme OK :
- `npm run typecheck` ;
- `npm run lint` ;
- `npm run test` : 36 tests OK ;
- `npm run build` OK après relance hors sandbox.

### Migrations V0.6.1

Migrations à appliquer avant redéploiement cloud si non automatisé :
- `supabase/migrations/20260714090000_v06_preferences.sql`
- `supabase/migrations/20260714100000_v061_dark_mode_preference.sql`

Action requise :
- lancer `npx supabase db push` avant ou pendant le redéploiement Vercel.

### Checklist avant redéploiement V0.6.1

- [ ] Tester localement la page du jour.
- [x] Vérifier que le logo n’est plus rogné sur mobile.
- [ ] Vérifier que Mission en cours peut être affichée/masquée.
- [ ] Vérifier que le tunnel repas n’affiche plus “grignotage après repas”.
- [ ] Vérifier les types de repas.
- [ ] Vérifier modification d’un repas par appui long.
- [ ] Vérifier suppression d’un repas par appui long.
- [ ] Vérifier paramètres/profil.
- [ ] Vérifier mode sombre.
- [ ] Appliquer migrations Supabase.
- [ ] Lancer `npm run verify`.
- [x] Commit.
- [x] Push.
- [ ] Vérifier redéploiement Vercel.
- [ ] Tester sur iPhone.

## 6. Sprint V0.7 — Tunnel repas

Objectif :
Rendre la saisie repas moins pénible, plus pertinente, plus curieuse et moins formelle.

Statut : appliqué localement, vérifié, commit/push effectués.

Changements réalisés :

- Tunnel repas V0.7 appliqué.
- Types actifs :
  - Petit déjeuner ;
  - Déjeuner ;
  - Dîner ;
  - Grignotage.
- Entrée/dessert ajoutés pour Déjeuner et Dîner.
- Tunnel court Grignotage conservé :
  - contenu ;
  - déclencheur ;
  - contexte ;
  - ressenti après ;
  - retour carnet.
- Détection alimentaire simple extraite dans un module dédié.
- Clarifications rapides sur aliments ambigus, dont wrap.
- Ton final remplacé par :
  - Ce que je vois ;
  - Point à surveiller ;
  - Prochaine fois.

### Migrations V0.7

Migration ajoutée :
- `supabase/migrations/20260714110000_v07_meal_tunnel.sql`

Action requise :
- appliquer la migration Supabase avant redéploiement cloud.

## 7. Sprint V0.7.1 — Corrections ciblées avant prod

Objectif :
Corriger les irritants UX visibles avant redéploiement, sans refaire le tunnel ni ajouter de fonctionnalité.

Statut : appliqué localement.

Changements réalisés :

- Migration V0.7 renommée avec timestamp unique :
  - ancien nom : `20260714090000_v07_meal_tunnel.sql` ;
  - nouveau nom : `20260714110000_v07_meal_tunnel.sql`.
- Chronologie :
  - appui long réduit à environ 1 seconde ;
  - sélection de texte supprimée sur les cartes repas interactives ;
  - callout iOS désactivé sur ces cartes ;
  - menu Modifier / Supprimer conservé.
- Tunnel repas :
  - Petit déjeuner sans entrée/dessert ;
  - Déjeuner et Dîner conservent entrée/dessert ;
  - Grignotage conserve son tunnel court.
- Notifications internes :
  - affichage en overlay fixe ;
  - respect safe area iPhone ;
  - ne poussent plus la page vers le bas.

- Cohérence SQL base neuve/base migrée :
  - ajout de `20260715133410_v071_meal_boolean_defaults.sql` ;
  - défaut `false` appliqué à `starter_taken` et `dessert_taken` ;
  - anciennes valeurs nulles normalisées à `false`.

### État Supabase avant release

Contrôle distant historique effectué le 15 juillet 2026 avec Supabase CLI
2.109.1, avant l'ajout de la migration corrective :

- migrations V0.5, stabilisation V0.5 et préférences V0.6 présentes à distance ;
- migration V0.6.1 `dark_mode` absente à distance ;
- migration V0.7 tunnel repas absente à distance ;
- dry-run limité à ces deux migrations manquantes ;
- aucun push réel effectué pendant cette première passe de contrôle.

La migration corrective V0.7.1 a été ajoutée localement après ce contrôle.
Le nouveau `migration list --linked` et le nouveau dry-run confirment trois
migrations locales absentes à distance :

- V0.6.1 `dark_mode` ;
- V0.7 tunnel repas ;
- V0.7.1 défauts booléens repas.

Aucun push réel n'a été exécuté pendant cette correction SQL.
Le dry-run devra être relancé immédiatement avant tout futur push.

La base distante ne doit pas être déclarée prête V0.7.1 avant exécution de
`npx supabase db push --linked` puis nouvelle vérification de l'historique, des
colonnes, des index et de la RLS.

RLS distante vérifiée avant push : activée sur les six tables applicatives, avec
quatre politiques `auth.uid()` par table. Les six index d'unicité attendus sont
également présents.

### Audit dépendances

- aucune vulnérabilité high ou critical au 15 juillet 2026 ;
- deux alertes modérées concernent PostCSS 8.4.31 imbriqué dans Next.js 16.2.10 ;
- Next.js 16.2.10 reste la dernière version stable disponible ;
- le correctif PostCSS existe dans la branche 16.3 canary, qui n'est pas retenue
  pour une release de production ;
- mise à jour Next.js à traiter dans un commit séparé dès publication d'une
  version stable intégrant PostCSS 8.5.10 ou ultérieur.

## 8. Backlog

### V0.8 — Bilan quotidien

Objectif :
Créer un vrai bilan de journée, plus utile qu’un simple bilan hebdomadaire.

Pistes :
- regrouper les repas par jour ;
- générer une remarque quotidienne ;
- pointer le comportement le plus marquant de la journée ;
- intégrer le tabac si l’utilisateur est fumeur ;
- relancer éventuellement une courte question sur l’état d’esprit du jour ;
- rafraîchir la motivation sans gamification.

### V0.9 — Module tabac

Objectif :
Transformer le tabac en vrai module d’accompagnement.

Pistes :
- jours sans cigarette ;
- cigarettes fumées ;
- envies fortes ;
- déclencheurs ;
- lien avec repas, stress, voiture, hôtel ;
- transfert éventuel vers nourriture ;
- bilan quotidien tabac ;
- aucun jugement.

### V1 — IA

Objectif :
Intégrer l’IA quand le tunnel repas sera stabilisé.

Pistes :
- correction tolérante des aliments ;
- compréhension des fautes :
  - wrap ;
  - vrap ;
  - ourap ;
- classification alimentaire plus intelligente ;
- questions de clarification ;
- analyse comportementale plus fine ;
- formulation de bilans quotidiens plus naturels.

Ne pas implémenter maintenant.

### V1+ — Onboarding diagnostic

Objectif :
Repenser l’inscription comme un vrai diagnostic initial.

Pistes :
- expliquer que la première semaine sert à observer sans corriger brutalement ;
- calculer l’IMC avec prudence ;
- expliquer ce que l’IMC indique sans jugement ;
- expliquer la méthode Projet Centenaire ;
- comprendre le contexte utilisateur :
  - restaurant ;
  - hôtel ;
  - travail ;
  - tabac ;
  - sport ;
  - grignotage ;
  - quantités ;
- dresser un premier profil comportemental ;
- ne pas donner trop de conseils avant d’avoir observé les faits.

## 9. Idées parking

- Mouvement / activité physique à terme, hors V0.
- Santé globale à terme, sans diluer le carnet comportemental.
- Module de motivation sans badges ni gamification superficielle.
- Meilleure lecture du contexte utilisateur : déplacement, hôtel, restaurant, voiture, stress.

## 10. Interdits actuels

Ne pas ajouter pour l’instant :
- sport ;
- communauté ;
- paiement ;
- IA complète ;
- notifications push ;
- Apple Health ;
- gamification ;
- calories ;
- dashboard complexe.

## 11. Questions ouvertes

- Comment mesurer la quantité sans dépendre uniquement de la perception de l’utilisateur ?
- À quel moment intégrer l’IA ?
- Quelle place exacte donner au tabac ?
- Le bilan quotidien doit-il remplacer ou compléter le bilan hebdomadaire ?
- Comment rendre les constats directs sans paraître froids ou scientifiques ?
- Comment faire un onboarding qui explique l’IMC sans juger ?
- Faut-il une semaine d’observation obligatoire avant recommandations ?
