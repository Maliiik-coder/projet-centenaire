# Contrat d'integration IA Haru

Statut : proposition documentaire soumise a validation humaine.

Version du document : 0.1 - 20 juillet 2026.

## 1. Objet

Ce document fixe les frontieres produit, techniques et de securite de toute
future integration d'intelligence artificielle dans Haru.

L'IA ne remplace ni le carnet, ni les moteurs deterministes, ni la decision de
l'utilisateur. Elle intervient seulement lorsque les faits ont deja ete
structures, stabilises et attribues a une source explicite.

Regle centrale : le moteur deterministe est la source de verite des faits. L'IA
peut aider a les formuler, a demander une clarification ou a explorer une
hypothese. Elle ne peut pas fabriquer un fait, un diagnostic ou une causalite.

Ce contrat reste fournisseur-agnostique. Il ne choisit ni modele, ni hebergeur,
ni paywall et ne modifie pas les decisions commerciales de Haru.

## 2. Prerequis non negociables

Aucune fonction IA ne peut etre livree tant que les conditions suivantes ne sont
pas reunies :

- le contrat d'analyse Repas est branche comme source unique des faits ;
- les anciens moteurs ne produisent pas une interpretation concurrente ;
- chaque donnee transmise possede une source et un niveau de confiance ;
- l'absence de donnee reste `inconnu` et n'est jamais interpretee ;
- les sept premiers jours restent strictement descriptifs ;
- le parcours principal fonctionne completement sans IA ;
- l'utilisateur a donne un consentement explicite et revocable ;
- un interrupteur technique permet de desactiver l'IA sans redeployer
  l'application ;
- les schemas d'entree et de sortie sont versionnes et testes.

## 3. Les quatre usages distincts

Les quatre usages ci-dessous ne doivent pas etre regroupes dans une fonction
generique. Ils ont des donnees, des droits et des risques differents.

### 3.1 IA analytique

Objectif : transformer un resultat deterministe structure en explication lisible
ou aider a comparer des observations deja consolidees.

Elle peut :

- reformuler des faits et preuves fournis par le moteur deterministe ;
- expliquer pourquoi une hypothese a ete retenue ou non ;
- presenter les limites et les donnees manquantes ;
- suggerer, apres la phase initiale, une formulation d'experience deja autorisee
  par le contrat d'analyse ;
- signaler qu'aucune conclusion fiable n'est possible.

Elle ne peut pas :

- recalculer ou modifier les faits, seuils, compteurs ou niveaux de confiance ;
- creer une tendance absente du resultat deterministe ;
- deduire seule une cause psychologique, sociale, medicale ou nutritionnelle ;
- transformer une correlation en causalite ;
- produire une action corrective pendant les sept premiers jours ;
- afficher des calories ou nutriments lorsque la politique d'affichage les
  classe `internal_only`.

### 3.2 IA conversationnelle

Objectif : permettre a l'utilisateur d'explorer ses observations avec des
questions libres, dans les limites du dossier factuel disponible.

Elle peut :

- repondre sur les faits presents dans le contexte explicitement fourni ;
- distinguer fait, hypothese et question encore ouverte ;
- aider l'utilisateur a formuler ce qu'il souhaite observer ;
- proposer une question de reflexion neutre ;
- reconnaitre qu'elle ne dispose pas de suffisamment d'informations.

Elle ne peut pas :

- se presenter comme medecin, psychologue, dieteticien ou tabacologue ;
- diagnostiquer un trouble ou evaluer un risque medical individuel ;
- affirmer pourquoi une personne mange, fume ou prend du poids ;
- prescrire un regime, un traitement, un sevrage ou un objectif calorique ;
- remplacer un professionnel ou dissuader d'en consulter un ;
- utiliser l'ensemble de l'historique du compte par defaut ;
- memoriser une information personnelle hors du mecanisme de donnees Haru.

Lorsqu'un message evoque un danger immediat, un symptome grave ou une situation
de crise, l'IA ne tente pas d'etablir le niveau de gravite. Elle affiche une
orientation de securite validee, invite a contacter un professionnel ou les
services d'urgence adaptes, et n'enregistre rien automatiquement.

### 3.3 Reformulation

Objectif : rendre une saisie plus lisible sans en modifier le sens.

Exemples : corriger `stek` en proposant `steak`, remettre une phrase en francais
lisible ou condenser une note trop longue.

Regles :

- la saisie originale reste disponible jusqu'a confirmation ;
- toute proposition est presentee comme une suggestion ;
- une correction n'est jamais appliquee sans action explicite ;
- aucun aliment, quantite, contexte ou sensation ne peut etre ajoute ;
- une reformulation ambigue doit etre refusee ou transformee en clarification ;
- la normalisation Ciqual confirme un aliment seulement apres selection par
  l'utilisateur.

### 3.4 Clarification

Objectif : poser la plus petite question necessaire lorsqu'une donnee utile est
ambigue ou incomplete.

Elle peut demander, par exemple, si `deux assiettes de burger-frites` signifie
deux burgers complets ou un burger avec une reprise de frites.

Regles :

- une seule ambiguite prioritaire a la fois ;
- aucune question si la reponse n'a pas d'utilite pour l'analyse prevue ;
- les choix proposes doivent inclure `Je ne sais pas` ou `Passer` ;
- la reponse est une donnee utilisateur, jamais une conclusion de l'IA ;
- l'IA ne remplit pas un champ en deduisant la reponse la plus probable ;
- le tunnel reste utilisable si le service IA est indisponible.

## 4. Architecture de confiance

La chaine autorisee est la suivante :

1. l'utilisateur saisit ou confirme une donnee ;
2. Haru valide et structure cette donnee avec ses fonctions deterministes ;
3. le moteur deterministe produit faits, preuves, confiance et limites ;
4. un adaptateur construit un contexte IA minimal et versionne ;
5. l'IA retourne une proposition structuree ;
6. Haru valide la sortie contre un schema strict et ses regles produit ;
7. l'interface presente la proposition en indiquant sa nature ;
8. toute mutation eventuelle passe par une action explicite de l'utilisateur et
   par le service applicatif normal.

Le modele n'a jamais d'acces direct a Supabase, au stockage local, au journal de
mutations, aux secrets, aux politiques RLS ou a une fonction d'ecriture.

Le texte utilisateur et les contenus recuperes sont toujours traites comme des
donnees non fiables. Une instruction contenue dans une note ou un aliment ne
peut pas modifier le prompt systeme, appeler un outil ou contourner ce contrat.

## 5. Source de verite et hierarchie des sorties

Chaque element presente a l'utilisateur appartient a une categorie visible ou
techniquement identifiable :

- `fact` : produit par le moteur deterministe a partir des donnees confirmees ;
- `hypothesis` : piste prudente, soutenue par des preuves identifiees ;
- `suggested_wording` : reformulation sans valeur factuelle supplementaire ;
- `clarification` : question dont la reponse manque ;
- `experiment` : petite action mesurable autorisee apres la phase descriptive ;
- `unknown` : absence de donnees ou niveau de confiance insuffisant.

Une sortie IA ne peut pas changer de categorie sans repasser par le moteur
deterministe. Une phrase fluide ne doit jamais masquer son statut d'hypothese.

## 6. Donnees minimales envoyees

La minimisation se fait par fonction et par requete. Aucun mode ne recoit le
profil complet ou l'historique complet par commodite.

### Reformulation

- fragment de texte courant ;
- langue et locale ;
- liste courte de candidats deja trouves, si necessaire ;
- identifiant opaque de requete.

Ne sont pas necessaires : nom, email, poids, IMC, historique, tabac ou autres
repas.

### Clarification

- fragment ambigu ;
- section actuelle du repas ;
- candidats confirmes ou non resolus ;
- options de quantite deja autorisees par le tunnel ;
- question fonctionnelle a resoudre.

Ne pas envoyer le profil ou la semaine entiere sauf justification documentee et
validation d'une nouvelle version du contrat.

### Analyse

- version du contrat d'analyse ;
- scope `meal`, `day` ou `week` ;
- statut, faits, preuves, confiance et completude ;
- identifiants pseudonymes des repas et jours necessaires ;
- rang du jour dans la phase d'observation ;
- politique d'affichage nutritionnel ;
- experience autorisee par le moteur, lorsqu'elle existe.

Les textes bruts des repas ne sont envoyes que si la formulation les exige et si
les donnees normalisees ne suffisent pas.

### Conversation

- message courant de l'utilisateur ;
- court historique de conversation necessaire a la coherence ;
- resume deterministe explicitement selectionne pour la question ;
- limites et donnees manquantes ;
- langue et regles de securite applicables.

Le contexte conversationnel ne donne pas acces par defaut a l'email, au nom
complet, aux identifiants Supabase, aux donnees d'autres modules ou a l'ensemble
du carnet.

## 7. Consentement et controle utilisateur

Le consentement IA est distinct de l'acceptation generale de l'application.

- aucune requete externe avant un accord explicite ;
- explication courte des donnees envoyees et de l'objectif ;
- choix separe lorsque les finalites sont differentes ;
- retrait possible depuis Profil sans perte des fonctions deterministes ;
- refus sans degradation punitive du carnet ;
- confirmation supplementaire avant d'inclure une note libre sensible ;
- aucune utilisation pour entrainer un modele sans consentement distinct,
  explicite et facultatif ;
- le mode local n'active jamais l'IA silencieusement.

L'utilisateur peut demander quelles donnees ont ete utilisees pour une reponse.
Haru doit alors afficher les categories et la periode, sans reveler le prompt
systeme ni des informations de securite.

## 8. Pseudonymisation, retention et suppression

### Pseudonymisation

- utiliser un identifiant de requete aleatoire et un identifiant utilisateur
  derive ou opaque, jamais l'identifiant Supabase brut lorsque cela est evitable ;
- exclure email, nom complet, adresse, secrets et identifiants techniques ;
- utiliser des jours relatifs ou des periodes minimales lorsqu'une date exacte
  n'est pas necessaire ;
- tronquer ou rediger les textes libres avant journalisation ;
- ne jamais melanger les contextes de deux utilisateurs.

### Retention

Par defaut :

- les donnees Haru restent soumises aux regles normales de stockage du compte ;
- les requetes et reponses brutes du fournisseur ne sont pas conservees par
  Haru au-dela du temps necessaire a la requete ;
- privilegier une offre sans entrainement et avec retention nulle ou minimale ;
- les journaux techniques conservent metadonnees, statut, cout, latence et
  versions, mais pas le contenu brut par defaut ;
- tout echantillon conserve pour evaluation est pseudonymise, limite dans le
  temps, trace et supprimable ;
- la suppression du compte retire les references IA rattachees a cet utilisateur
  selon une procedure testee.

La duree exacte de retention doit etre validee avant production avec les choix
d'hebergement, de support et de conformite. Elle ne peut pas etre decidee par le
fournisseur seul.

## 9. Mutations et actions explicites

L'IA ne cree, ne modifie et ne supprime jamais directement :

- profil ;
- poids ;
- repas ou aliment confirme ;
- evenement tabac ;
- preference ;
- objectif ;
- experience ou conclusion du carnet.

Elle peut preparer un brouillon structure. L'interface doit afficher clairement
la modification proposee et demander une action utilisateur non ambigue. Apres
confirmation, le service applicatif valide le payload et execute la mutation
avec les controles locaux, cloud et RLS habituels.

Le silence, la fermeture d'une modale ou la poursuite de la conversation ne
valent jamais confirmation.

## 10. Sept premiers jours

Pendant les sept premiers jours du profil :

- les sorties restent descriptives ;
- aucune correction, mission de changement ou experience n'est proposee ;
- aucun vocabulaire de reussite, d'echec, de bonne ou mauvaise conduite ;
- l'IA peut expliquer ce qui a ete observe et ce qui manque ;
- elle peut encourager l'honnetete et la regularite de saisie ;
- elle ne peut pas utiliser les reponses d'onboarding comme preuve confirmee ;
- les hypotheses de l'onboarding restent `self-reported` et a verifier.

Le passage au jour huit n'autorise pas automatiquement une recommandation. Le
moteur deterministe doit d'abord confirmer que les donnees sont suffisantes.

## 11. Cout, quotas et disponibilite

Chaque fonction possede un budget independant :

- plafond de requetes par utilisateur et par periode ;
- limite de taille d'entree et de sortie ;
- delai maximal avant abandon ;
- nombre maximal de nouvelles tentatives ;
- budget monetaire journalier et mensuel global ;
- alerte avant depassement et coupe-circuit automatique ;
- modele adapte a la complexite, sans utiliser le plus couteux par defaut ;
- cache seulement pour des sorties non personnelles et strictement identiques.

Les quotas ne doivent pas transformer une fonction essentielle en impasse. Une
limite atteinte declenche le fallback deterministe et un message neutre.

Le cout mesure inclut au minimum : fournisseur, tokens d'entree et de sortie,
reessais, moderation, stockage d'evaluation et supervision.

## 12. Fallback sans IA

L'indisponibilite de l'IA ne bloque jamais :

- l'ouverture de l'application ;
- l'onboarding ;
- la saisie et la modification des donnees ;
- le mode hors ligne ;
- la synchronisation cloud ;
- les constats deterministes ;
- l'export ou la suppression des donnees.

Fallbacks attendus :

- reformulation : conserver la saisie originale et les suggestions locales ;
- clarification : afficher les choix deterministes ou autoriser `Je ne sais pas` ;
- analyse : afficher le constat produit par le contrat d'analyse ;
- conversation : indiquer l'indisponibilite sans inventer une reponse locale.

Aucune requete ne doit etre rejouee silencieusement apres une deconnexion, un
changement de compte ou un retrait de consentement.

## 13. Sorties structurees et validation

Chaque appel utilise un schema de sortie ferme, propre a la fonction et
versionne. Une sortie libre ne peut pas etre affichee directement dans une zone
qui pilote le produit.

Le validateur rejette notamment :

- identifiants ou preuves absents du contexte d'entree ;
- fait, score ou nombre non fourni par le moteur ;
- diagnostic, causalite certaine ou conseil medical ;
- mutation implicite ;
- action pendant la phase descriptive ;
- affichage nutritionnel interdit ;
- sortie depassant les limites de longueur ou de langue ;
- contenu ne respectant pas la forme attendue.

Une sortie rejetee ne fait pas l'objet d'une boucle infinie de correction. Haru
utilise le fallback deterministe et journalise uniquement la categorie d'erreur.

## 14. Observabilite et audit

Chaque requete produit des metadonnees techniques minimales :

- identifiant de requete ;
- fonction IA et version de schema ;
- version du prompt et du contrat deterministe ;
- fournisseur et version du modele effectivement utilise ;
- horodatage, latence, statut et nombre de tentatives ;
- volume d'entree/sortie et cout estime ;
- resultat des validateurs et filtres de securite ;
- utilisation du fallback ;
- categorie de consentement active.

Les tableaux de bord ne stockent pas le contenu personnel brut par defaut. Les
acces aux echantillons d'evaluation sont limites, traces et revocables.

Les indicateurs produit doivent mesurer utilite et securite, pas maximiser le
nombre de conversations ou la dependance a l'IA.

## 15. Versionnement des prompts et modeles

- chaque prompt possede un identifiant immuable et une version semantique ;
- le prompt reference les versions des schemas et contrats compatibles ;
- toute modification fonctionnelle cree une nouvelle version ;
- les changements de modele sont testes comme des changements de comportement ;
- le routage de modele est configure cote serveur ;
- les versions sont presentes dans les journaux et resultats d'evaluation ;
- un rollback vers la derniere version validee doit etre immediat ;
- aucun prompt de production n'est modifie directement depuis le client.

Les exemples de prompt ne sont pas la source de verite. Les schemas, les tests et
les regles du present contrat priment.

## 16. Evaluation avant production

Un jeu d'evaluation versionne doit couvrir des donnees synthetiques, des cas
reels pseudonymises autorises et des cas adverses.

### Exactitude factuelle

- aucune date, quantite, frequence ou aliment invente ;
- citations des preuves presentes dans l'entree ;
- conservation du statut `inconnu` ;
- respect des niveaux de confiance ;
- absence de tendance avec donnees insuffisantes.

### Comportement produit

- distinction nette entre fait et hypothese ;
- aucune action pendant les sept premiers jours ;
- une seule hypothese ou experience prioritaire lorsque le contrat l'impose ;
- ton neutre, clair, non culpabilisant ;
- reformulation fidele et clarification minimale ;
- fallback lisible lorsque le service echoue.

### Securite

- aucune mutation sans confirmation ;
- aucun diagnostic ou traitement ;
- aucune causalite fabriquee ;
- aucune fuite entre utilisateurs ;
- aucune exposition de secrets, prompts ou identifiants ;
- resistance aux instructions injectees dans les notes utilisateur ;
- refus des demandes incompatibles avec les politiques d'affichage.

### Robustesse

- fautes, langage familier, phrases incompletes et melange de langues ;
- repas ambigus et aliments non reconnus ;
- absence de reseau, timeout, reponse vide et schema invalide ;
- changement de compte, retrait de consentement et suppression de compte ;
- comportements stables a version de prompt identique.

Les seuils chiffres de reussite doivent etre fixes avant chaque tranche. Les cas
de securite critiques exigent zero regression connue pour la version candidate.

## 17. Red-team

La campagne red-team inclut au minimum :

- demande de diagnostic ou de certitude psychologique ;
- demande de regime extreme ou de compensation par le sport ;
- tentative d'obtenir une causalite a partir d'une seule observation ;
- instruction malveillante placee dans un aliment ou une note ;
- demande de modifier ou supprimer une donnee sans confirmation ;
- tentative d'acceder aux donnees d'un autre utilisateur ;
- contournement de la phase descriptive des sept jours ;
- extraction du prompt, des secrets ou de la configuration ;
- contenu sensible lie aux troubles alimentaires, au tabac ou a une crise ;
- sortie nutritionnelle detaillee malgre `internal_only` ;
- surcharge de requetes et attaque sur les couts ;
- relecture d'un ancien contexte apres deconnexion.

Chaque incident produit un cas de regression permanent, sans conserver plus de
donnees personnelles que necessaire.

## 18. Criteres de mise en production

Une tranche IA peut passer en production uniquement si :

- son objectif et son perimetre sont valides humainement ;
- le consentement et le retrait ont ete testes sur mobile ;
- le fournisseur respecte les exigences de confidentialite et de retention ;
- l'analyse de risques, la documentation utilisateur et la procedure d'incident
  sont terminees ;
- les schemas, validateurs, quotas, observabilite et coupe-circuit sont actifs ;
- le jeu d'evaluation atteint les seuils approuves ;
- la campagne red-team ne contient aucun bloquant ouvert ;
- le fallback deterministe fonctionne hors ligne et en cas de panne ;
- le cout maximal par utilisateur et le budget global sont connus ;
- le rollback a ete exerce ;
- la suppression et le retrait de consentement ont ete verifies ;
- un test limite sur de vrais telephones a confirme lisibilite et latence ;
- aucune regression n'affecte les donnees, la synchronisation ou la PWA.

La mise en production est progressive : equipe interne, petit groupe volontaire,
puis elargissement controle. Un succes d'evaluation automatique ne remplace pas
la validation humaine.

## 19. Ordre de deploiement en petites tranches

Cet ordre commence seulement apres le branchement du contrat d'analyse Repas,
Aujourd'hui et Carnet.

### Tranche 0 - Fondations

- source deterministe unique branchee ;
- adaptateur de contexte minimal ;
- schemas de sortie et validateurs ;
- consentement, quotas, observabilite, coupe-circuit et fallback ;
- aucun texte IA visible en production.

### Tranche 1 - Reformulation assistee

- correction et reformulation d'un fragment courant ;
- original conserve ;
- confirmation obligatoire ;
- aucune lecture du profil ou de l'historique.

### Tranche 2 - Clarification du repas

- une question ciblee sur une ambiguite utile ;
- reponse facultative ;
- aucune estimation ou mutation automatique ;
- comparaison avec une version entierement deterministe.

### Tranche 3 - Mise en mots de l'analyse

- formulation d'un resultat `meal`, puis `day`, puis `week` ;
- preuves et limites fournies par le moteur ;
- sept premiers jours toujours descriptifs ;
- test en lecture seule avant toute experience proposee.

### Tranche 4 - Conversation encadree

- questions sur un resultat deterministe explicitement selectionne ;
- contexte court et pseudonymise ;
- aucune memoire implicite ;
- orientation de securite et refus testes.

### Tranche 5 - Experiences accompagnees

- uniquement apres validation des tranches precedentes ;
- experience deja autorisee par le moteur ;
- formulation et suivi conversationnel possibles ;
- mesure de l'effet assuree par les donnees Haru, pas par l'IA.

Chaque tranche peut etre arretee ou retiree sans bloquer les precedentes ni le
coeur deterministe de l'application.

## 20. Decisions encore humaines

Ce contrat ne tranche pas :

- le fournisseur et le modele ;
- le lieu d'hebergement ;
- les durees finales de retention ;
- les seuils chiffres d'evaluation et de cout ;
- les ecrans exacts de consentement ;
- le niveau de personnalisation conversationnelle ;
- la disponibilite gratuite ou payante de chaque fonction ;
- l'activation d'une memoire conversationnelle longue ;
- l'usage eventuel de donnees reelles pour l'evaluation.

Ces decisions exigent une validation produit, securite, confidentialite et
budgetaire avant implementation.

## 21. Definition de termine pour ce contrat

Le present document est pret a etre transforme en chantiers techniques lorsque :

- les quatre usages et leurs interdits sont acceptes ;
- la minimisation des donnees est validee ;
- les regles de consentement et de retention sont arbitrees ;
- les criteres d'evaluation et de production sont chiffres ;
- l'ordre des tranches est confirme ;
- le contrat d'analyse est effectivement branche dans l'application.

Jusqu'a cette validation, aucune dependance, aucun service et aucun ecran IA ne
doit etre ajoute au produit.
