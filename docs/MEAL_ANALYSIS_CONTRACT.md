# Contrat d'Analyse Repas Haru

## Objet

Ce document fixe le contrat produit et technique du futur moteur d'analyse Repas.
Il ne décrit pas une IA et ne remplace pas encore tous les écrans existants. Il
définit le dossier factuel déterministe sur lequel les constats, les hypothèses
et, plus tard, l'IA conversationnelle pourront s'appuyer.

Règle centrale : Haru observe les habitudes alimentaires, il ne diagnostique pas
et ne classe pas l'utilisateur. Les calories, macros et valeurs nutritionnelles
issues de Ciqual restent absentes du journal quotidien.

## Sources Et Garde-Fous

- Ciqual 2025 est la table de composition nutritionnelle officielle de l'Anses :
  3 484 aliments, 74 constituants, DOI `10.57745/RDMHWY`, licence Etalab Open
  License 2.0. Source : https://doi.org/10.57745/RDMHWY et
  https://ciqual.anses.fr/cms/fr/la-table-ciqual-2025.
- Les principes comportementaux retenus restent généraux : observation,
  auto-suivi, objectifs vérifiables et retour d'information. Ils sont cohérents
  avec les recommandations institutionnelles NICE PH49 sur les changements de
  comportement individuels : https://www.nice.org.uk/guidance/ph49.
- Aucune règle médicale, psychologique ou nutritionnelle normative n'est
  fabriquée dans ce contrat.

## Séparation Des Couches

### Données brutes

- texte saisi par l'utilisateur ;
- date, heure et type de repas ;
- réponses explicites du tunnel ;
- quantités humaines : assiette, bol, portion, pièce, autre, inconnu ;
- passages successifs, reservice et contenu déclaré de la reprise ;
- contexte et raisons déclarées.

Les données brutes sont conservées même si Haru ne reconnaît pas un aliment.

### Données normalisées

- aliments confirmés avec `ciqualCode`, nom canonique, source et version ;
- aliments ambigus ou non reconnus ;
- quantité humaine structurée, sans conversion automatique en grammes ;
- source et confiance de chaque rapprochement.

Un toucher utilisateur confirme une suggestion. Une ambiguïté n'est jamais
confirmée automatiquement.

### Interprétation nutritionnelle

- uniquement interne ;
- seulement si un aliment Ciqual confirmé et une portion usuelle compatible et
  sourcée existent ;
- sortie en fourchette avec confiance ;
- absence d'estimation explicite si le texte, la portion ou la source manquent.

La composition sert de contexte secondaire. Elle ne devient jamais un verdict
visible `bon/mauvais`.

### Interprétation comportementale

- rythme et horaires ;
- fréquence des prises alimentaires ;
- quantité, passages et resservice ;
- faim avant, faim au reservice, sensation finale ;
- contexte déclaré : disponibilité, habitude, plaisir, stress, autres ;
- répétitions comparables dans le temps.

Cette couche reste distincte de la nutrition. Un repas riche avec faim réelle et
sensation correcte ne crée pas un problème. Un repas léger répété avec reprise
et inconfort garde un signal comportemental.

## Résultat Versionné

Le module `src/lib/mealAnalysisContract.ts` produit une structure versionnée :

- `version` : version du contrat ;
- `scope` : `meal`, `day` ou `week` ;
- `status` : `insufficient_data`, `descriptive`, `hypothesis` ou `experiment` ;
- `period` et `mealIds` ;
- `facts` : faits observables, avec compte, dénominateur, repas et dates ;
- `mainSignal` : signal principal éventuel ;
- `hypothesis` : hypothèse explicite, jamais présentée comme certitude ;
- `evidence` : preuves lisibles avec identifiants et dates ;
- `confidence` : `low`, `medium` ou `high` ;
- `action` : expérience éventuelle, mesurable la semaine suivante ;
- `absenceReasons` : raisons d'absence de conclusion ;
- `completeness` : champs manquants, réponses inconnues, aliments non résolus ;
- `nutritionDisplayPolicy` : toujours `internal_only`.

Absence de donnée signifie inconnu. Elle ne compte jamais comme un succès, un
échec ou une absence de problème.

## Niveaux De Lecture

### Repas isolé

Un repas isolé produit un constat descriptif. Il peut signaler que les données
sont incomplètes, mais il ne prouve pas une habitude et ne doit pas proposer de
correction. La composition alimentaire ne suffit pas à elle seule pour conclure.

### Journée

La journée résume les faits et peut marquer un signal à surveiller, par exemple
plusieurs reprises avec peu de faim dans la même journée. Elle ne pose pas de
causalité.

### Semaine consolidée

La semaine peut produire au maximum une hypothèse prioritaire et une petite
expérience vérifiable, uniquement si les données sont suffisantes et si la phase
d'observation initiale est passée.

Pendant les sept premiers jours de profil, Haru observe sans action corrective.
Le résultat reste descriptif même si un signal semble déjà apparaître.

## Axes D'Analyse

- `rhythm` : heure des repas et variabilité réelle ;
- `meal_frequency` : nombre de prises enregistrées ;
- `quantity_reservice` : passages, reprises et contenu des reprises ;
- `hunger_satiety` : faim avant, faim au reservice, sensation finale ;
- `context` : disponibilité, habitude, plaisir, stress, entourage ;
- `nutrition_context` : aliments reconnus et estimation interne prudente ;
- `data_quality` : données manquantes ou ambiguës.

## Contrat Déterministe / IA Future

Le moteur déterministe est la source des faits :

- périodes, repas, horaires, compteurs et fréquences ;
- aliments Ciqual confirmés, confiance et sources ;
- estimations internes et raisons de non-estimation ;
- seuils, preuves et statut du résultat.

L'IA future pourra reformuler, questionner ou aider l'utilisateur à explorer une
hypothèse. Elle ne devra pas modifier les faits, les seuils, les sources, les
identifiants utilisés ou la confiance calculée. Elle ne devra pas écrire ou
supprimer de donnée sans action explicite contrôlée.

## Migration Depuis L'Actuel

### `buildImmediateFinding`

Aujourd'hui, `buildImmediateFinding` mélange constat factuel, lecture et
micro-action immédiate. La migration proposée :

1. garder temporairement la fonction pour l'UX existante ;
2. utiliser `analyzeMeal` comme source de faits et de raisons d'absence de
   conclusion ;
3. remplacer progressivement `nextAction` par une formulation descriptive
   pendant les sept premiers jours ;
4. réserver les actions aux résultats hebdomadaires `experiment`.

### `calculateWeeklyAnalysis`

Aujourd'hui, `calculateWeeklyAnalysis` calcule une priorité hebdomadaire par
seuils simples. La migration proposée :

1. conserver ses champs publics tant que le Carnet en dépend ;
2. alimenter en parallèle `analyzeMealWeek` ;
3. mapper `Priority` depuis le résultat contractuel lorsque les écrans sont prêts
   à basculer ;
4. supprimer les anciennes priorités quand le Carnet lit directement le contrat.

### Carnet Et Journal Quotidien

Le Carnet peut afficher des faits et constats comportementaux. Il ne doit pas
afficher calories, macros ou valeurs nutritionnelles dans le suivi quotidien.
Les informations Ciqual restent disponibles pour l'analyse interne et pour les
futures recettes structurées.

## Scénarios Couverts Par Tests

- un seul repas : descriptif, aucune tendance ;
- première semaine : pas d'action corrective ;
- resservice répété sans faim : signal quantitatif documenté ;
- horaires variables : signal seulement avec plusieurs jours de preuve ;
- repas riche mais faim réelle et sensation correcte : pas de problème fabriqué ;
- repas léger mais reprise et inconfort répétés : signal comportemental conservé ;
- texte non reconnu ou portion inconnue : aucune estimation inventée ;
- données manquantes : résultat explicitement incomplet ;
- action proposée : mesurable et vérifiable la semaine suivante.

## Limites De Cette Passe

- le contrat est ajouté sans recâbler les écrans ;
- les seuils sont prudents et devront être ajustés avec les premiers usages ;
- les portions usuelles restent très limitées ;
- aucune IA n'est branchée ;
- aucune donnée nutritionnelle n'est affichée à l'utilisateur dans le journal.
