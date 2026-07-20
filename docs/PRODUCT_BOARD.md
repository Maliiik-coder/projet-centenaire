# Haru — Product Board

Ce document est la source de vérité produit pour Haru, nom public du projet jusque-là appelé Projet Centenaire : idées, décisions, retours terrain, backlog, arbitrages et prochains sprints.

Chaque nouvelle idée doit être placée dans une des catégories suivantes :
- bug immédiat ;
- sprint en cours ;
- prochain sprint ;
- backlog ;
- idée parking.

## 1. Vision

Haru n’est pas une application de comptage calorique quotidien.
C’est un carnet comportemental qui aide l’utilisateur à observer ses faits, comprendre ses habitudes, et identifier ses vrais points de friction.

Principes :
- pas d’objectif calorique quotidien, de budget à consommer ni de logique de compensation ;
- les données nutritionnelles peuvent être utilisées avec prudence pour les recettes et l’analyse qualitative des repas ;
- pas de jugement de la personne ;
- vérité factuelle ;
- une action claire ;
- alimentation, tabac, mouvement et santé globale à terme ;
- l’application doit rester simple à renseigner.

## 2. Statut actuel — socle V0.7.1, refonte mobile et métier en cours

Le socle technique de Haru reste la V0.7.1. L'interface et plusieurs parcours
fonctionnels sont désormais en refonte progressive, écran par écran.

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
- fondations visuelles mobiles et identité Haru intégrées sur `main` ;
- contrôles de release Supabase renforcés : une base existante n'est plus
  considérée à jour sans comparaison explicite des migrations locales et distantes.
- démarrage et onboarding Haru finalisés dans leur première version testable ;
- pages Aujourd'hui et Carnet validées dans leur structure actuelle ;
- page Aujourd'hui restructurée autour d'une saisie de poids intégrée et d'un
  repère neutre pendant les sept premiers jours ;
- tunnel repas V2 structuré et livré, sans affichage de calories ;
- connexion Ciqual 2025, contrat d'analyse Repas et sécurisation des portions
  intégrés et validés localement avant publication ;
- Carnet réorganisé en lectures Jours et Semaines ; l'onglet Constats autonome
  est retiré de la navigation et remplacé par Recettes ;
- route `/recipes` et frontière `src/features/recipes/` actives avec un premier
  MVP local : catalogue, recherche, fiches, recettes personnelles et favoris ;
- module Sport accessible par une cinquième entrée de navigation ;
- navigation basse, thème et retours sont désormais partagés entre le cœur de
  l'application, Recettes et Sport, sans rechargement complet volontaire ;
- catalogue Sport enrichi à 36 familles et 101 variantes, avec sélection
  déterministe adaptée aux capacités ; le contenu reste à valider et peaufiner ;
- Profil identifié comme prochaine refonte fonctionnelle et visuelle complète.

État Git de référence au 20 juillet 2026 :

- production avant la présente intégration : `14e8173` — `Trigger Vercel
  deployment for Haru branding` ;
- checkout local : navigation et thème partagés, branding agrandi, MVP Recettes
  et catalogue Sport enrichi validés avant commit ;
- Sport, Recettes et abonnements restent sous pilotage produit direct et ne
  doivent pas être modifiés par un chantier transversal sans demande explicite.

Commit de référence :
- `a6641db` — `Prepare V0.6.1 production fixes`
- `da2f90f` — `Prepare V0.7 meal tunnel`
- `390a051` — `Fix meal tunnel continue button`
- `37c857b` — `Stabilize V0.7.1 local and cloud data`
- `168b726` — `Apply Haru mobile redesign foundations`

## 3. Décisions validées

- Nom public définitif : Haru. « Projet Centenaire » reste le nom historique du projet et du dépôt.
- Kit de marque officiel :
  - `public/brand/haru-wordmark-heart-v2.png` : mot-symbole rond et lié, avec cœur bleu en signature devant le H ;
  - `public/brand/haru-mark-heart-v2.png` : monogramme cœur + H pour l’icône PWA, le mobile et les chargements ;
  - la signature « Un jour à la fois. » est composée dans l’interface sous le mot-symbole ;
  - les deux masters sont transparents et recadrés à 18 px du contenu utile ;
  - les icônes installables V4 utilisent le nouveau monogramme et une zone de sécurité dédiée à la variante maskable.
- Direction artistique : interface mobile claire, calme et humaine, pensée comme un compagnon du quotidien.
- Structure visuelle : succession de fenêtres mobiles plein format, avec grands espaces, surfaces blanches, progression courte et action principale basse.
- Palette active : fond blanc ou bleu brume très clair, texte noir et actions allant du bleu pastel au bleu profond.
- L'écran de lancement Haru reste toujours blanc, même lorsque le thème sombre
  est mémorisé ; le thème utilisateur reprend après la fin du démarrage.
- Les modules autonomes utilisent un en-tête commun sans séparateur : flèche
  ronde à gauche et mot-symbole Haru centré.
- Typographie d'interface : Nunito Sans variable, choisie pour une présence plus ronde, mobile et chaleureuse ; le futur mot-symbole reste indépendant.
- Un module Sport est désormais approuvé. Il reste privé, progressif, sans calories brûlées, sans compétition et sans logique de compensation alimentaire.
- Un module Recettes est désormais approuvé. Sa dimension communautaire est
  limitée au partage contrôlé de recettes publiques, aux favoris, à la
  duplication et au signalement ; aucun fil social, commentaire ou messagerie
  n’est prévu dans le MVP.
- Ciqual doit servir de base alimentaire officielle pour structurer les ingrédients, estimer les recettes et préparer une analyse qualitative plus fiable des repas.
- Les données nutritionnelles ne doivent jamais être inventées lorsqu’un aliment ou une conversion n’est pas fiable.
- Les portions usuelles constituent une couche séparée de Ciqual, versionnée,
  sourcée et exprimée en fourchettes plutôt qu'en valeurs exactes.
- L’affichage nutritionnel détaillé appartient d’abord aux fiches recettes. Son éventuelle visibilité dans le suivi quotidien reste à arbitrer.
- Pas d’IA tant que le tunnel repas n’est pas stabilisé.
- Le tabac est intégré mais doit devenir un vrai module plus tard.
- Le profil par défaut personnel a été supprimé.
- La page du jour mobile est validée dans son principe.
- L'objectif de poids de l'onboarding est présélectionné à partir de la zone
  d'IMC adulte de référence, présenté comme un repère modifiable et jamais comme
  une prescription ou un poids idéal universel.
- Google OAuth doit toujours proposer le choix du compte avec
  `prompt=select_account`.
- Une déconnexion réussie ramène explicitement à l'écran de connexion.
- Les pages autonomes utilisent une flèche de retour ronde et reviennent à la
  page précédente du même domaine. Un accès direct retombe sur une reprise du
  carnet sans rejouer l'écran de garde complet.
- Les types de repas doivent être : Petit déjeuner, Déjeuner, Dîner, Grignotage.
- “Collation” et “Autre” ne doivent plus être proposés comme choix actifs.
- Les anciennes données “Collation” restent lisibles et sont traitées comme “Grignotage”.
- Le grignotage doit être un type d’observation, pas une question après repas.
- Le petit déjeuner ne doit pas demander entrée/dessert.
- Pendant les sept premiers jours, Haru observe sans proposer de correction
  immédiate après un repas. Les tendances et pistes d'action viennent après
  consolidation des faits.
- Carnet regroupe la lecture quotidienne et hebdomadaire. À terme, Constats ne
  reste pas un onglet autonome.
- Navigation cible validée : `Aujourd'hui · Carnet · Recettes · Sport · Profil`.
- La page Aujourd'hui reste gratuite. L'hypothèse commerciale à valider est
  5 euros pour Recettes, 5 euros pour Sport, ou 8 euros pour les deux.
- L'IA conversationnelle et analytique est prévue, mais seulement après
  stabilisation des modèles de données et des règles déterministes.
- Un backend d'administration séparé sera nécessaire pour les contenus, les
  signalements, le catalogue et le support. La cible validée est une application
  web d'administration séparée et sécurisée ; le contrat est décrit dans
  `docs/ADMIN_BACKOFFICE.md`, mais aucune interface ou plomberie réelle n'est
  encore livrée.

### Coordination des chantiers parallèles

- commit de base commun : `168b726` ;
- conversation principale : branche `codex/haru-recipes-ui`, propriétaire de Recettes, de la refonte UX, de la navigation et des fichiers partagés ;
- conversation Sport : branche `codex/sport` publiée après livraison de la
  première tranche isolée ;
- Sport travaille uniquement dans son domaine isolé et ne modifie pas le shell, la navigation, le stockage partagé, le tunnel repas ou Recettes ;
- la route `/sport` est reliée à la navigation basse principale par une
  cinquième entrée ; l’intégration ultérieure dans `AppData`, le miroir local et
  le cloud partagé reste sous la responsabilité de la conversation principale ;
- aucun chantier parallèle ne pousse ou ne fusionne directement dans `main` sans validation explicite.

### Audit d'intégration du 16 juillet 2026

- les chantiers Aujourd'hui, Repas et Carnet sont présents dans la même branche ;
- le poids s'édite sans navigation et sans déplacement de l'écran arrière ;
- le tunnel repas V2 conserve heure, composition, passages, faim et satiété ;
- l'heure reste l'information principale du premier écran repas ; la date ne
  s'affiche que sur demande via une action discrète ;
- le bilan immédiat reste descriptif durant la semaine d'observation ;
- une lecture rapide explicite aussi les repas sans signal dominant ;
- les clarifications du texte libre sont plafonnées et priorisées : aliments
  opaques, sauces et boissons passent avant les ambiguïtés faibles ;
- si le texte précise déjà le contenu d'un wrap, d'une sauce ou d'une boisson,
  Haru évite de reposer la question ;
- l'analyse immédiate tient compte de la faim au moment du resservice et des
  raisons choisies, sans assimiler automatiquement une reprise à une émotion ;
- les contrats internes Ciqual 2025, portions usuelles et estimation à
  fourchettes sont préparés dans `src/lib/nutrition/`, sans affichage
  nutritionnel dans le carnet ;
- les changements de type de repas ne conservent plus de champs cachés
  incompatibles ;
- la structure détaillée du repas est persistée dans `meal_structure` ;
- les migrations Sport et repas V2 ont été appliquées à la base liée après un
  dry-run limité à ces deux fichiers ;
- les neuf migrations sont alignées en local et à distance et le dry-run final
  confirme que la base distante est à jour ;
- le stockage local Sport est désormais cloisonné entre invité et chaque
  `userId` Supabase ; l'ancienne clé globale reste récupérable mais n'est jamais
  chargée automatiquement dans un compte.
- la vue Jours du Carnet simplifie les détails de portions et termine par une
  lecture factuelle de la journée, sans score ni jugement.

### Audit global du 20 juillet 2026

Lecture réaliste de l'avancement vers la vision produit complète :

- produit global : environ 43 % ;
- socle technique, stockage, synchronisation et PWA : environ 82 % ;
- coeur gratuit des sept premiers jours : environ 70 % ;
- fonctions payantes et exploitation : environ 10 %.

État fonctionnel :

- Démarrage/Auth : opérationnel avec Google, lien email et mode local ; Apple
  existe dans le code mais n'est pas activé ni validé ;
- Onboarding : première version testable complète ; la branche Tabac reste trop
  courte pour préparer un accompagnement dédié ;
- Aujourd'hui : saisies et fil factuel utilisables ; le vrai bilan quotidien
  reste à brancher ;
- Carnet : vues Jours/Semaines abouties dans leur structure ; l'analyse repose
  encore sur l'ancien moteur ;
- Profil : fonctionnel mais à reprendre visuellement et dans ses validations ;
- Sport : verticale Renforcement testable et catalogue fortement enrichi, mais
  paiement, cloud réel et validation éditoriale des exercices absents ;
- Recettes : premier MVP local utilisable avec catalogue, fiche, création,
  modification, suppression et favoris ; cloud, Ciqual et droits payants absents ;
- Tabac : saisie quotidienne stabilisée, pas encore de module d'accompagnement ;
- Admin : maquette locale sous `/admin`, fermée en production par défaut,
  alimentée uniquement par des fixtures et sans branchement métier réel ;
- IA : aucun modèle branché.

Alertes techniques prioritaires :

1. L'index de recherche Ciqual et les nutriments détaillés sont désormais
   séparés. Un test de graphe d'import interdit leur retour dans les surfaces
   client.
2. L'import Ciqual est reproductible et documente ses sources, versions,
   empreintes et date d'import stable.
3. Le contrat `src/lib/mealAnalysisContract.ts` est testé mais n'est encore
   appelé par aucun écran ou service. Il doit remplacer progressivement les
   anciens constats sans créer deux sources de vérité.
4. Le catalogue de portions usuelles reste trop réduit pour convertir de manière
   fiable la majorité des aliments reconnus.
5. Plusieurs fichiers domaine restent très volumineux : Sport, session/offline,
   Carnet et analyse Repas devront continuer à être découpés lorsque leurs
   contrats seront stabilisés.

Ordre de travail validé après audit :

1. alléger et rendre reproductible l'intégration Ciqual ;
2. brancher le contrat d'analyse sur Repas, puis Aujourd'hui et Carnet ;
3. élargir prudemment la couche de portions usuelles, avec sources, fourchettes
   et niveaux de confiance explicites ;
4. reprendre Profil ;
5. cadrer puis développer le module Tabac ;
6. laisser Sport, Recettes et abonnements sous pilotage produit direct.

### File de chantiers coordonnée après l'audit

Les travaux transversaux sont séquencés afin d'éviter plusieurs modifications
concurrentes du tunnel Repas et de ses contrats :

1. **Ciqual mobile et reproductibilité — validé et intégré localement** :
   l'index de recherche est séparé des nutriments détaillés, l'import est
   reproductible et les surfaces client ne chargent pas les données
   nutritionnelles détaillées.
2. **Contrat d'analyse — pré-audit terminé** : les anciens appels, le mapping,
   l'ordre de bascule et les risques de collision sont inventoriés. Son
   implémentation reste en attente de la livraison Ciqual, puis connectera la
   lecture déterministe aux données Repas, aux vues Aujourd'hui et Carnet, sans
   afficher calories ou macros et sans maintenir deux moteurs concurrents.
3. **Portions usuelles — première sécurisation intégrée** : les références
   éditoriales ne produisent plus d'estimation active, les volumes restent
   distincts des grammes et une conversion incertaine reste inconnue.
4. **Profil — stabilisation validée et intégrée localement** : un brouillon
   ancien ne peut plus écraser les préférences ou le portrait courant ; les
   sauvegardes sans modification sont ignorées et les tests ciblés couvrent ces
   garanties.
5. **Tabac — contrat V0.3 validé et intégré** : modèle, compatibilité,
   confidentialité, phase descriptive et scénarios d'acceptation sont cadrés.
   Aucun écran, schéma ou branchement V2 n'est encore développé.

Critères de sortie :

- **Ciqual** : aucun artefact nutriments dans le graphe client de recherche,
  route `/` sensiblement allégée, import identique pour des sources identiques,
  validations complètes et mesures avant/après documentées ;
- **Analyse** : une seule source déterministe pour Repas, Jour et Semaine,
  résultats descriptifs pendant les sept premiers jours, aucune nutrition
  visible dans le carnet, compatibilité des anciennes observations ;
- **Portions** : chaque conversion porte une source, une version, une
  fourchette et un niveau de confiance ; l'absence de référence produit
  `unknown` plutôt qu'une estimation inventée ;
- **Profil** : édition mobile claire, validations explicites, préférences et
  compte correctement séparés, options techniques maintenues au second plan ;
- **Tabac** : contrat validé avant développement, distinction stricte entre
  non-renseigné, aucun, envie et cigarette, lecture quotidienne et hebdomadaire
  neutre, aucune logique médicale ou culpabilisante.

La première maquette **Admin** est intégrée sous `/admin`. Elle reste fermée en
production sans activation serveur explicite, utilise uniquement des fixtures et
ne contient ni Supabase, paiement, rôle réel, mutation, secret ou donnée
utilisateur. Cette maquette ne constitue pas encore le back-office sécurisé de
production.

Périmètres réservés au pilotage produit direct :

- Sport ;
- Recettes ;
- abonnements, paiements et droits d'accès.

Aucun chantier transversal ne doit modifier ces trois domaines sans nouvelle
instruction explicite. Recettes et Sport n'ont reçu aucun changement dans cette
passe.

État de coordination au 20 juillet 2026 :

- chantier Ciqual mobile/reproductibilité contrôlé, corrigé puis intégré dans le
  checkout principal ;
- pré-audit du branchement Analyse terminé en lecture seule ; aucune
  modification applicative ne commencera avant la livraison et le contrôle du
  chantier Ciqual ;
- pré-audit Portions terminé en lecture seule ; son implémentation reste en
  attente du contrat d'analyse stabilisé ;
- stabilisation Profil contrôlée puis intégrée avec ses tests ciblés ;
- contrat Tabac V0.3 contrôlé puis intégré dans
  `docs/TABAC_MODULE_CONTRACT.md` ; aucun écran, stockage, schéma Supabase ou
  branchement applicatif n'a été ajouté ;
- maquette Admin intégrée sélectivement ; `/admin` reste réseau seul côté
  service worker et fermé en production par défaut ;
- le contrat déterministe Repas est rédigé localement, mais aucun moteur d'IA ni
  code d'exécution externe n'est branché ;
- Sport, Recettes, abonnements, paiements et droits d'accès restent sous
  pilotage produit direct ;
- les futures reprises sont coordonnées depuis la conversation principale,
  sans délégation à des sous-agents.

## 4. Retours terrain

Retours remontés après 3/4 jours de test réel.

### Bugs / irritants immédiats

- Une session Auth valide pouvait afficher « Connexion cloud indisponible »
  après un simple délai de lecture sur mobile. Le seuil de lecture est porté à
  12 s et une reprise automatique est déclenchée après 3 s, puis au retour au
  premier plan ou du réseau.
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

Contrôle distant final effectué le 16 juillet 2026 :

- les neuf migrations sont alignées en local et à distance ;
- les fondations Sport et `meal_structure` V2 ont été appliquées après dry-run ;
- le dry-run final répond `Remote database is up to date` ;
- les politiques RLS historiques restent en place et la migration Sport crée
  les politiques propres aux ressources utilisateur ainsi que la lecture du
  catalogue public.

### Audit dépendances

- aucune vulnérabilité high ou critical au 15 juillet 2026 ;
- deux alertes modérées concernent PostCSS 8.4.31 imbriqué dans Next.js 16.2.10 ;
- Next.js 16.2.10 reste la dernière version stable disponible ;
- le correctif PostCSS existe dans la branche 16.3 canary, qui n'est pas retenue
  pour une release de production ;
- mise à jour Next.js à traiter dans un commit séparé dès publication d'une
  version stable intégrant PostCSS 8.5.10 ou ultérieur.

### Onboarding V1 — finalisation en cours

Contrat produit validé : `docs/ONBOARDING_V1.md`.

Décisions :

- Haru V1 s'adresse aux personnes de 18 ans et plus ;
- date de naissance exacte utilisée uniquement pour calculer l'âge, puis jetée ;
- IMC dérivé de la taille et du poids, présenté comme un repère limité ;
- sept questions de fréquence pour produire zéro, une ou deux hypothèses ;
- hypothèses déclarées, non diagnostiques, à confirmer par sept jours de carnet ;
- fin d'onboarding en deux temps : préparation de trois secondes avec le
  monogramme Haru, puis bilan et contrat d'observation des sept premiers jours ;
- contextes et freins perçus conservés séparément ;
- accompagnement professionnel demandé de manière facultative et non bloquante ;
- tabac conservé dans une branche indépendante du portrait alimentaire ;
- mini-test de Fagerström et SCOFF exclus de cette version ;
- portrait initial modifiable depuis Profil sans altérer les notes du carnet ;
- migration `20260716090000_initial_behavior_assessment.sql` appliquée à la base
  distante le 16 juillet 2026, avec historique local/distant aligné ;
- échelle comportementale simplifiée à quatre réponses : Jamais, Parfois,
  Souvent, Je ne sais pas encore ;
- questions reformulées sans répéter « parfois » dans leur intitulé ;
- validation des choix à avancement automatique par appui maintenu de 500 ms ;
- correction du blocage qui conservait l'état bleu d'une réponse sur les
  questions suivantes ;
- démarrage séquencé : logo et chargement 3 s, apparition du slogan pendant
  2 s, puis bouton Commencer ;
- choix d'accès avant l'onboarding : Google, lien email ou mode local limité à
  l'appareil ;
- retour d'authentification directement sur la première question du profil.

## 8. Backlog

### Chantier parallèle — Sport

Statut : première tranche isolée développée, validée et reliée à la navigation
principale par la route `/sport`. Le catalogue renforcé comprend désormais 36
familles et 101 variantes ; ces contenus restent `draft_unreviewed` jusqu'à leur
validation éditoriale et sécurité.

Première tranche validée :
- questionnaire dédié à la première ouverture de Sport ;
- profil, matériel, limitations et capacités multidimensionnelles ;
- bibliothèque étendue de renforcement, mobilité, équilibre, chaîne postérieure
  et conditionnement à faible impact, majoritairement sans matériel ;
- génération déterministe, versionnée et explicable ;
- aperçu, chronomètre, pause, reprise et fin de séance ;
- retour neutre, adaptation d’une seule variable à la fois et historique basique ;
- cinquième entrée `Sport` dans la barre de navigation basse ;
- stockage Sport encore local, mais cache cloisonné entre invité et comptes
  Supabase avant le futur raccordement cloud ;
- aucune calorie brûlée, IA décisionnelle, compétition ou diagnostic médical.

Itérations suivantes :
- marche et course progressives ;
- natation et mode bassin ;
- enrichissement des contenus après validation appropriée.

### Chantier principal — Recettes et Ciqual

Statut : premier MVP local livré dans une frontière de module dédiée. Il permet
de consulter le catalogue initial, ouvrir une fiche, créer, modifier et supprimer
une recette personnelle privée, et gérer les favoris. La persistance reste
isolée par invité/utilisateur sur l'appareil ; aucun cloud, paiement, partage
public ou calcul nutritionnel n'est encore branché.

Objectifs :
- [x] catalogue initial, recherche et fiches recettes ;
- [x] recettes personnelles privées locales ;
- [x] favoris locaux ;
- recettes privées et publiques avec propriété et RLS ;
- ingrédients structurés et import Ciqual reproductible ;
- adaptation des quantités au nombre de portions ;
- calcul nutritionnel explicite sur la fiche recette ;
- favoris, duplication et signalement ;
- ajout d’une portion au journal avec instantané immuable ;
- réutilisation future de Ciqual pour fiabiliser l’analyse qualitative du tunnel repas.

Le brief Recettes est un document de vision à découper en tranches verticales. Il ne doit pas être implémenté en un seul diff.

### Chantier d'architecture — modularisation

Objectif : sortir progressivement les écrans et contrôleurs métier de
`ProjetCentenaireApp.tsx`, sans recréer une seconde application ni réécrire la
tuyauterie fiable.

Statut au 16 juillet 2026 : huit tranches réalisées. Les écrans Aujourd’hui,
Carnet, Constats et Profil possèdent désormais des frontières dédiées. Le tunnel
Repas possède également son écran, son modèle de brouillon et ses règles de
progression testables. L’onboarding et l’éditeur du portrait comportemental
possèdent désormais leur état et leur modèle dans `src/features/onboarding/`.
La roue Poids possède son état dans Aujourd’hui et le panneau Tabac ainsi que les
règles de création des entrées quotidiennes sont isolés dans
`src/features/tracking/`. Le shell conserve les mutations, la session et la
synchronisation. Les écrans de chargement, réinitialisation et décision de
migration sont également isolés. Le cycle de session, le choix du cache invité
ou utilisateur, la reprise hors ligne, les pending et les décisions de migration
sont maintenant regroupés dans `src/features/session/useAppDataSession.ts`.
`ProjetCentenaireApp.tsx` est passé de 1 979 à 364 lignes. Il ne manipule plus
directement les générations cloud, les scopes de stockage, les brouillons Repas
ou Profil, les mutations Poids/Tabac, ni le cycle de démarrage. Les écrans
Aujourd’hui sont eux-mêmes séparés entre page, roue Poids et fil de journée ;
`TodayScreen.tsx` est passé de 900 à 173 lignes. Les contrôles génériques du
tunnel Repas sont également isolés sans modifier son ordre conditionnel. Ces
écrans émettent des intentions par callbacks et n’accèdent pas directement au stockage
ou à Supabase. Voir
[ARCHITECTURE.md](ARCHITECTURE.md).

Ordre recommandé :
- stabiliser les contrats Aujourd'hui, Repas et Carnet déjà intégrés ;
- extraire leurs contrôleurs, vues et helpers par domaine ;
- conserver un shell Haru mince pour la session, la navigation et le routage ;
- ajouter Recettes et les futurs modules dans des frontières indépendantes ;
- couvrir chaque extraction avant de supprimer l'ancien code.

Prochaine extraction : sous-composants internes des écrans Aujourd’hui, Repas et
Carnet, en conservant leur apparence et leurs contrats fonctionnels.

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

Statut :
- contrat produit et technique V0.3 validé et intégré à la documentation ;
- aucune interface finale, migration ou intégration applicative lancée ;
- prochaine étape : modèle V2 pur et adaptateur V1 en lecture seule.

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

### V1+ — Onboarding et profil comportemental

Objectif :
Repenser l’inscription comme une première lecture comportementale, progressive et
révisable. Elle ne doit ni poser de diagnostic psychologique, ni enfermer
l’utilisateur dans une catégorie fixe.

Spécification de travail : [ONBOARDING_V1.md](ONBOARDING_V1.md).

Statut : contrat produit implémenté dans une première version testable. Les
retouches finales, l'enrichissement de la branche Tabac et la validation terrain
restent à mener.

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
- explorer séparément les déclencheurs, le contexte, les émotions, l’automatisme,
  la faim, la satiété, la recherche de réconfort et la disposition au changement ;
- permettre plusieurs réponses lorsque plusieurs facteurs coexistent ;
- distinguer les réponses déclarées des faits ensuite observés dans le carnet ;
- rendre ces hypothèses modifiables et explicables à l’utilisateur ;
- ne pas donner trop de conseils avant d’avoir observé les faits.

Décision intermédiaire validée : la date de naissance se choisit avec trois
molettes tactiles ; sa valeur exacte n’est pas persistée et sert uniquement à
calculer l’âge actuel. La taille, le poids et l’objectif utilisent une molette
simple, et l’écran des freins accepte plusieurs sélections. Le modèle V0.7.1
conserve encore un frein principal pour la mission initiale ; la persistance du
profil multidimensionnel doit être conçue avant son exploitation métier ou cloud.

## 9. Idées parking

- Santé globale à terme, sans diluer le carnet comportemental.
- Module de motivation sans badges ni gamification superficielle.
- Meilleure lecture du contexte utilisateur : déplacement, hôtel, restaurant, voiture, stress.

## 10. Interdits actuels

Ne pas ajouter pour l’instant :
- réseau social généraliste, fil communautaire, commentaires ou messagerie ;
- paiement avant cadrage des droits d'accès, de la facturation et de la restauration d'achat ;
- IA complète ;
- notifications push ;
- Apple Health ;
- gamification ;
- objectif calorique quotidien, compteur de calories brûlées ou compensation repas/sport ;
- dashboard complexe.

## 11. Questions ouvertes

- Comment mesurer la quantité sans dépendre uniquement de la perception de l’utilisateur ?
- À quel moment intégrer l’IA ?
- Quelle place exacte donner au tabac ?
- Le bilan quotidien doit-il remplacer ou compléter le bilan hebdomadaire ?
- Comment rendre les constats directs sans paraître froids ou scientifiques ?
- Valider la proposition 18+, la formulation de l'IMC et les six décisions
  ouvertes de `docs/ONBOARDING_V1.md`.
- Faut-il une semaine d’observation obligatoire avant recommandations ?
- Quelle quantité de données nutritionnelles afficher hors des fiches recettes ?
- Comment relier une recette au tunnel repas sans transformer la saisie en formulaire nutritionnel ?
- Comment distribuer et mettre à jour Ciqual sans charger les nutriments dans le
  bundle initial mobile ?
- Quel fournisseur de paiement et quel modèle de droits utiliser pour Recettes,
  Sport et le bundle ?
- Quel premier lot du back-office brancher après validation du contrat
  `docs/ADMIN_BACKOFFICE.md` ?
