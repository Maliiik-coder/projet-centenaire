# Test reel 7 jours - V0.5

## Ce qu'on teste

- creation ou reprise du profil ;
- poids du matin, une seule mesure officielle par jour ;
- observations repas via le tunnel question par question ;
- tabac : `Non renseigne`, `Aucun`, `Envie forte`, `Cigarette` ;
- chronologie du jour ;
- constats ;
- connexion Supabase et persistance cloud ;
- installation PWA sur iPhone.

## Ce qu'on ne teste pas

- nouvelles fonctionnalites ;
- sport ;
- calories ;
- IA ;
- communaute ;
- badges ;
- notifications ;
- dashboard avance.

## Protocole quotidien

Chaque jour pendant 7 jours :

1. Ouvrir l'application sur iPhone.
2. Noter le poids du matin si la mesure a ete faite.
3. Ajouter les repas observes, sans chercher a etre parfait.
4. Noter le tabac uniquement si le suivi est active.
5. Consulter la chronologie en fin de jour.
6. Recharger l'application pour verifier que les donnees restent presentes.

## Retour rapide

Noter chaque jour :

- ouverture de l'application : OK / lent / bloque ;
- poids : OK / doublon / impossible ;
- repas : OK / trop long / erreur ;
- tabac : OK / ambigu / erreur ;
- chronologie : claire / confuse ;
- connexion : OK / deconnexion / erreur ;
- PWA iPhone : OK / probleme d'icone / probleme d'ouverture.

## Bugs bloquants

Sont bloquants :

- impossibilite d'ouvrir l'application ;
- perte de donnees ;
- connexion impossible ;
- crash pendant une saisie ;
- donnees d'un autre utilisateur visibles ;
- impossibilite de noter repas, poids ou tabac.

## Regle de test

Pendant les 7 jours, aucune nouvelle fonctionnalite n'est ajoutee.
On corrige uniquement les bugs bloquants ou les problemes qui empechent de tester
le produit reellement.
