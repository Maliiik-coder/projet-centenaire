# Haru - Contrat produit de l'onboarding V1

Statut : décisions validées, implémentation en cours.

Version du document : 1.0 - 16 juillet 2026.

## 1. Intention

L'onboarding doit donner à l'utilisateur une première lecture utile de sa
situation sans le juger, lui prescrire un régime ou prétendre établir un
diagnostic psychologique.

Il produit trois niveaux d'information distincts :

1. un état des lieux corporel simple : taille, poids actuel, objectif et IMC ;
2. des signaux comportementaux déclarés par l'utilisateur ;
3. des hypothèses à confirmer ou infirmer par les sept premiers jours de carnet.

Le résultat n'est jamais un type de personnalité. Haru ne dit pas « tu es un
mangeur émotionnel ». Haru peut dire « les émotions semblent parfois déclencher
une envie de manger ; nous allons vérifier cette piste ».

## 2. Principes non négociables

- une question par écran ;
- une action principale stable en bas ;
- aucune donnée personnelle préremplie ;
- aucune saisie numérique au clavier pour la date, la taille ou le poids ;
- possibilité de revenir en arrière sans perdre les réponses ;
- réponse « Je ne sais pas encore » lorsque la personne ne peut pas répondre ;
- aucun conseil médical ou alimentaire fondé uniquement sur l'IMC ;
- aucune étiquette définitive ;
- les réponses de l'onboarding restent modifiables ;
- les observations du carnet peuvent contredire les hypothèses initiales ;
- aucune donnée n'est enregistrée avant la validation finale du parcours ;
- fonctionnement local, hors ligne et cloud identique aux règles actuelles.

## 3. Population cible et limite d'âge

### Décision proposée

Positionner cette version de Haru pour les personnes de 18 ans et plus.

Les seuils d'IMC adultes ne s'appliquent pas de la même manière aux mineurs.
Haru V1 ne propose donc pas ce parcours aux personnes de moins de 18 ans et
n'interprète aucun IMC mineur avec les catégories adultes.

La date de naissance exacte sert uniquement à calculer l'âge au moment de
l'inscription. Elle n'est pas persistée dans le profil.

## 4. Rôle de l'IMC

### Calcul

```text
IMC = poids en kg / (taille en mètres x taille en mètres)
```

Le résultat est arrondi à une décimale. Il est dérivé du poids initial et de la
taille ; il n'est pas enregistré comme une donnée indépendante.

### Positionnement produit

L'IMC est un repère de départ, pas une explication. Il ne permet pas à lui seul
de comprendre la composition corporelle, les antécédents, les comorbidités, le
contexte social ou les raisons d'une évolution pondérale.

L'écran doit présenter le terme médical correspondant avec sobriété, puis
immédiatement rappeler les limites de cet indicateur.

### Proposition d'écran

Titre : `Ton point de départ`

Valeur principale : `IMC estimé : 31,4`

Texte contextuel :

> Selon les repères adultes, cette valeur se situe dans la zone de l'obésité.
> C'est un indicateur de santé, pas un jugement. Il ne résume ni ta santé, ni ta
> valeur, ni les raisons de ta situation.

Texte secondaire :

> Haru va maintenant chercher les situations et les habitudes qui méritent
> d'être observées.

L'écran ne doit pas afficher de jauge rouge, de note, d'alarme, de personnage,
de comparaison avec d'autres personnes ou de nombre de kilos « à perdre ».

### Repères de classement adultes

Les seuils utilisés doivent être centralisés dans une fonction testée :

| IMC | Libellé médical interne | Formulation visible proposée |
| --- | --- | --- |
| inférieur à 18,5 | insuffisance pondérale | en dessous de la zone de référence |
| 18,5 à 24,9 | corpulence de référence | dans la zone de référence |
| 25 à 29,9 | surpoids | dans la zone du surpoids |
| 30 à 34,9 | obésité de classe I | dans la zone de l'obésité |
| 35 à 39,9 | obésité de classe II | dans la zone de l'obésité |
| 40 et plus | obésité de classe III | dans la zone de l'obésité |

La classe détaillée peut rester dans une ligne secondaire accessible, sans être
le titre principal de l'écran.

## 5. Fondements du portrait comportemental

La proposition s'appuie sur des dimensions présentes dans des questionnaires de
recherche reconnus, sans recopier leurs items et sans prétendre créer un score
cliniquement validé :

- restriction cognitive ;
- alimentation vécue comme difficile à contrôler ;
- alimentation émotionnelle ;
- influence de la vue, de l'odeur ou de la disponibilité des aliments ;
- faim, rassasiement et satiété ;
- rythme des repas et contexte ;
- habitudes et automatismes.

Le cadre COM-B complète ces dimensions en distinguant ce qui relève de la
capacité, de l'environnement disponible et de la motivation. Haru utilise ce
cadre pour choisir une première mission d'observation, pas pour noter la volonté
de la personne.

## 6. Parcours cible

Le parcours moyen doit rester inférieur à trois minutes. Les écrans de choix
simples avancent après sélection ; les multisélections demandent une validation
explicite.

### Bloc A - Ouverture, accès et identité

#### A0 - Démarrage

À chaque ouverture normale de l'application :

- le mot-symbole Haru apparaît immédiatement ;
- une barre de chargement progresse pendant trois secondes ;
- le slogan `Un jour à la fois.` apparaît ensuite avec une transition de deux
  secondes ;
- le bouton `Commencer` apparaît à la fin de cette transition.

Le retour d'une authentification et la reprise explicite d'un onboarding passent
ce sas afin de ne pas le montrer deux fois de suite.

#### A1 - Choix d'accès

Après `Commencer`, un nouvel utilisateur choisit entre :

- Google ;
- une adresse email avec lien magique, qui crée le compte si nécessaire ;
- `Continuer uniquement sur ce téléphone`.

Le dernier choix n'utilise aucun compte Supabase. Les données restent dans le
scope invité de l'appareil et ne sont pas synchronisées ailleurs. Le choix est
mémorisé localement pour permettre la reprise d'un onboarding interrompu.

#### A2 - Prénom

Question : `Comment tu veux qu'on t'appelle ?`

Contrôle : champ texte.

Validation : une valeur non vide.

#### A3 - Date de naissance

Question : `Quelle est ta date de naissance ?`

Contrôle : trois molettes tactiles `Jour · Mois · Année`.

Validation proposée : utilisateur âgé de 18 à 100 ans.

Persistance : seul l'âge calculé est conservé.

### Bloc B - État des lieux corporel

#### B1 - Taille

Question : `Quelle est ta taille ?`

Contrôle : molette de 100 à 220 cm.

#### B2 - Poids actuel

Question : `Quel est ton poids actuel ?`

Contrôle : molette de 30 à 250 kg.

#### B3 - État des lieux IMC

Écran informatif décrit dans la section 4.

Action : `Continuer`

#### B4 - Objectif

Question : `Quel poids veux-tu viser pour commencer ?`

Description : `C'est un repère. Il pourra évoluer plus tard.`

Contrôle : molette de 30 à 250 kg.

La molette est présélectionnée sur le poids entier le plus proche de la zone
d'IMC adulte de référence : limite basse si le poids actuel est inférieur à
cette zone, limite haute s'il est supérieur, poids actuel s'il s'y trouve déjà.
L'écran précise qu'il s'agit d'un repère mathématique modifiable, et non d'un
« poids idéal » universel ou d'une prescription.

L'application n'affiche pas de délai automatique ni de rythme de perte de poids.

### Bloc C - Première lecture comportementale

Les questions C1 à C7 utilisent la même échelle :

- Jamais ;
- Parfois ;
- Souvent ;
- Je ne sais pas encore.

Chaque réponse est validée par un appui maintenu de 500 ms. La tuile se remplit
progressivement en bleu et revient à son état initial si l'utilisateur relâche
avant la fin. Cette confirmation s'applique uniquement aux choix qui font
avancer immédiatement le parcours.

#### C1 - Rythme

Question :

> Sur une semaine habituelle, t'arrive-t-il de sauter un repas ou de manger
> beaucoup plus tard que prévu ?

Axe : `rhythm`.

#### C2 - Faim au démarrage

Question :

> T'arrive-t-il de commencer un repas avec une faim difficile à calmer ?

Axe : `hunger`.

#### C3 - Arrêt du repas

Question :

> T'arrive-t-il de continuer à manger alors que tu n'as plus vraiment faim ?

Axe : `satiety_control`.

#### C4 - Émotions

Question :

> Le stress, la fatigue, l'ennui ou une contrariété te donnent-ils envie de
> manger ?

Axe : `emotional`.

#### C5 - Signaux extérieurs

Question :

> La vue, l'odeur ou la présence d'un aliment te donnent-elles envie de manger
> sans faim ?

Axe : `external_cues`.

#### C6 - Habitudes et contexte social

Question :

> T'arrive-t-il de manger uniquement parce que c'est l'heure ou parce que les
> autres mangent ?

Axe : `habit_context`.

#### C7 - Restriction et rebond

Question :

> Après t'être beaucoup privé, t'arrive-t-il de manger nettement plus ensuite ?

Axe : `restriction_rebound`.

#### C8 - Contextes fréquents

Question : `Dans quelles situations cela arrive-t-il le plus souvent ?`

Contrôle : multisélection puis bouton `Continuer`.

Choix :

- le soir ou la nuit ;
- devant un écran ;
- au travail ;
- en voiture ou en déplacement ;
- à l'hôtel ;
- au restaurant ou avec d'autres personnes ;
- seul à la maison ;
- aucune situation précise ;
- je ne sais pas encore.

Les choix `aucune situation précise` et `je ne sais pas encore` sont exclusifs.

#### C9 - Perception actuelle

Question : `Qu'est-ce qui semble le plus te freiner aujourd'hui ?`

Contrôle : multisélection puis bouton `Continuer`.

Choix :

- des portions trop importantes ;
- manger ou grignoter sans faim ;
- des repas pris par habitude ;
- un rythme irrégulier ;
- le stress ou les émotions ;
- la difficulté à m'arrêter ;
- je ne sais pas encore.

Cette réponse est conservée séparément du résultat calculé. Elle représente la
perception de l'utilisateur et permet plus tard de comparer ce qu'il pensait au
départ avec ce que le carnet montre réellement.

#### C10 - Accompagnement professionnel, facultatif

Question :

> Es-tu actuellement accompagné par un professionnel pour ton poids, ton
> alimentation ou un trouble alimentaire ?

Choix :

- oui ;
- non ;
- je préfère ne pas répondre.

L'écran peut être passé sans réponse. Une réponse positive n'exclut jamais
l'utilisateur et ne modifie pas les hypothèses. Haru rappelle seulement qu'il
reste un outil d'observation et ne remplace pas cet accompagnement.

### Bloc D - Tabac conditionnel

#### D1 - Statut

Question : `Tu fumes actuellement ?`

Choix :

- non ;
- occasionnellement ;
- tous les jours ;
- je viens d'arrêter.

#### D2 - Intention

Affiché pour toute réponse autre que `non`.

Question : `Qu'aimerais-tu faire concernant le tabac ?`

Choix :

- arrêter ;
- réduire ;
- observer d'abord ;
- pas maintenant.

#### D3 et D4 - Dépendance déclarée, proposition optionnelle

Pour un fumeur quotidien, Haru peut proposer les deux questions du mini-test de
Fagerström : délai avant la première cigarette et nombre moyen de cigarettes par
jour. Cette branche reste indépendante du portrait alimentaire et doit être
validée avant implémentation.

### Bloc E - Restitution

#### E1 - Point de départ

La restitution tient sur un écran mobile et ne présente jamais plus de deux
hypothèses principales.

Exemple :

> **Ton point de départ**
>
> IMC estimé : 31,4
>
> Deux pistes méritent d'être observées :
>
> - tu sembles parfois arriver aux repas avec une faim difficile à calmer ;
> - le stress ou la fatigue pourraient également déclencher certaines envies.
>
> Ce sont des hypothèses issues de tes réponses. Le carnet va les vérifier
> pendant sept jours.

Action : `Ouvrir la page du jour`

La première mission reprend la piste la plus utile à observer, sans donner de
conseil correctif prématuré.

## 7. Règles d'interprétation

### Valeurs internes

| Réponse | Valeur interne |
| --- | ---: |
| Jamais | 0 |
| Parfois | 2 |
| Souvent | 3 |
| Je ne sais pas encore | null |

Ces valeurs servent uniquement à hiérarchiser les hypothèses. Elles ne forment
pas un score clinique et ne sont jamais affichées. La valeur historique `1`
reste lisible pour les profils déjà enregistrés, mais n'est plus proposée dans
la nouvelle interface.

### Axes calculés

```text
rhythm_hunger = moyenne(C1, C2)
satiety_control = C3
emotional = C4
external_cues = C5
habit_context = C6
restriction_rebound = C7
```

### Sélection des hypothèses

- ignorer les réponses `null` ;
- ne pas afficher un axe inférieur à 2 ;
- retenir au maximum les deux axes les plus élevés ;
- en cas d'égalité, préférer l'axe le plus directement observable dans le carnet ;
- si aucun axe n'atteint 2, afficher `Aucune tendance nette pour le moment` ;
- si quatre réponses ou plus valent `null`, ne produire aucune hypothèse ;
- toujours qualifier le résultat comme `déclaré` et `à confirmer`.

Une seule réponse ne doit jamais produire une étiquette de personne.

### Formulations autorisées

- `Cette piste semble présente dans tes réponses.`
- `Ce contexte mérite d'être observé.`
- `Le carnet va vérifier cette hypothèse.`
- `Aucune tendance nette ne ressort pour le moment.`

### Formulations interdites

- `Tu es un mangeur émotionnel.`
- `Tu manques de volonté.`
- `Ton problème est psychologique.`
- `Tu dois perdre X kilos.`
- `Ton poids idéal est X.`
- `Tu as un trouble alimentaire.`
- `Haru a établi ton diagnostic.`

## 8. Correspondance avec la mission initiale existante

Tant que le modèle historique `initialFriction` existe, la première hypothèse est
convertie sans perdre le portrait complet :

| Axe principal | `initialFriction` historique |
| --- | --- |
| rhythm_hunger | irregularity |
| satiety_control | large-portions |
| emotional | snacking-without-hunger |
| external_cues | snacking-without-hunger |
| habit_context | habit-meals |
| restriction_rebound | unknown |

Le profil complet ne doit pas être réduit à cette valeur historique. Cette
conversion sert seulement à conserver la mission actuelle pendant la migration.

## 9. Modèle de données proposé

```ts
type BehaviorFrequency = 0 | 1 | 2 | 3 | null;

type BehavioralAxis =
  | "rhythm_hunger"
  | "satiety_control"
  | "emotional"
  | "external_cues"
  | "habit_context"
  | "restriction_rebound";

type InitialBehaviorAssessment = {
  version: 1;
  completedAt: string;
  answers: {
    rhythm: BehaviorFrequency;
    hunger: BehaviorFrequency;
    satietyControl: BehaviorFrequency;
    emotional: BehaviorFrequency;
    externalCues: BehaviorFrequency;
    habitContext: BehaviorFrequency;
    restrictionRebound: BehaviorFrequency;
  };
  contexts: string[];
  perceivedFrictions: string[];
  professionalSupport?: "yes" | "no" | "prefer-not-to-say";
  hypotheses: Array<{
    axis: BehavioralAxis;
    level: 2 | 3;
  }>;
  evidence: "self-reported";
};
```

Proposition de persistance cloud : une colonne JSONB versionnée sur le profil.
Cette solution permet de faire évoluer le questionnaire sans multiplier des
colonnes liées à une version précise. Elle nécessite :

- une migration Supabase ;
- une mise à jour de `database.types.ts` ;
- une normalisation locale stricte ;
- la prise en charge dans les patches de profil ;
- la conservation hors ligne et dans le pending propre à l'utilisateur ;
- des politiques RLS inchangées dans leur principe : chaque utilisateur ne peut
  lire ou modifier que son profil.

## 10. Sécurité et troubles des conduites alimentaires

Le portrait comportemental n'est pas un dépistage des troubles des conduites
alimentaires.

Le questionnaire SCOFF existe pour faire émerger une suspicion avant évaluation
clinique ; il ne diagnostique pas. Haru ne doit pas l'intégrer tant que le produit
n'a pas défini :

- le message à afficher en cas de résultat positif ;
- les ressources professionnelles proposées ;
- les limites de responsabilité ;
- le comportement du suivi de poids et de l'IMC dans ce contexte.

La V1 inclut cette question facultative :

> Es-tu actuellement accompagné par un professionnel pour ton poids, ton
> alimentation ou un trouble alimentaire ?

Une réponse positive ne doit pas exclure l'utilisateur. Elle rappelle que
Haru reste un outil d'observation et ne remplace pas cet accompagnement.

## 11. Accessibilité et ergonomie

- cibles tactiles d'au moins 48 px ;
- progression visible mais non anxiogène ;
- hauteur stable entre les écrans ;
- bouton principal accessible avec le clavier ouvert ;
- labels explicites pour les lecteurs d'écran ;
- les molettes restent utilisables au clavier ;
- aucun choix communiqué uniquement par la couleur ;
- texte lisible à 320, 390 et 430 px ;
- respect des safe areas iPhone ;
- aucune carte dans une carte ;
- animation courte et désactivable avec `prefers-reduced-motion`.

## 12. Critères d'acceptation

### Produit

- l'utilisateur comprend en moins de cinq secondes que Haru ne compte pas les
  calories ;
- l'IMC est présenté comme un repère limité, sans culpabilisation ;
- aucune formulation ne transforme une réponse en diagnostic ;
- le résultat contient zéro, une ou deux hypothèses maximum ;
- la restitution distingue clairement réponses déclarées et faits observés ;
- le parcours moyen reste inférieur à trois minutes ;
- le tabac ne modifie jamais le portrait alimentaire.

### Données

- la date de naissance exacte n'est jamais persistée ;
- l'IMC n'est pas dupliqué en base ;
- le questionnaire est versionné ;
- les réponses sont isolées par utilisateur ;
- le mode invité reste indépendant ;
- les réponses sont modifiables depuis le profil ;
- aucune sauvegarde cloud ne se déclenche avant la validation finale.

### Tests

- calcul et arrondi de l'IMC ;
- classement de chaque valeur frontière ;
- refus de la classification adulte sous 18 ans ;
- calcul de l'âge avant et après l'anniversaire ;
- calcul des axes avec réponses complètes et partielles ;
- absence d'hypothèse quand les données sont insuffisantes ;
- maximum de deux hypothèses ;
- exclusivité de `Je ne sais pas encore` dans les multisélections ;
- retour arrière sans perte ;
- branche tabac non-fumeur et fumeur ;
- sauvegarde locale, cloud et pending ;
- comportement hors ligne ;
- absence de débordement à 320, 390 et 430 px.

## 13. Plan d'implémentation après validation

1. Valider le public 18+, les formulations et le nombre d'écrans.
2. Créer les fonctions pures IMC, classification et hypothèses avec tests.
3. Ajouter le modèle versionné local et cloud avec migration Supabase.
4. Implémenter le parcours question par question et ses embranchements.
5. Implémenter la restitution et la correspondance de mission.
6. Ajouter l'édition du portrait depuis Profil.
7. Vérifier le parcours invité, connecté, hors ligne et après reconnexion.
8. Contrôler visuellement les trois largeurs mobiles.
9. Exécuter `npm run verify`.
10. Faire un test réel sur téléphone avant de figer l'onboarding.

## 14. Décisions validées

1. Haru V1 est réservé aux personnes de 18 ans et plus.
2. L'écran IMC affiche d'abord une zone compréhensible, puis la classe médicale
   détaillée sur une ligne secondaire.
3. Le bloc comportemental conserve les sept questions de fréquence.
4. La question d'accompagnement professionnel est facultative et non bloquante.
5. Le mini-test de Fagerström n'entre pas dans cette version.
6. Le portrait initial est modifiable depuis Profil.

## 15. Sources de cadrage

- [OMS - Obesity and overweight](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight)
- [HAS - Guide du parcours de soins : surpoids et obésité de l'adulte](https://www.has-sante.fr/jcms/p_3408871/fr/guide-du-parcours-de-soins-surpoids-et-obesite-de-l-adulte)
- [TFEQ-R18 - validation de la structure à trois facteurs](https://pubmed.ncbi.nlm.nih.gov/19615047/)
- [DEBQ - validation psychométrique française](https://www.sciencedirect.com/science/article/pii/S075549821500384X)
- [COM-B et Behaviour Change Wheel](https://pubmed.ncbi.nlm.nih.gov/21513547/)
- [SCOFF - étude originale](https://www.bmj.com/content/319/7223/1467)
- [HAS - Test de Fagerström](https://www.has-sante.fr/upload/docs/application/pdf/2014-11/outil_tests_fagerstrom.pdf)

Les formulations proposées dans ce document sont propres à Haru. Elles ne sont
pas présentées comme une adaptation validée des questionnaires cités.
