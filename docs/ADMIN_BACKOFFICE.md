# Back-office Haru

## 1. Objectif

Le back-office Haru est un outil web prive, principalement utilise sur ordinateur.
Il sert a exploiter l'application, gerer ses contenus, assister les utilisateurs et
controler les acces payants sans exposer inutilement les donnees personnelles.

Il ne s'agit pas d'une application macOS ni d'un ecran ajoute a l'application
mobile. La premiere version vit dans le depot Next.js actuel, sous un espace
`/admin` isole. Une separation dans un deploiement ou un sous-domaine dedie pourra
etre faite plus tard sans changer les regles d'acces.

## 2. Principes obligatoires

- Acces refuse par defaut : etre connecte ne suffit pas pour devenir administrateur.
- Autorisation controlee cote serveur avant tout rendu ou appel privilegie.
- Roles et permissions explicites, avec le minimum de droits necessaire.
- La cle Supabase `service_role` reste exclusivement cote serveur.
- Les actions sensibles demandent une confirmation et une raison.
- Toute action administrative sensible est inscrite dans un journal d'audit.
- Les donnees de sante et de comportement ne sont jamais consultables en masse.
- Aucun administrateur ne peut se connecter a la place d'un utilisateur.
- Aucun changement silencieux des repas, poids, reponses ou observations tabac.
- Le back-office n'ecrit jamais directement dans les donnees via un editeur SQL.

## 3. Roles cibles

### Super administrateur

Gere les autres administrateurs, les droits, les incidents critiques et les
operations sensibles. Ce role doit rester exceptionnel.

### Editeur de contenu

Gere les recettes, ingredients, exercices, programmes et contenus editoriaux.
Il n'accede pas aux donnees personnelles des utilisateurs.

### Support

Recherche un compte, consulte son etat technique et traite les demandes de compte.
L'acces exceptionnel a une donnee personnelle doit etre motive, limite et audite.

### Relecteur de recettes publiques

Traite uniquement les recettes publiques et leurs signalements de contenu. Il ne
peut pas administrer les comptes, les paiements, les roles ou les donnees de sante.

La premiere version peut n'activer que `super_admin` et `read_only`, mais le modele
doit pouvoir accueillir les roles cibles sans refonte.

## 4. Fonctionnalites validees

### Vue generale

- Afficher le nombre d'utilisateurs inscrits, actifs et nouvellement inscrits.
- Afficher l'utilisation agregee des modules principaux.
- Afficher la version deployee et l'etat des services essentiels.
- Signaler les echecs de synchronisation et incidents connus.
- Afficher des indicateurs agreges, jamais le contenu personnel des carnets.
- A terme, activer des fonctionnalites pilotes et publier une information produit.

### Utilisateurs et support

- Rechercher un utilisateur par email ou identifiant.
- Voir l'etat du compte, la fin de l'onboarding et la derniere activite.
- Voir l'etat de synchronisation et les droits gratuits ou payants.
- Debloquer une situation technique explicitement prise en charge.
- Traiter une demande d'export ou de suppression.
- Conserver la trace de la personne, de la date et de la raison de chaque action.

Les repas, poids, reponses comportementales et donnees tabac ne sont pas affiches
par defaut. Un futur acces support, s'il est confirme, devra etre temporaire,
justifie et audite.

### Abonnements et droits

- Voir les acces Gratuit, Sport, Recettes ou offre combinee.
- Voir les dates de debut, renouvellement et expiration.
- Accorder ou retirer un droit manuel temporaire avec justification.
- Identifier une divergence entre paiement et droit applicatif.
- A terme, administrer les promotions et consulter les remboursements.

Le prestataire de paiement reste la source de verite des transactions. Le
back-office gere les droits applicatifs et leur reconciliation, pas les numeros de
carte ni les donnees bancaires.

### Recettes

- Creer, modifier, previsualiser, publier et archiver une recette.
- Gerer ingredients, quantites, portions, etapes, categories et allergenes.
- Associer ou corriger les correspondances avec CIQUAL.
- Examiner les recettes publiques proposees par les utilisateurs.
- Valider, refuser, demander une correction ou retirer une recette.
- Traiter les signalements et mettre certains contenus en avant.

### Sport

- Creer, modifier, publier et desactiver un exercice.
- Gerer groupes musculaires, materiel, niveau et difficultes.
- Ajouter consignes, erreurs frequentes, precautions et contre-indications.
- Associer les illustrations ou videos de demonstration.
- Construire des seances et programmes.
- A terme, regler et controler les regles de proposition d'exercices adaptes.

### Signalements de recettes publiques

- Consulter et prioriser les signalements portant sur une recette publique.
- Qualifier le motif : droits d'utilisation, allergene, qualite ou hors sujet.
- Preparer une decision editoriale motivee et auditee.
- Exclure toute action generale sur le compte depuis cette surface.

### Analyse et intelligence artificielle

- Voir les versions des regles deterministes et des analyses.
- Tester une analyse uniquement sur des donnees fictives ou anonymisees.
- Activer progressivement une nouvelle version et revenir en arriere.
- Versionner les prompts et desactiver rapidement une analyse problematique.
- Collecter les retours sur les conseils produits.

Un administrateur ne peut pas reecrire silencieusement le portrait comportemental
d'un utilisateur.

### Exploitation technique

- Afficher l'etat de Supabase, des migrations et des integrations externes.
- Afficher les files et echecs techniques sans devoiler leur contenu sensible.
- Relancer uniquement des operations precises et idempotentes.
- Consulter le journal d'audit administratif.
- Interdire les operations de masse destructives depuis l'interface.

## 5. Architecture de securite

- Les pages `/admin/*` sont protegees par un controle serveur commun.
- Une session Supabase valide est necessaire, mais ne constitue pas une permission.
- Les membres et roles administratifs sont stockes dans une table dediee.
- Les politiques RLS et les controles serveur appliquent la meme politique d'acces.
- Les composants client ne recoivent que les donnees deja autorisees et minimales.
- Les operations privilegiees passent par des Server Actions ou Route Handlers
  controles, jamais par un client Supabase privilegie dans le navigateur.
- Les erreurs ne revelent ni existence de compte, ni secret, ni detail interne.
- Toutes les mutations administratives acceptent un motif et un identifiant de
  correlation pour leur audit.

## 6. Donnees minimales a introduire

### `admin_members`

- `user_id`
- `role`
- `active`
- `created_at`
- `updated_at`
- `created_by`

### `admin_audit_logs`

- `id`
- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `reason`
- `metadata` limitee et non sensible
- `created_at`

Les journaux d'audit ne stockent ni contenu complet de repas, ni poids, ni token,
ni secret, ni donnee bancaire.

## 7. Decoupage de livraison

### Lot 1 - Socle securise en lecture seule

- Route `/admin` et shell visuel distinct de l'application mobile.
- Controle de session et de role cote serveur, ferme par defaut.
- Ecran de refus pour un utilisateur connecte non administrateur.
- Tableau de bord minimal en lecture seule.
- Tables et politiques locales pour les membres et l'audit.
- Tests : sans session, non-administrateur, administrateur actif, administrateur
  desactive et absence de fuite de `service_role`.

### Lot 2 - Support et droits

- Recherche de comptes.
- Fiche technique minimale sans journal personnel.
- Consultation et reconciliation des droits Sport et Recettes.
- Actions sensibles confirmees, motivees et auditees.

### Lot 3 - Contenus

- Bibliotheque Sport.
- Bibliotheque Recettes et associations CIQUAL.
- Brouillons, previsualisation, publication et archivage.

### Lot 4 - Signalements recettes et exploitation avancee

- Revue des signalements de recettes publiques.
- Indicateurs d'exploitation.
- Regles d'analyse, prompts et deploiements progressifs.

## 8. Hors perimetre du premier lot

- Paiement reel ou remboursement.
- Consultation des carnets personnels.
- Modification des donnees de sante ou de comportement.
- Gestion complete des recettes ou du sport.
- Revue des signalements de recettes publiques.
- Configuration de l'intelligence artificielle.
- Actions destructives de masse.
- Application native pour macOS.

## 9. Criteres d'acceptation du premier lot

- Une personne non connectee ne peut pas voir `/admin`.
- Un utilisateur Haru normal ne peut pas voir `/admin`.
- Un role inactif ne peut pas voir `/admin`.
- Seul un role actif autorise voit le tableau de bord.
- Aucun secret privilegie n'est inclus dans le bundle client.
- Aucune donnee personnelle de carnet n'est chargee par le tableau de bord.
- Les nouvelles tables ont RLS active et aucune politique publique permissive.
- La migration est locale uniquement tant qu'elle n'a pas ete controlee.
- Typecheck, lint, tests et build passent avant integration.
