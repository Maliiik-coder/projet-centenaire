# Implémentation admin

## Chantier 5 - Maquette non branchée

La route `/admin` expose une maquette desktop-first du futur back-office Haru.
Elle est volontairement isolée de l'application mobile et ne charge que des
fixtures locales sous `src/lib/admin`.

En production, cette route est fermée par défaut et répond comme une route
inexistante. La prévisualisation ne peut être activée qu'avec la variable serveur
`HARU_ADMIN_PREVIEW_ENABLED=true`. Cette variable ne doit jamais être préfixée
par `NEXT_PUBLIC_`. En développement et pendant les tests, la maquette reste
visible sans configuration supplémentaire.

Garanties de cette passe :

- aucune connexion Supabase ;
- aucune migration ;
- aucun rôle réel ;
- aucune mutation ;
- aucune opération destructive ;
- aucune donnée réelle ;
- aucune clé privilégiée ;
- aucun changement dans les modules mobiles Haru.

## Surface couverte

- Vue générale ;
- Utilisateurs ;
- Abonnements ;
- Recettes ;
- Sport ;
- Signalements recettes ;
- Analyses/IA ;
- Exploitation technique ;
- Journal d'audit.

Chaque module possède une navigation, un tableau, des filtres, un panneau de
contexte, un état vide et des actions désactivées ou limitées à une simulation
visuelle locale.

## Contrats préparés, non branchés

Les fixtures anticipent des rôles, permissions et actions sensibles. Chaque
action déclare la permission future attendue ainsi qu'un contrat d'audit imposant
un acteur, une cible, un motif et un identifiant de corrélation. Le journal
fictif expose la même structure. Ces contrats ne contrôlent actuellement aucun
accès réel et ne déclenchent aucune écriture.

## Branchements futurs nécessaires

- authentification et autorisation serveur réelles derrière la garde de
  prévisualisation ;
- modèle de rôles administratifs dédié ;
- tables `admin_members` et `admin_audit_logs` avec RLS ;
- DTO serveur minimaux par module ;
- recherche support sans accès massif aux carnets personnels ;
- réconciliation des droits applicatifs avec le prestataire de paiement ;
- workflows contenus Recettes et Sport ;
- file de signalements limitée aux recettes publiques ;
- bancs de tests IA sur données fictives ou anonymisées ;
- relances techniques idempotentes et auditables ;
- confirmations avec motif et identifiant de corrélation pour toute action
  sensible.

## Politique PWA

Le service worker considère `/admin` comme une route sensible. Toute navigation
vers `/admin` ou l'un de ses sous-chemins utilise le réseau uniquement : aucune
réponse HTML admin n'est écrite dans le cache et aucun écran admin n'est servi
hors ligne. La version du cache a été incrémentée pour évacuer les anciennes
entrées.
