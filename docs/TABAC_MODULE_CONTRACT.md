# Haru - Contrat produit et technique du module Tabac

Statut : cadrage avant développement, à valider.

Version du document : 0.3 - 20 juillet 2026.

Ce document prépare la transformation de la saisie tabac actuelle en module
d'accompagnement neutre, utile et non culpabilisant. Il ne décrit pas une grosse
interface finale et ne crée aucune migration, aucun écran, aucun branchement et
aucune décision d'abonnement.

## 1. Intention

Le module Tabac aide l'utilisateur à observer ce qui se passe réellement :
jours explicitement sans cigarette, envies fortes, cigarettes fumées, moments,
contextes et tendances prudentes.

Haru ne diagnostique pas une dépendance, ne note pas la volonté, ne promet pas
un arrêt, ne prescrit pas de traitement et ne remplace pas un professionnel de
santé. Le rôle du module est de rendre les faits plus lisibles, de formuler des
hypothèses prudentes et de proposer, après une période descriptive suffisante,
une petite action observable.

## 2. Périmètre de cette passe

Inclus dans ce contrat :

- vocabulaire produit ;
- états métier et état effectif de journée ;
- onboarding tabac court ;
- événements, déclencheurs et contextes ;
- bilans quotidien et hebdomadaire ;
- modèle de données cible versionné ;
- compatibilité avec les événements et les anciens clients ;
- stratégie de migration future ;
- confidentialité et consentement ;
- garde-fous santé ;
- scénarios d'acceptation.

Exclu de cette passe :

- écran final du module ;
- nouvelle navigation ;
- migration Supabase ;
- changement de stockage local ou cloud ;
- branchement à Repas, Profil, Aujourd'hui ou Carnet ;
- paiement, abonnement ou droits d'accès ;
- IA, notifications ou analyse multi-semaines avancée.

## 3. Sources produit et code actuelles

Le socle actuel à respecter :

- `docs/PRODUCT_BOARD.md` : Haru observe les faits, sans jugement, et le tabac
  doit devenir un vrai module plus tard ;
- `docs/ONBOARDING_V1.md` : branche tabac courte, indépendante du portrait
  alimentaire ;
- `src/features/tracking/SmokingPanel.tsx` : saisie rapide `Aucun`, `Envie
  forte`, `Cigarette`, déclencheur facultatif ;
- `src/features/tracking/dailyTrackingModel.ts` : création d'une
  `SmokingEntry` ;
- `src/lib/types.ts` : `SmokingDayState = "aucun" | "envie" | "cigarette"` ;
- `src/lib/dataStabilization.ts` : un seul `aucun` explicite par date, retiré
  lorsqu'une envie ou une cigarette existe le même jour ;
- `src/lib/analytics.ts` : les jours sans tabac sont comptés seulement à partir
  des `aucun` explicites, jamais à partir d'une absence de données ;
- `src/services/tobaccoService.ts` et `supabase/schema.sql` : table
  `tobacco_events` avec `event_date`, `event_type`, `trigger`, `note` et
  `created_at`.

## 4. Principes non négociables

- Distinction stricte entre absence de donnée et déclaration explicite.
- Une envie forte n'est pas un échec.
- Une cigarette fumée est un fait, pas une faute.
- `Aucun` n'est pas une vérité mutable : c'est une déclaration utilisateur, puis
  un état effectif calculé à la lecture.
- Un jour sans cigarette doit être explicitement déclaré pour être compté.
- Un jour non renseigné ne devient jamais automatiquement un jour sans
  cigarette.
- Haru peut relier des faits proches dans le temps, mais ne fabrique jamais de
  causalité.
- Les hypothèses doivent rester réfutables par les données suivantes.
- Les bilans parlent d'indices observés, jamais de certitude médicale ou
  causale.
- Une `confiance élevée` concerne uniquement la répétition observée dans les
  données Haru ; elle ne signifie jamais que la cause est établie.
- Les messages santé orientent vers un professionnel sans alarmer inutilement.
- Le module reste compatible avec les données existantes et avec les anciens
  clients.
- Les jours 1 à 7 restent strictement descriptifs ; aucune expérience
  corrective n'est proposée avant le jour 8, sauf demande explicite de
  l'utilisateur.
- Les anciennes déclarations `Aucun` déjà perdues par le modèle v1 sont
  irrécupérables et ne doivent jamais être réinventées par inférence.

## 5. Cadrage tabac V1

La V1 du module concerne uniquement les cigarettes combustibles déclarées par
l'utilisateur.

Inclus :

- cigarette fumée ;
- épisode de cigarettes si l'utilisateur le saisit comme tel plus tard ;
- envie forte de cigarette ;
- déclaration de journée sans cigarette combustible.

Exclu de la V1 :

- vapotage ;
- tabac chauffé ;
- nicotine sous forme de substitut ;
- cannabis ou autres substances ;
- dosage de substituts ;
- diagnostic de dépendance.

La saisie actuelle garde la règle simple : un appui sur `Cigarette` vaut une
cigarette. Une version ultérieure pourra séparer explicitement le nombre
d'événements fumés et le nombre de cigarettes dans chaque événement.

## 6. Vocabulaire métier

### Non renseigné

Signifie : Haru ne sait pas ce qui s'est passé pour cette journée ou ce moment.

Représentation actuelle : absence d'événement tabac sur la date.

Règle : ne jamais afficher comme réussite, échec, jour sans cigarette, envie ou
cigarette.

### Aucun

Signifie : l'utilisateur a déclaré explicitement qu'il n'a pas fumé de cigarette
combustible sur une journée donnée.

Règle cible : `Aucun` est une déclaration de journée. L'état effectif
`jour sans cigarette` est dérivé à la lecture.

Conséquences :

- `Aucun` peut coexister avec une ou plusieurs envies fortes ;
- `Aucun` ne peut pas coexister avec une cigarette dans l'état effectif ;
- si une cigarette existe déjà sur la même date, une nouvelle déclaration
  `Aucun` ne devient pas active ;
- si une cigarette est ajoutée après `Aucun`, le jour n'est plus compté comme
  sans cigarette ;
- si la cigarette est supprimée ou déplacée vers une autre date, la déclaration
  `Aucun` peut redevenir active ;
- si l'heure ou la date d'un événement change, l'état effectif doit être
  recalculé pour l'ancienne date et la nouvelle date ;
- en cas d'ordre hors ligne ou de restauration, le calcul repose sur l'ensemble
  des événements disponibles, pas seulement sur leur ordre d'arrivée réseau.

### Envie forte

Signifie : l'utilisateur a ressenti une envie notable de fumer.

Règle : ne compte pas comme cigarette et n'annule pas un jour sans cigarette si
aucune cigarette n'est enregistrée ce jour-là.

### Cigarette

Signifie : l'utilisateur déclare avoir fumé une cigarette combustible.

Règle cible : une cigarette annule le statut effectif `jour sans cigarette` pour
la date concernée. Elle n'annule pas l'intérêt de noter les envies, les
contextes ou ce qui a aidé ensuite.

## 7. Onboarding tabac cible

L'onboarding tabac doit rester court : deux questions obligatoires maximum, une
question optionnelle si utile. Il ne doit produire aucun diagnostic.

### Question 1 - Situation actuelle

Question : `Aujourd'hui, quelle est ta situation avec la cigarette ?`

Choix :

- `Je ne fume pas`
- `Je viens d'arrêter`
- `Je fume occasionnellement`
- `Je fume tous les jours`
- `Je préfère renseigner plus tard`

Mapping compatible :

| Choix visible | Profil actuel |
| --- | --- |
| Je ne fume pas | `smokingStatus = "non"` |
| Je viens d'arrêter | `smokingStatus = "arrete"` |
| Je fume occasionnellement | `smokingStatus = "occasionnellement"` |
| Je fume tous les jours | `smokingStatus = "tous-les-jours"` |
| Je préfère renseigner plus tard | `smokingStatus = "non-renseigne"` |

### Question 2 - Intention

Affichée pour `Je fume occasionnellement` et `Je fume tous les jours`.

Question : `Qu'est-ce qui serait utile pour commencer ?`

Choix :

- `Arrêter`
- `Réduire`
- `Observer d'abord`
- `Pas maintenant`

Mapping compatible :

| Choix visible | Profil actuel |
| --- | --- |
| Arrêter | `smokingGoal = "arreter"` |
| Réduire | `smokingGoal = "reduire"` |
| Observer d'abord | `smokingGoal = "observer"` |
| Pas maintenant | `smokingGoal = "pas-maintenant"` |

Règle importante : `Pas maintenant` ne signifie pas masquer ou supprimer la
saisie. L'utilisateur peut continuer à noter `Aucun`, `Envie forte` ou
`Cigarette` s'il le souhaite. Cette intention signifie seulement que Haru ne
doit pas pousser d'accompagnement actif.

Pour `Je viens d'arrêter`, l'expérience par défaut doit privilégier :

- déclaration de jours sans cigarette ;
- envies fortes ;
- contextes qui fragilisent ou aident ;
- messages sobres, sans série de performance ni relance culpabilisante.

### Question 2 bis - Branche Je viens d'arrêter

Affichée uniquement pour `Je viens d'arrêter`.

Question : `Qu'est-ce qui serait utile maintenant ?`

Choix :

- `Suivre mes envies`
- `Pas maintenant`

Règles :

- ne pas reproposer `Arrêter`, car l'utilisateur vient déjà de déclarer l'arrêt ;
- `Suivre mes envies` active la saisie descriptive des envies et jours sans
  cigarette ;
- `Pas maintenant` laisse la saisie disponible mais ne pousse aucun
  accompagnement actif ;
- compatibilité temporaire possible : `Suivre mes envies` peut être persisté en
  `smokingGoal = "observer"` tant qu'un modèle de profil dédié n'existe pas.

### Question 3 optionnelle - Repère de départ

Affichée seulement après validation explicite, sans bloquer la fin de
l'onboarding.

Question : `Tu veux donner un repère de départ ?`

Choix courts, non diagnostiques :

- `Moins de 5 cigarettes par jour`
- `5 à 10`
- `11 à 20`
- `Plus de 20`
- `Je ne sais pas`
- `Passer`

Cette réponse sert uniquement à contextualiser les bilans. Elle ne doit pas
produire de score, de niveau de dépendance ou de message médical automatisé.

### À ne pas faire dans l'onboarding V1 tabac

- mini-test de Fagerström sans validation médicale et UX préalable ;
- score de dépendance ;
- injonction d'arrêt ;
- promesse de bénéfices datés ;
- question culpabilisante sur la volonté ;
- question longue sur l'historique complet ;
- fermeture de la saisie parce que l'objectif est `pas-maintenant`.

## 8. Événements, état de journée et déclencheurs

Le module cible distingue trois lectures.

### Déclaration de journée

`day_declaration` représente une déclaration datée :

- `no_cigarette` : aucune cigarette combustible déclarée ce jour ;
- `superseded` : déclaration sans cigarette rendue inactive par une cigarette
  sur la même date.

La déclaration `no_cigarette` doit être unique par utilisateur et par date dans
la lecture active. Elle peut exister historiquement même si l'état effectif du
jour n'est plus `sans cigarette`.

### État effectif de journée

L'état de journée est calculé à la lecture :

- `unreported` : aucun fait tabac disponible pour cette date ;
- `no_cigarette_declared` : déclaration `Aucun` active, sans cigarette sur la
  date ;
- `urge_only` : envie forte sans cigarette et sans déclaration `Aucun` ;
- `smoked` : au moins une cigarette sur la date ;
- `mixed_without_smoking` : déclaration `Aucun` active avec une ou plusieurs
  envies fortes, sans cigarette.

`unreported` est dérivé uniquement et ne doit jamais être stocké comme
événement.

### Chronologie

La chronologie affiche les événements ponctuels :

- `urge` : envie forte ;
- `smoked` : cigarette combustible.

La déclaration `Aucun` appartient à l'état de journée, pas à la chronologie
d'événements, sauf si une vue historique spécifique est validée plus tard.

### Événement ponctuel

Chaque événement garde :

- date ;
- heure ;
- type ;
- compteur optionnel pour `smoked`, par défaut 1 dans la lecture cible ;
- intensité optionnelle pour `urge`, par exemple faible, moyenne, forte ;
- contexte optionnel ;
- note libre optionnelle ;
- source : utilisateur, import ou migration.

### Déclencheurs et contextes

La liste initiale doit rester courte et modifiable :

- stress ;
- après repas ;
- café ou boisson ;
- voiture ou déplacement ;
- travail ;
- hôtel ou voyage ;
- solitude ;
- ennui ;
- soirée ou contexte social ;
- fatigue ;
- autre.

Un déclencheur est une déclaration utilisateur ou une proximité temporelle
observée. Haru ne doit pas afficher `le repas a causé la cigarette`. Formulation
autorisée : `2 cigarettes ont été notées dans l'heure après un repas cette
semaine. C'est une piste à vérifier.`

## 9. Liens avec repas, stress et contexte

Le module peut rapprocher des faits lorsque les données existent déjà et lorsque
l'utilisateur a consenti à ce rapprochement.

### Consentement repas-tabac

Le consentement doit être versionné, daté, révocable et limité à une portée
explicite. Il ne peut pas être implicite dans l'acceptation générale des
conditions d'utilisation.

Modèle conceptuel :

```ts
interface TobaccoMealLinkConsent {
  schemaVersion: 1;
  scope: "meal_tobacco_time_proximity";
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  source: "onboarding" | "settings" | "inline_prompt";
}
```

Portée autorisée :

- calculer à la lecture une proximité temporelle entre repas et événements tabac
  dans la fenêtre validée ;
- afficher des indices observés agrégés dans Aujourd'hui ou Carnet ;
- ne jamais analyser les notes libres pour produire un rapprochement.

Après révocation :

- aucun nouveau calcul croisé repas-tabac ;
- disparition de tous les indices et corrélations dérivés de l'interface ;
- conservation des événements sources repas et tabac ;
- conservation seulement de l'historique minimal du consentement si nécessaire
  au respect légal ou technique ;
- aucun recalcul rétroactif tant qu'un nouveau consentement n'est pas donné.

Consentement requis avant tout rapprochement repas-tabac :

- pas d'IA ;
- pas de corrélation repas-tabac ;
- pas d'analyse de notes libres pour trouver un contexte repas ;
- pas d'affichage de piste croisée.

Liens autorisés après consentement :

- événement tabac dans une fenêtre de 60 minutes après un repas ;
- événement tabac avant un repas, si l'utilisateur l'a noté explicitement ;
- déclencheur déclaré `stress`, `fatigue`, `ennui` ou `après repas` ;
- contexte de repas déjà observé, par exemple grignotage de contexte ;
- lien repas-tabac explicitement déclaré par l'utilisateur.

Règles de persistance :

- la proximité repas-tabac est calculée à la lecture ;
- la fenêtre recommandée est 60 minutes ;
- une relation calculée par proximité ne doit pas être persistée comme lien
  durable ;
- seul un lien explicitement déclaré par l'utilisateur peut être persisté ;
- le stockage d'un lien explicite doit conserver son type d'indice :
  `user_declared`.

Règles de prudence :

- parler de cooccurrence, proximité, répétition, piste ou indice observé ;
- afficher le nombre d'occurrences et le nombre de jours observés ;
- ne pas conclure à une cause ;
- ne pas inférer un état psychologique non déclaré ;
- ne pas relier automatiquement tabac et alimentation comme compensation.

Exemples de formulations :

- `Fait : 3 envies fortes ont été notées après le dîner cette semaine.`
- `Hypothèse : le moment après repas mérite peut-être d'être observé.`
- `Confiance : faible, car cela repose sur 2 jours renseignés.`
- `Indice observé : 3 événements sur 7 sont proches d'un repas.`

## 10. Jours 1 à 7 et expériences

Les sept premiers jours du module Tabac sont strictement descriptifs.

Origine des sept jours calendaires :

- si le suivi tabac est activé pendant l'onboarding, le jour 1 est la date de
  départ du profil ;
- si le suivi tabac est activé plus tard, le jour 1 est
  `tobaccoTrackingStartedAt` ;
- la période se termine à la fin du septième jour calendaire ;
- les jours non renseignés ne prolongent pas indéfiniment la phase descriptive.

Pendant les jours 1 à 7 :

- afficher les faits saisis ;
- distinguer clairement non renseigné, aucun, envie forte et cigarette ;
- compter les dates uniques explicitement sans cigarette ;
- ne pas proposer d'expérience corrective ;
- ne pas pousser d'objectif d'arrêt ou de réduction ;
- ne pas relancer comme si l'utilisateur avait échoué ;
- autoriser seulement une aide demandée explicitement par l'utilisateur.

À partir du jour 8, Haru peut proposer une petite expérience vérifiable si :

- l'utilisateur n'a pas choisi `pas-maintenant`, ou il demande explicitement une
  aide ;
- au moins 3 jours sont renseignés ;
- le bilan indique le niveau de confiance ;
- l'expérience reste courte, concrète et compatible avec le fait de fumer quand
  même.

Exemples autorisés à partir du jour 8 :

- `Demain, quand une envie forte arrive, note seulement le contexte avant de
  décider.`
- `Pendant deux repas, observe si l'envie arrive dans l'heure qui suit.`
- `Sur le prochain trajet, note l'envie même si elle passe toute seule.`
- `Si tu fumes, note simplement le moment et le contexte.`

Exemples interdits :

- `Ne fume pas demain.`
- `Tiens bon.`
- `Remplace toujours la cigarette par autre chose.`
- `Tu dois éviter le stress.`

## 11. Bilans Aujourd'hui, Carnet et semaine

### Aujourd'hui

La page Aujourd'hui doit séparer :

- état de journée tabac ;
- chronologie des envies et cigarettes.

États attendus :

#### Non renseigné

`Tabac non renseigné aujourd'hui. Haru ne déduit rien de cette absence.`

#### Aucun explicite, sans envie

`Aucune cigarette déclarée aujourd'hui.`

#### Aucun explicite, avec envie

`Aucune cigarette déclarée aujourd'hui, avec 1 envie forte notée. L'envie compte
comme une information utile, pas comme un échec.`

#### Envie seule

`1 envie forte notée aujourd'hui. Aucune cigarette n'est déduite.`

#### Cigarette

`2 cigarettes déclarées aujourd'hui. Le contexte le plus noté : après repas.`

#### Données mixtes ou contradiction

Si `Aucun` a été déclaré puis une cigarette ajoutée ensuite :

`La journée n'est plus comptée comme sans cigarette, car une cigarette a été
notée ensuite. La déclaration initiale reste un fait historique mais n'entre pas
dans le compteur de jours sans cigarette.`

### Carnet jour

Le Carnet en lecture quotidienne doit afficher :

- l'état effectif de la journée ;
- les envies fortes ;
- les cigarettes ;
- les déclencheurs déclarés ;
- les éventuels indices observés, si le consentement existe ;
- aucune conclusion causale.

### Carnet semaine

Le bilan hebdomadaire doit compléter le bilan Repas sans le remplacer.

Indicateurs autorisés :

- couverture : nombre de jours renseignés sur la période ;
- dates uniques explicitement sans cigarette ;
- envies fortes ;
- cigarettes, avec V1 `un appui = une cigarette` ;
- déclencheurs déclarés les plus fréquents ;
- indices observés avec repas ou contextes, si consentement ;
- hypothèse principale à vérifier ;
- niveau de confiance ;
- petite expérience proposée seulement à partir du jour 8 ou sur demande
  explicite.

Indicateurs interdits pour cette version :

- score de dépendance ;
- note de performance ;
- série culpabilisante ;
- classement ;
- économies ou bénéfices santé chiffrés non validés dans ce contrat ;
- prédiction de réussite.

Exemple après le jour 8 :

```text
Cette semaine, 5 jours sur 7 ont été renseignés.
2 dates ont été déclarées sans cigarette.
4 envies fortes et 3 cigarettes ont été notées.
Indice observé : 3 événements sur 7 apparaissent dans l'heure après un repas.
Hypothèse : le moment après repas pourrait être une zone utile à observer.
Confiance : moyenne, car 5 jours sont renseignés mais l'échantillon reste court.
Petite expérience : pendant 2 soirs, noter l'envie avant la cigarette ou avant
qu'elle passe.
```

## 12. Faits, hypothèses, indices observés et confiance

Tout constat tabac doit être structuré ainsi :

| Niveau | Définition | Exemple |
| --- | --- | --- |
| Fait | donnée explicitement saisie ou dérivée mécaniquement | `2 cigarettes notées le 18 juillet` |
| Hypothèse | interprétation prudente à vérifier | `le trajet retour semble être un moment à observer` |
| Indices observés | données qui soutiennent l'hypothèse sans prouver une cause | `3 événements sur 4 avec contexte voiture` |
| Confiance | faible, moyenne ou élevée | `faible si moins de 3 jours renseignés` |
| Expérience | action simple, observable et réversible | `noter l'envie avant d'agir demain soir` |

Règles de confiance proposées :

- `faible` : moins de 3 jours renseignés, moins de 3 événements pertinents ou
  données contradictoires ;
- `moyenne` : au moins 3 jours renseignés et une répétition claire ;
- `élevée` : au moins 7 jours calendaires écoulés depuis le départ du suivi,
  données renseignées sur plusieurs jours, répétition claire et déclencheur
  déclaré par l'utilisateur.

Même avec une confiance élevée, Haru parle d'une répétition observée et d'une
piste, pas d'une cause.

## 13. Confidentialité et consentement

Les données tabac sont des données sensibles de comportement de santé. Le module
doit appliquer le principe de minimisation.

Contraintes :

- RLS obligatoire sur toute table cloud tabac ;
- lecture et écriture limitées au propriétaire ;
- stockage local cloisonné par scope invité ou `userId`, sans mélange entre
  comptes ;
- export utilisateur complet incluant les données tabac ;
- suppression utilisateur complète incluant les données tabac ;
- rétention à définir avant production, avec suppression effective au-delà de la
  durée retenue si une politique de rétention est adoptée ;
- tombstone temporaire autorisé pour propager une suppression pendant la
  synchronisation ;
- effacement définitif requis lors d'une suppression de compte ou à la fin de la
  rétention validée ;
- accès admin absent ou minimal, agrégé et non nominatif tant qu'un vrai cadre
  support n'est pas validé ;
- aucun affichage admin de notes libres tabac par défaut ;
- aucune note libre tabac dans les logs applicatifs, analytics, erreurs ou
  journaux de debug ;
- pas d'IA sur les données tabac sans consentement explicite ;
- pas de rapprochement repas-tabac sans consentement explicite ;
- pas d'utilisation commerciale ou publicitaire des déclencheurs tabac.

Les notes libres doivent rester facultatives. Les déclencheurs structurés sont à
privilégier pour limiter la collecte de texte sensible.

## 14. Garde-fous santé

Haru doit rappeler sobrement qu'un accompagnement professionnel peut aider,
surtout lorsque l'utilisateur veut arrêter ou réduire, demande de l'aide, utilise
un bouton d'aide ou répond à une question structurée prévue pour l'orientation.

En V1, Haru ne détecte pas automatiquement la détresse dans les notes libres.
Les notes libres ne déclenchent ni classification de risque, ni message santé,
ni alerte.

Les messages d'orientation santé ne s'affichent qu'après une demande explicite
de l'utilisateur, un bouton d'aide ou une réponse structurée prévue pour
l'orientation. Le simple contenu d'une note libre ne suffit jamais.

Messages autorisés :

- `Haru ne remplace pas un professionnel de santé. Si tu veux arrêter ou réduire,
  un médecin, pharmacien, sage-femme, infirmier, tabacologue ou autre
  professionnel habilité peut t'aider à choisir une stratégie adaptée.`
- `Si l'arrêt provoque une détresse importante, des symptômes physiques
  inquiétants ou une rechute difficile à vivre, demande un avis professionnel.`
- `En France, Tabac info service propose une aide dédiée au 39 89 et sur
  tabac-info-service.fr.`

Références utilisées pour cette orientation :

- Assurance Maladie, pages 2025 sur les substituts nicotiniques et
  l'accompagnement par des professionnels de santé ;
- Service-Public.fr, fiche 2025 du 39 89 Tabac info service ;
- Santé publique France, page d'information Tabac info service.

À ne pas faire :

- recommander une dose de substitut nicotinique ;
- recommander ou déconseiller un médicament ;
- gérer une grossesse, une pathologie cardiaque ou respiratoire, ou une
  addiction complexe ;
- présenter le vapotage comme traitement médical ;
- afficher une urgence médicale automatisée sans parcours validé ;
- détecter automatiquement une détresse ou un risque dans une note libre.

## 15. Modèle de données cible

Le modèle cible est versionné et séparé de la saisie actuelle.

Identifiants :

- chaque enregistrement V2 doit avoir un identifiant stable généré côté client ;
- l'identifiant doit survivre aux reprises hors ligne et aux synchronisations ;
- `legacyKey` est facultatif pour relier un enregistrement à une donnée V1 ;
- la migration ne doit pas promettre la conservation littérale des IDs V1, car
  les formats actuels peuvent être incompatibles avec le stockage cible ;
- la déduplication doit utiliser l'identifiant V2 stable, puis `legacyKey` si
  nécessaire.

```ts
type TobaccoRecordVersion = 2;

type TobaccoRecord =
  | TobaccoDayDeclaration
  | TobaccoMomentEvent;

interface TobaccoBaseRecord {
  schemaVersion: TobaccoRecordVersion;
  id: string;
  legacyKey?: string;
  userId?: string;
  date: ISODate;
  time?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  deletionSyncUntil?: string;
  source: "user" | "import" | "migration";
}

interface TobaccoDayDeclaration extends TobaccoBaseRecord {
  kind: "day_declaration";
  declaration: "no_cigarette";
}

interface TobaccoMomentEvent extends TobaccoBaseRecord {
  kind: "event";
  event: "urge" | "smoked";
  count?: number;
  intensity?: "low" | "medium" | "high";
  triggers: TobaccoTrigger[];
  note?: string;
  relatedMealId?: string;
  relationEvidence?: "user_declared";
}
```

Types de contexte proposés :

```ts
type TobaccoTrigger =
  | "stress"
  | "after-meal"
  | "coffee-drink"
  | "car-travel"
  | "work"
  | "hotel-travel"
  | "alone"
  | "boredom"
  | "social"
  | "fatigue"
  | "other";
```

Ce modèle est conceptuel pour le développement futur. Il ne doit pas être
branché dans cette passe.

`deletedAt` et `deletionSyncUntil` représentent un tombstone temporaire de
synchronisation, pas une rétention durable. Une suppression de compte doit
effacer définitivement les enregistrements sources et les tombstones associés
selon la procédure de suppression validée.

## 16. Compatibilité avec les événements actuels et anciens clients

Les événements actuels restent valides :

```ts
interface SmokingEntry {
  id: string;
  date: ISODate;
  time: string;
  state: "aucun" | "envie" | "cigarette";
  note?: string;
  createdAt: string;
}
```

Mapping de lecture v1 vers v2 :

| v1 `state` | v2 cible | Règle |
| --- | --- | --- |
| `aucun` | `day_declaration/no_cigarette` | déclaration explicite de journée sans cigarette |
| `envie` | `event/urge` | envie forte ponctuelle |
| `cigarette` | `event/smoked` | cigarette combustible ponctuelle, `count = 1` par défaut |

Mapping des champs :

| Champ v1 | Champ v2 |
| --- | --- |
| `id` | `legacyKey` ou composant d'une clé de migration |
| `date` | `date` |
| `time` | `time` |
| `createdAt` | `createdAt` |
| `note` | `triggers` si valeur connue, sinon `note` |

Règles de compatibilité impératives :

- ne jamais écrire `urge`, `smoked`, `day_declaration`, `no_cigarette` ou tout
  autre type V2 dans la colonne v1 `event_type` si un ancien lecteur peut le
  transformer silencieusement en `aucun` ;
- préférer une table V2 dédiée ou des colonnes additives clairement versionnées ;
- les anciens clients doivent continuer à lire seulement `aucun`, `envie` et
  `cigarette` ;
- les nouveaux lecteurs doivent ignorer tout type inconnu au lieu de le
  normaliser en `aucun` ;
- les anciens événements v1 doivent rester lisibles pendant toute la période de
  transition ;
- aucune migration ne doit réduire la précision d'une cigarette ou d'une envie
  en journée sans cigarette.

Limite actuelle à corriger plus tard :

Le stabilisateur v1 retire `aucun` lorsqu'une envie existe le même jour. Le
modèle cible doit permettre `no_cigarette` + `urge` sur la même date, car une
envie forte n'est pas une cigarette.

## 17. Stratégie de migration future

La migration future doit être additive et réversible en lecture :

1. Ajouter une couche d'adaptation pure qui lit v1 et expose un modèle v2 dérivé.
2. Tester tous les scénarios de compatibilité sans modifier la base.
3. Choisir entre table V2 dédiée et colonnes additives versionnées.
4. Écrire les nouveaux événements en V2 sans utiliser les valeurs V2 dans la
   colonne v1 `event_type`.
5. Garder la lecture v1 jusqu'à la fin d'une version stable.
6. Migrer les données existantes par lot, avec `legacyKey` lorsque c'est utile.
7. Définir la suppression et la restauration avant de brancher l'édition.

Contraintes de migration :

- ne jamais transformer une absence de données en `no_cigarette` ;
- ne jamais inférer ou recréer une ancienne déclaration `Aucun` qui aurait été
  perdue par la stabilisation v1 ;
- conserver les `created_at` pour l'ordre historique ;
- ne pas supprimer les anciennes notes libres ;
- recalculer l'état effectif après ajout, suppression, restauration, import,
  changement de date, changement d'heure et synchronisation hors ligne ;
- ne pas créer de relation repas-tabac rétroactive sans consentement et sans
  déclaration explicite ;
- ne pas modifier les contrats Repas, Sport, Recettes, Profil, Supabase ou
  stockage pendant le cadrage.

## 18. Règles de calcul

### Jour renseigné

Une date est renseignée si elle contient au moins :

- une déclaration `no_cigarette`, active ou rendue inactive par cigarette ;
- une envie forte ;
- une cigarette.

### Jour sans cigarette

Une date compte comme jour sans cigarette si :

- l'utilisateur a déclaré explicitement `no_cigarette` ;
- aucune cigarette `smoked` active n'existe sur la même date.

Une envie forte ne retire pas ce statut.

### Nombre d'événements et nombre de cigarettes

La V1 confond volontairement les deux :

- un appui `Cigarette` = un événement ;
- un appui `Cigarette` = une cigarette combustible ;
- un appui `Envie forte` = un événement d'envie ;
- aucun compteur avancé n'est affiché.

La V2 doit préparer la séparation :

- nombre d'événements fumés ;
- nombre de cigarettes dans chaque événement ;
- somme des cigarettes sur la période.

Par défaut :

- v1 `cigarette` vaut 1 cigarette ;
- v2 `count` absent vaut 1 ;
- `count` ne peut pas être inférieur à 1.

### Déclencheur dominant

Un déclencheur peut être affiché comme dominant seulement si :

- il apparaît au moins 2 fois ;
- il représente au moins 40 % des événements renseignés sur la période ;
- les données couvrent au moins 2 jours.

Sinon, Haru affiche seulement des faits bruts.

## 19. Gratuit, futur et abonnement

Ce contrat ne décide aucun abonnement.

À garder dans le socle gratuit tant que la page Aujourd'hui reste gratuite :

- noter `Aucun`, `Envie forte`, `Cigarette` ;
- voir le résumé du jour ;
- compter les jours explicitement sans cigarette ;
- voir les envies et cigarettes dans la chronologie du jour ;
- exporter et supprimer les données tabac ;
- recevoir les garde-fous santé de base.

À réserver à une validation produit future :

- bilans tabac multi-semaines avancés ;
- expériences guidées sur plusieurs semaines ;
- bibliothèque de stratégies ;
- notifications ;
- synchronisation avec objets connectés ou applications tierces ;
- accompagnement IA ;
- contenus premium ;
- logique d'abonnement.

Toute limite commerciale devra préserver l'accès aux données déjà saisies et ne
pas transformer une aide santé de base en pression commerciale.

## 20. Scénarios d'acceptation

### Distinction des états

- Étant donné une journée sans événement tabac, quand le bilan s'affiche, alors
  l'état est `Non renseigné` et aucun jour sans cigarette n'est compté.
- Étant donné une déclaration `Aucun`, quand le bilan s'affiche, alors le jour
  est compté comme explicitement sans cigarette.
- Étant donné une `Envie forte` sans cigarette, quand le bilan s'affiche, alors
  aucune cigarette n'est comptée.
- Étant donné une `Cigarette`, quand le bilan s'affiche, alors au moins une
  cigarette combustible est comptée.

### Aucun et état effectif

- Étant donné deux déclarations `Aucun` sur la même date, quand la semaine est
  calculée, alors une seule date sans cigarette est comptée.
- Étant donné `Aucun` puis `Envie forte` sur la même date en V2, quand la
  semaine est calculée, alors la date reste un jour sans cigarette.
- Étant donné `Aucun` puis `Cigarette` sur la même date, quand la semaine est
  calculée, alors la date n'est plus un jour sans cigarette.
- Étant donné une `Cigarette` existante sur une date, quand l'utilisateur crée
  ensuite une déclaration `Aucun` sur cette même date, alors l'état effectif
  reste `smoked`.
- Étant donné une cigarette supprimée ou restaurée, quand le bilan est recalculé,
  alors l'état de la date est recalculé à partir des événements actifs.
- Étant donné une cigarette déplacée vers une autre date, quand le bilan est
  recalculé, alors l'ancienne date et la nouvelle date sont toutes les deux
  recalculées.
- Étant donné des événements arrivés dans un ordre différent après une
  synchronisation hors ligne, quand le bilan est lu, alors l'état effectif dépend
  des faits actifs sur la date, pas de l'ordre d'arrivée.
- Étant donné une ancienne déclaration `Aucun` supprimée par la stabilisation v1,
  quand l'adaptateur V2 lit les données historiques, alors il ne recrée pas cette
  déclaration par inférence.

### Compatibilité v1 et anciens clients

- Étant donné une entrée v1 `aucun`, quand l'adaptateur V2 la lit, alors elle
  devient une déclaration de journée `no_cigarette`.
- Étant donné une entrée v1 `envie` avec note `stress`, quand l'adaptateur V2 la
  lit, alors elle devient un événement `urge` avec déclencheur `stress`.
- Étant donné une entrée v1 `cigarette` sans compteur, quand l'adaptateur V2 la
  lit, alors elle devient un événement `smoked` avec `count = 1`.
- Étant donné un ancien client qui lit `event_type`, quand une version V2 écrit,
  alors elle n'a pas écrit `urge` ou `smoked` dans cette colonne v1.
- Étant donné un lecteur V2 qui rencontre un type inconnu, quand il normalise les
  données, alors il ignore l'entrée inconnue et ne la transforme pas en `aucun`.
- Étant donné une migration V1 vers V2, quand l'ID V1 n'est pas compatible avec
  l'ID cible, alors un nouvel ID V2 stable est créé et l'ancien identifiant peut
  être conservé dans `legacyKey`.

### Nombre de cigarettes

- Étant donné trois appuis v1 sur `Cigarette`, quand le jour est calculé, alors
  le bilan affiche 3 cigarettes combustibles.
- Étant donné un événement V2 `smoked` avec `count = 4`, quand la semaine est
  calculée, alors il compte pour 1 événement fumé et 4 cigarettes.
- Étant donné un événement V2 `smoked` sans `count`, quand la semaine est
  calculée, alors il compte pour 1 cigarette.

### Onboarding et intention

- Étant donné un utilisateur qui choisit `Je viens d'arrêter`, quand
  l'onboarding se termine, alors la saisie des jours sans cigarette et des envies
  reste disponible.
- Étant donné un utilisateur qui choisit `Je viens d'arrêter`, quand la question
  suivante s'affiche, alors elle propose `Suivre mes envies` et `Pas maintenant`,
  sans reproposer `Arrêter`.
- Étant donné un utilisateur qui choisit `Suivre mes envies`, quand le profil est
  persisté dans le modèle temporaire, alors `smokingGoal = "observer"` peut être
  utilisé comme compatibilité.
- Étant donné un utilisateur qui choisit `Pas maintenant`, quand il arrive sur
  Aujourd'hui, alors il peut toujours saisir un événement tabac s'il le souhaite.
- Étant donné un utilisateur qui choisit `Pas maintenant`, quand les bilans sont
  générés, alors Haru ne pousse pas d'expérience active sans demande explicite.

### Jours 1 à 7

- Étant donné un utilisateur qui active le suivi tabac pendant l'onboarding,
  quand le module calcule les jours 1 à 7, alors il utilise la date de départ du
  profil comme jour 1.
- Étant donné un utilisateur qui active le suivi tabac plus tard, quand le module
  calcule les jours 1 à 7, alors il utilise `tobaccoTrackingStartedAt` comme
  jour 1.
- Étant donné un utilisateur au cinquième jour calendaire depuis le départ du
  suivi, quand le bilan s'affiche, alors il ne contient que des faits
  descriptifs.
- Étant donné des jours non renseignés pendant la première semaine, quand le
  huitième jour calendaire arrive, alors la phase descriptive n'est pas prolongée
  automatiquement.
- Étant donné un utilisateur au jour 5 calendaire, quand une répétition claire
  apparaît, alors Haru peut l'afficher comme fait mais ne propose pas
  d'expérience corrective.
- Étant donné un utilisateur au jour 3 qui demande explicitement une aide, quand
  Haru répond, alors une proposition courte peut être affichée avec un rappel que
  l'observation reste suffisante.

### Bilans Aujourd'hui et Carnet

- Étant donné une journée avec `Aucun` et une envie, quand Aujourd'hui s'affiche,
  alors l'état de journée indique aucune cigarette déclarée et la chronologie
  affiche l'envie.
- Étant donné une journée avec seulement `Aucun`, quand la chronologie s'affiche,
  alors elle ne crée pas un événement ponctuel artificiel.
- Étant donné une semaine, quand le Carnet calcule le résumé, alors il affiche la
  couverture, les dates uniques explicitement sans cigarette, les envies et les
  cigarettes.

### Repas, stress et contexte

- Étant donné aucun consentement repas-tabac, quand les bilans s'affichent, alors
  aucune proximité repas-tabac n'est calculée ou affichée.
- Étant donné un consentement repas-tabac, quand il est enregistré, alors il
  comporte une version, une date, une portée explicite et une source.
- Étant donné un consentement repas-tabac révoqué, quand il est enregistré, alors
  il conserve `revokedAt` et sa portée initiale.
- Étant donné un consentement repas-tabac, quand une cigarette est notée 45
  minutes après un repas, alors Haru peut afficher une proximité dans la fenêtre
  recommandée de 60 minutes.
- Étant donné une cigarette notée 75 minutes après un repas, quand la fenêtre
  active est 60 minutes, alors elle n'est pas comptée dans la proximité.
- Étant donné une proximité calculée, quand les données sont stockées, alors
  aucun lien durable repas-tabac n'est persisté.
- Étant donné un lien repas-tabac explicitement déclaré par l'utilisateur, quand
  il est stocké, alors `relationEvidence` vaut `user_declared`.
- Étant donné un consentement repas-tabac révoqué, quand les bilans s'affichent,
  alors aucun nouveau calcul croisé n'est fait et les corrélations dérivées
  disparaissent sans supprimer les événements sources.
- Étant donné une répétition après repas sur plusieurs jours, quand le bilan
  hebdomadaire s'affiche, alors Haru parle d'indice observé ou de cooccurrence,
  jamais de cause.
- Étant donné une confiance élevée, quand elle est affichée, alors elle décrit
  seulement la répétition observée et ne transforme jamais l'indice en causalité.

### Confidentialité

- Étant donné deux utilisateurs sur le même appareil, quand l'un ouvre son scope,
  alors il ne voit pas les données tabac de l'autre.
- Étant donné un export utilisateur, quand il est généré, alors les données tabac
  sont incluses dans un format lisible.
- Étant donné une suppression de compte ou de données locales, quand elle est
  confirmée, alors les données tabac sont supprimées dans le même périmètre.
- Étant donné une suppression d'événement en cours de synchronisation, quand un
  autre appareil se reconnecte, alors un tombstone temporaire peut propager la
  suppression.
- Étant donné une suppression de compte confirmée, quand la procédure se termine,
  alors les données sources et tombstones tabac sont effacés définitivement.
- Étant donné une note libre tabac, quand une erreur ou un événement analytics
  est journalisé, alors la note libre n'apparaît pas dans les logs.
- Étant donné un accès admin non validé, quand un opérateur consulte les données,
  alors aucune note libre tabac nominative n'est visible.
- Étant donné une demande d'IA sur les données tabac sans consentement, quand le
  module répond, alors il refuse ce traitement ou demande un consentement
  explicite.

### Garde-fous santé

- Étant donné un utilisateur qui choisit `Arrêter` ou `Réduire`, quand le module
  propose une aide, alors il mentionne l'intérêt d'un professionnel sans
  prescrire de traitement.
- Étant donné un utilisateur qui appuie sur un bouton d'aide ou demande
  explicitement une orientation, quand le message santé s'affiche, alors Haru
  recommande de demander un avis professionnel.
- Étant donné une réponse structurée prévue pour l'orientation santé, quand elle
  indique un besoin d'aide, alors Haru recommande de demander un avis
  professionnel.
- Étant donné une note libre contenant des mots inquiétants, quand elle est
  enregistrée en V1, alors aucun message santé automatique n'est déclenché par
  analyse de cette note.
- Étant donné une demande sur les substituts ou médicaments, quand Haru répond,
  alors il oriente vers un professionnel et ne donne pas de dosage.

## 21. Décisions à valider avant développement

- Confirmer que la V1 est limitée aux cigarettes combustibles.
- Confirmer que `Aucun` devient une déclaration de journée dont l'état actif est
  toujours dérivé à la lecture.
- Confirmer la stratégie de compatibilité : table V2 dédiée ou colonnes
  additives versionnées.
- Confirmer la forme des IDs V2 stables côté client et la règle `legacyKey`.
- Confirmer la question optionnelle de repère de départ, ou la retirer pour une
  V1 encore plus courte.
- Confirmer la liste initiale de déclencheurs.
- Confirmer quand le compteur de cigarettes devient visible : V1 implicite ou
  V2 explicite.
- Confirmer la fenêtre de proximité repas-tabac recommandée à 60 minutes.
- Confirmer le texte et l'emplacement du consentement repas-tabac.
- Confirmer le modèle de consentement versionné, daté, révocable et à portée
  explicite.
- Confirmer le futur champ `tobaccoTrackingStartedAt` et son emplacement exact.
- Confirmer les règles de rétention des données tabac.
- Confirmer les formulations de garde-fous santé et la référence France
  `Tabac info service`.
- Confirmer ce qui reste visible dans Aujourd'hui et Carnet avant un vrai écran
  dédié.
- Confirmer que toute logique payante est reportée hors de ce contrat.

## 22. Première tranche de développement proposée

Quand ce contrat sera validé, la première tranche technique devrait rester pure
et isolée :

1. créer `src/features/tobacco/tobaccoModel.ts` ;
2. ajouter un adaptateur v1 vers V2 en lecture seule ;
3. tester les règles d'état effectif, jours sans cigarette, envies, cigarettes,
   IDs, confidentialité de modèle et confiance ;
4. brancher ensuite seulement le bilan quotidien ;
5. brancher le bilan hebdomadaire après validation des libellés et du
   consentement ;
6. décider la migration cloud seulement après validation de la stratégie de
   compatibilité anciens clients.

Cette séquence évite de mélanger modèle, UI, stockage et migration.
