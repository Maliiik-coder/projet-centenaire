# Projet Centenaire : contrat de refonte visuelle

Statut : Phase 1 sur 4, audit et contrat uniquement. Ce document ne déclenche aucune modification de l'interface ni du comportement produit.

## 1. Décision de direction artistique

**Un compagnon du quotidien clair, calme, humain et immédiatement compréhensible.**

Projet Centenaire doit devenir une application mobile de suivi personnel sobre et rassurante. L'interface doit aider à noter une information en quelques secondes, relire une journée sans effort et comprendre un constat sans vocabulaire technique.

La notion de carnet reste utile dans le langage produit, la chronologie et la relation intime aux données. En revanche, la métaphore visuelle du vieux document, du papier jauni ou du dossier administratif n'est plus structurante. La cible est un carnet numérique contemporain : surfaces nettes, hiérarchie stable, gestes évidents et densité maîtrisée.

Principes directeurs :

- mobile-first, avec une zone de contenu centrée et lisible sur grand écran ;
- une action principale identifiable par vue ;
- une donnée visible est actionnable lorsque le produit le permet ;
- priorité au texte courant, aux états et aux contrôles familiers ;
- contraste accessible, focus visible et zones tactiles généreuses ;
- peu d'ornement, peu d'ombres, aucune décoration gratuite ;
- sérénité sans mollesse : l'interface reste précise, rapide et opérationnelle.

## 2. Ce que les références nous apprennent

Aucun fichier de référence visuelle externe n'était joint à cette phase. L'audit repose donc sur l'application locale actuelle, les captures produites à 390 px et la direction explicitement décrite dans le brief.

Les éléments actuels à préserver comme acquis :

- une expérience pensée d'abord pour le téléphone ;
- une identité calme, personnelle et non culpabilisante ;
- la marque et son logo comme repère d'entrée ;
- la chronologie comme métaphore centrale du carnet ;
- l'accès direct aux données du jour ;
- des panneaux dédiés pour les saisies courtes ;
- un tunnel repas question par question ;
- une navigation principale courte et persistante ;
- une couleur bleu pétrole déjà associée aux actions secondaires.

Les enseignements de l'usage actuel sont clairs : l'application gagne en compréhension lorsque le contenu est découpé en surfaces courtes, que la valeur principale est plus visible que son libellé et que le nombre de boutons forts est limité.

## 3. Ce que nous ne reprenons pas

La refonte ne doit pas reconduire :

- le fond ivoire dominant et l'effet papier ancien ;
- la typographie serif sur les titres opérationnels ;
- les grandes capsules utilisées comme solution universelle ;
- les cartes imbriquées qui diluent la hiérarchie ;
- les variations arbitraires de rayons, d'ombres et de gris ;
- les séparateurs horizontaux répétés ;
- les boutons noirs multiples sur un même écran ;
- les écrans qui ressemblent à des formulaires administratifs ;
- les icônes seules lorsque leur sens n'est pas immédiatement universel ;
- les états uniquement différenciés par la couleur ;
- les animations décoratives ou lentes.

`rounded-full` est réservé aux tags, indicateurs, statuts et avatars éventuels. Les cartes, champs et boutons ont des coins doux, mais ne sont pas des pilules.

## 4. Périmètre produit et non-objectifs

Cette refonte couvre uniquement la présentation, l'ergonomie visuelle, la cohérence responsive et l'accessibilité des fonctionnalités existantes de la V0.7.1.

Périmètre :

- onboarding et accès au compte ;
- page du jour, poids, tabac et chronologie ;
- carnet et filtres ;
- constats et courbe de poids ;
- profil, préférences, compte et options avancées ;
- tunnel repas et ses états de modification ;
- états de chargement, indisponibilité cloud, migration, réinitialisation et hors ligne ;
- mode clair, mode sombre, safe areas et comportement mobile.

Non-objectifs :

- aucune modification du modèle de données, de Supabase ou des politiques RLS ;
- aucune modification des règles de diagnostic ou du tunnel repas V0.7.1 ;
- aucune nouvelle fonctionnalité métier ;
- aucun ajout de calories, sport, communauté, IA complète, gamification, notifications ou dashboard complexe ;
- aucune modification du service worker, de l'authentification ou de la synchronisation ;
- aucune nouvelle page marketing ;
- aucune refonte du logo.

## 5. Audit de l’interface actuelle

### Métaphore visuelle

L'interface actuelle matérialise fortement le « carnet de terrain » par un fond ivoire, des surfaces chaudes, des titres serif et des bordures brunes. Cette cohérence donne une personnalité identifiable, mais elle rapproche aussi l'application d'un document imprimé. Sur les écrans denses, la métaphore prend le pas sur la rapidité de lecture.

### Structure et densité

La page du jour est la vue la plus aboutie : tuiles tactiles, action repas dominante et chronologie compacte. Le Carnet reste lisible mais ses quatre filtres égaux sont serrés à 390 px. Constats et Profil concentrent davantage de surfaces, d'encadrements et de niveaux internes. Les écrans de saisie utilisent plusieurs logiques visuelles selon la fonctionnalité.

### Couleurs et styles bruts

L'audit du code relève environ 27 valeurs hexadécimales distinctes, avec plusieurs doublons de casse ou de nuance. Les valeurs les plus présentes sont `#171512`, `#3A3732`, `#7A7166`, `#DDD5C7`, `#FAF8F1` et `#F3EDE2`. Le bleu pétrole existe sous plusieurs formes proches : `#2F4E55`, `#2F5E68`, `#3E6670` et `#3e6670`.

Les styles utilisent actuellement :

- neuf rayons explicites entre 12 et 28 px, en plus de `rounded-full` ;
- au moins dix-neuf recettes d'ombre proches mais différentes ;
- de nombreuses couleurs Tailwind arbitraires répétées ;
- des surcharges globales du mode sombre basées sur des correspondances de classes et plusieurs `!important` ;
- un mélange entre serif générique et Arial, donc un rendu dépendant du système.

### Responsive et plateforme

Les fondations techniques utiles sont déjà présentes : unités `svh` et `dvh`, variables de safe area, panneaux fixes, navigation basse flottante et largeur de contenu limitée. Les principaux risques viennent des textes longs, des groupes de contrôles sur une seule ligne, du clavier mobile et de l'empilement entre navigation, panneaux et menus contextuels.

### Architecture de présentation

`ProjetCentenaireApp.tsx` contient à la fois les effets cloud et hors ligne, les transitions métier, les gestionnaires d'interaction et la majorité du rendu des quatre vues principales. Cette concentration augmente le risque d'une refonte visuelle qui modifierait involontairement un comportement. Les futures extractions devront être strictement présentationales et conserver les gestionnaires, contrats de données et frontières Client existants.

Conformément à la documentation Next.js locale de cette version, les composants serveur restent le choix par défaut. Les frontières `use client` doivent être aussi étroites que possible et limitées aux interactions, effets et API du navigateur. Les tokens véritablement globaux pourront vivre dans la feuille globale ; les styles propres à un composant devront rester proches de ce composant.

## 6. Inventaire des écrans

### Démarrage et compte

- chargement initial et « Ouverture du carnet » ;
- avertissement de stockage local ;
- login avec Supabase configuré ou absent ;
- soumission Google, succès, erreur et action Apple indisponible ;
- callback d'authentification sans interface ;
- compte connecté ou sans session ;
- suppression de compte : validation, chargement, erreur et succès ;
- écran hors ligne générique ;
- route de santé technique.

### Onboarding

- accueil ;
- étapes progressives prénom, âge, taille, poids actuel et objectif ;
- question fumeur, puis souhait d'arrêt conditionnel ;
- frein principal ;
- erreurs de validation ;
- confirmation finale ;
- variantes avec clavier mobile et retour à l'étape précédente.

### États cloud et migration

- chargement cloud ;
- cloud indisponible avec miroir utilisateur ;
- synchronisation en attente ou réussie ;
- décision de migration bloquante ;
- association des données locales au compte ;
- conservation des seules données du compte ;
- réinitialisation connectée en cours, réussie ou échouée.

### Page du jour

- mission affichée, masquée ou vide ;
- poids absent ou renseigné ;
- repas absent ou plusieurs observations ;
- tabac masqué pour un non-fumeur ;
- tabac non renseigné, aucun, envie forte ou cigarettes ;
- chronologie vide ou alimentée ;
- menu contextuel d'une observation après appui long ;
- confirmation native de suppression ;
- notifications locales et cloud.

### Carnet

- filtres Tout, Repas, Mesures et Tabac ;
- liste vide ;
- journées regroupées et alimentées ;
- repas, mesure et événement tabac dans une même journée ;
- modification et suppression d'un repas.

### Constats

- données insuffisantes ;
- constats repas disponibles ;
- constats tabac masqués, vides ou alimentés ;
- poids insuffisant ;
- courbe de poids disponible et infobulle.

### Profil et paramètres

- résumé de profil ;
- édition du profil avec validation ;
- préférences mission et mode sombre ;
- compte local ou connecté ;
- options avancées repliées ou ouvertes ;
- export JSON ;
- import JSON réussi ou en erreur ;
- confirmation de réinitialisation locale.

### Panneaux de saisie

- mesure du matin : vide, préremplie, validation et erreur ;
- tabac : Aucun, Envie forte, Cigarette et déclencheur facultatif ;
- tunnel repas : création ou modification, quatre types de repas, étapes dynamiques, clarifications, validation et erreurs.

## 7. Inventaire des composants

### Composants et motifs existants

- `Logo` et conteneurs de marque distincts selon les routes ;
- en-tête de la page du jour et en-têtes de sections ;
- navigation basse à quatre entrées ;
- tuiles Poids, Repas et Tabac ;
- cartes de chronologie `TodayChronologyMeal` et `ChronologyMeal` ;
- filtres du Carnet ;
- `Fact`, `ConstatPart` et `WeightTrendChart` ;
- `TextInput`, `NumberInput` et zones de texte ;
- `ActionPanel`, `WeightPanel` et `SmokingPanel` ;
- `MealObservation`, `TunnelQuestion`, `TunnelChoiceLine` et `ClarificationQuestion` ;
- `EmptyState` ;
- toasts et bannières d'état ;
- interrupteurs de préférences ;
- menus contextuels et confirmations natives.

### Variantes à inventorier avant toute migration

- primaire, secondaire, discret, danger, désactivé et chargement pour les commandes ;
- défaut, focus, rempli, erreur et désactivé pour les champs ;
- sélectionné, non sélectionné et indisponible pour les choix ;
- neutre, succès, avertissement et erreur pour les statuts ;
- vide, compact, interactif et non interactif pour les surfaces ;
- clair et sombre pour tous les composants ;
- standard, clavier ouvert, safe area haute et safe area basse pour les panneaux mobiles.

## 8. Incohérences constatées

- Les couleurs sémantiques ne sont pas centralisées et plusieurs bleus pétrole remplissent le même rôle.
- Les neuf rayons et les nombreuses ombres empêchent de reconnaître un niveau d'élévation stable.
- `rounded-full` est utilisé pour des contrôles, des conteneurs et des commandes qui ne sont ni des tags ni des statuts.
- La hiérarchie entre carte, section et bouton varie selon les vues.
- Certains écrans cumulent cartes dans cartes et bordures dans bordures.
- Les titres serif, les textes Arial et les tailles de page ne forment pas une échelle typographique commune.
- Le mode sombre dépend de sélecteurs globaux fragiles liés aux classes de couleur du mode clair.
- Les en-têtes de l'application, du login et du compte ne partagent pas exactement la même structure.
- Les affordances tactiles sont inégales : tuile entière, bouton texte, chevron, plus ou appui long.
- Les toasts, alertes, erreurs de champ et états cloud n'emploient pas un système de statut commun.
- Les confirmations natives n'ont pas la même présence visuelle que les panneaux internes.
- L'infobulle de la courbe et certains états restent conçus d'abord pour le thème clair.
- La navigation basse est uniquement iconographique, alors que d'autres zones explicitent davantage les actions.
- Les quatre filtres du Carnet ont une largeur égale peu tolérante aux petits écrans ou au texte agrandi.
- Les espacements verticaux ne suivent pas une échelle commune, notamment entre onboarding, page du jour et Profil.

## 9. Palette claire et sombre

Les couleurs ci-dessous sont des tokens cibles. Toutes les paires texte/fond devront être mesurées avant implémentation et atteindre au minimum WCAG AA pour leur usage réel.

### Palette claire

| Rôle | Token proposé | Valeur |
| --- | --- | --- |
| Fond application | `canvas` | `#F6F7F9` |
| Surface principale | `surface` | `#FFFFFF` |
| Surface secondaire | `surface-subtle` | `#F2F4F7` |
| Texte principal | `text` | `#1D2939` |
| Texte secondaire | `text-secondary` | `#667085` |
| Texte atténué | `text-muted` | `#98A2B3` |
| Bordure | `border` | `#E4E7EC` |
| Action principale | `primary` | `#315C62` |
| Action survolée | `primary-hover` | `#294F54` |
| Accent discret | `primary-subtle` | `#E8F1F0` |
| Focus | `focus` | `#4C7D83` |
| Succès texte / fond | `success` | `#2F6B45` / `#EAF6EE` |
| Avertissement texte / fond | `warning` | `#8A5A00` / `#FFF4D6` |
| Danger texte / fond | `danger` | `#A33D37` / `#FCECEA` |

`text-muted` est réservé aux informations non essentielles et aux états désactivés. Il ne doit pas porter seul une information métier importante.

### Palette sombre

| Rôle | Token proposé | Valeur |
| --- | --- | --- |
| Fond application | `canvas` | `#11171A` |
| Surface principale | `surface` | `#182126` |
| Surface élevée | `surface-elevated` | `#202B30` |
| Texte principal | `text` | `#F2F4F7` |
| Texte secondaire | `text-secondary` | `#B8C2C8` |
| Bordure | `border` | `#344148` |
| Action principale | `primary` | `#8AB8B9` |
| Accent discret | `primary-subtle` | `#233A3D` |
| Focus | `focus` | `#A7D2D2` |
| Succès texte / fond | `success` | `#79C38E` / `#183525` |
| Avertissement texte / fond | `warning` | `#E7B95D` / `#3A2E16` |
| Danger texte / fond | `danger` | `#E08A83` / `#422523` |

Le mode sombre doit utiliser directement ces tokens sémantiques. Il ne doit plus recolorer a posteriori des classes arbitraires du mode clair.

## 10. Typographie

Pile cible, sans téléchargement externe :

```css
ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

La serif peut rester dans le logo final, qui n'est pas redessiné. Elle n'est plus utilisée pour les titres opérationnels, les cartes, les panneaux ou les formulaires. Une exception ponctuelle sur une phrase d'accueil ne pourra être retenue qu'après comparaison visuelle et test de lisibilité.

Échelle cible :

| Usage | Taille | Interligne | Graisse |
| --- | --- | --- | --- |
| Métadonnée, tag | 12 px | 16 px | 500 ou 600 |
| Libellé, texte secondaire | 14 px | 20 px | 400 ou 500 |
| Corps, champ, bouton | 16 px | 24 px | 400, 500 ou 600 |
| Titre de section | 20 px | 28 px | 600 |
| Titre de page | 24 px | 32 px | 600 ou 700 |
| Question d'onboarding | 30 px | 38 px | 700 |

Règles :

- `letter-spacing: 0` par défaut ;
- aucune taille de police calculée à partir de la largeur du viewport ;
- paragraphes entre 1,45 et 1,55 d'interligne ;
- lignes courtes et libellés explicites ;
- chiffres tabulaires pour les séries temporelles si la police système le permet ;
- le texte doit rester utilisable avec zoom et taille système augmentée.

## 11. Espacements, rayons, ombres et mouvement

### Espacements et dimensions

- base : 4 px ;
- échelle : 4, 8, 12, 16, 24, 32, 40 et 48 px ;
- zone tactile minimale : 48 x 48 px ;
- largeur maximale du contenu applicatif : 480 px ;
- marge latérale mobile recommandée : 16 px, 20 px lorsque l'espace le permet ;
- aucun texte ne doit se superposer entre 320, 390 et 430 px de large.

### Rayons

- 4 px : éléments compacts et menus ;
- 6 px : champs et contrôles ;
- 8 px : cartes et boutons ;
- 12 px : panneaux plein écran, feuilles modales et surfaces exceptionnellement mises en avant ;
- `rounded-full` : tags, indicateurs, statuts et avatars uniquement.

### Bordures et ombres

- bordure standard : 1 px avec le token `border` ;
- pas d'ombre par défaut sur une simple section ;
- niveau 1 : `0 1px 2px rgba(16, 24, 40, 0.06)` ;
- niveau 2 : `0 8px 24px rgba(16, 24, 40, 0.12)` ;
- une ombre exprime une élévation réelle, pas une décoration.

### Icônes

- bibliothèque cible : Lucide, déjà préférée par les conventions du projet ;
- 16 px dans une ligne, 20 px dans un contrôle, 24 px dans la navigation ;
- trait entre 1,75 et 2 px ;
- icône accompagnée d'un libellé ou d'un nom accessible lorsque son sens n'est pas universel ;
- aucun SVG redessiné à la main lorsqu'une icône Lucide convient.

### Mouvement

- pression : 120 ms ;
- ouverture ou fermeture d'un panneau : 180 ms ;
- transition d'état : 200 ms maximum ;
- déplacement maximal recommandé : 2 px pour un état pressé ;
- pas d'animation de contenu au chargement qui retarde l'action ;
- respecter `prefers-reduced-motion` et supprimer les mouvements non essentiels.

### Niveaux d'empilement

- 0 : contenu ;
- 10 : en-tête ou élément sticky ;
- 20 : navigation basse ;
- 30 : voile ;
- 40 : panneau ou modale ;
- 50 : menu contextuel ;
- 60 : toast.

Les variables de safe area actuelles et les unités `svh` ou `dvh` sont conservées. Les panneaux fixes doivent rester au-dessus du clavier lorsque la plateforme le permet. La navigation basse ne doit jamais rendre un contenu ou une validation inaccessible.

## 12. Composants à créer ou harmoniser

### Fondations partagées

- `AppShell` : largeur, fond, safe areas et espace de navigation ;
- `BrandHeader` : logo complet, ratio stable et variantes de contexte ;
- `PageHeader` : titre, date, action éventuelle ;
- `BottomNav` : états actif, inactif, focus et libellé accessible ;
- `Surface` : niveaux simple, interactif et élevé ;
- `Button` : primaire, secondaire, discret et danger ;
- `IconButton` : taille tactile, focus et infobulle desktop ;
- `TextField`, `NumberField`, `TextArea` : libellé, aide, erreur et unités ;
- `ChoiceGroup` et `ChoiceCard` : sélection unique ou multiple ;
- `Switch` : activé, désactivé et focus ;
- `SegmentedControl` : filtres compacts avec débordement maîtrisé ;
- `Progress` : onboarding et tunnel repas ;
- `StatusBanner` et `ToastStack` : neutre, succès, avertissement et erreur ;
- `FullScreenPanel` ou `Modal` : voile, focus, fermeture et safe areas ;
- `ContextMenu` : appui long, clic extérieur et clavier ;
- `EmptyState`, `Metric`, `TodayActionTile` et `TimelineItem`.

### Vues présentationales à extraire progressivement

- `TodayView` ;
- `JournalView` ;
- `InsightsView` ;
- `ProfileView` ;
- `OnboardingView` ;
- `MealTunnelView` ;
- `WeightPanel` ;
- `SmokingPanel`.

Ces extractions reçoivent des données et des callbacks. Elles ne déplacent ni les effets de synchronisation, ni les règles de migration, ni les mutations cloud au cours de la refonte. Les frontières Client ne sont élargies que lorsqu'une interaction navigateur l'exige.

## 13. Plan de migration en quatre phases

### Phase 1 : audit et contrat

- inventorier les écrans, états, composants et dépendances ;
- capturer l'état mobile actuel ;
- fixer la direction, les tokens et les règles ;
- documenter les risques et critères d'acceptation ;
- ne modifier aucun code applicatif.

### Phase 2 : fondations visuelles

- introduire les tokens clair et sombre ;
- harmoniser le shell, la largeur, les safe areas et la typographie ;
- créer les primitives partagées sans changer les parcours ;
- remplacer progressivement les valeurs brutes dans un périmètre contrôlé ;
- ajouter des tests visuels ou de rendu sur les primitives critiques.

### Phase 3 : parcours critiques

- migrer onboarding et login ;
- migrer page du jour, navigation, poids et tabac ;
- migrer le tunnel repas sans modifier sa logique V0.7.1 ;
- migrer chronologie, menu contextuel, confirmations et toasts ;
- vérifier clavier, focus, appui long, mode hors ligne et synchronisation.

### Phase 4 : surfaces secondaires et recette

- migrer Carnet, Constats, Profil et Compte ;
- migrer migration locale, réinitialisation, hors ligne et santé ;
- finaliser le mode sombre ;
- tester 320, 390 et 430 px, grand écran, zoom et texte agrandi ;
- effectuer la recette fonctionnelle cloud, locale, PWA et accessibilité ;
- supprimer les anciens styles seulement après validation de chaque vue.

L'ordre est volontaire : les primitives précèdent les écrans, puis les parcours de saisie précèdent les écrans de lecture et d'administration.

## 14. Risques de régression

- Confondre refonte visuelle et déplacement des effets cloud, du pending ou de la migration.
- Remonter des données d'un autre scope utilisateur en modifiant le démarrage ou la déconnexion.
- Casser le miroir hors ligne ou déclencher une sauvegarde avant réconciliation cloud.
- Modifier les étapes dynamiques de l'onboarding ou du tunnel repas en extrayant leur rendu.
- Dupliquer une observation lors d'une modification ou perdre les tags pendant un retry.
- Casser l'appui long, le clic extérieur ou les commandes clavier du menu repas.
- Masquer un bouton derrière le clavier, la navigation basse ou une safe area.
- Rendre le logo incomplet en contraignant son conteneur.
- Perdre le rafraîchissement de date au focus, à la visibilité ou au changement de minute.
- Transformer le mode sombre en simple inversion et dégrader les contrastes des graphiques.
- Modifier un texte métier, un état « Non renseigné » ou une règle tabac pendant la migration visuelle.
- Casser le fonctionnement sans Supabase configuré.
- Introduire une nouvelle frontière Client trop large ou une divergence d'hydratation.
- Modifier involontairement le service worker, le manifest, l'authentification ou les migrations SQL.
- Dégrader les lecteurs d'écran en remplaçant un libellé par une icône sans nom accessible.

Chaque phase d'implémentation devra être validée avec les commandes du projet et une recette manuelle ciblée. La comparaison visuelle ne remplace pas les tests métier existants.

## 15. Problèmes UX repérés mais non modifiés

Cette phase ne corrige aucun des points suivants :

- `ProjetCentenaireApp.tsx` concentre rendu, effets et interactions dans un fichier très volumineux ;
- aucune vue Next.js dédiée `loading`, `error` ou `not-found` n'est actuellement présente ;
- l'appui long sur un repas est peu découvrable sans apprentissage ;
- la « Chronologie du jour » montre principalement les repas, pas l'ensemble des événements du jour ;
- Profil et `/account` présentent des responsabilités qui se recoupent ;
- l'indisponibilité cloud peut être perçue comme un état transitoire peu explicite ;
- la navigation uniquement iconographique peut demander un apprentissage à un nouveau public ;
- les confirmations natives ne sont pas cohérentes avec les panneaux de l'application ;
- les quatre filtres du Carnet sont serrés à 390 px et fragiles avec un texte agrandi ;
- la serif générique varie selon le système ;
- certains écrans d'onboarding laissent un espace vertical important selon le clavier et la hauteur disponible ;
- l'absence de références visuelles externes limite la comparaison à l'état local et au brief.

Ces sujets sont consignés pour arbitrage. Ils ne constituent pas une autorisation de modifier la logique produit au cours des phases suivantes.

## 16. Captures de référence de l’état actuel

Captures réalisées localement le 15 juillet 2026 dans un viewport mobile de 375 à 390 px. Les vues courtes font 844 px de haut ; la vue Profil est une capture pleine page. Un profil synthétique « Camille » a été utilisé sur l'origine locale de contrôle. Aucune donnée cloud ni donnée personnelle réelle n'a été injectée.

- [01 - Onboarding](visual-redesign/before/01-onboarding.png)
- [02 - Page du jour](visual-redesign/before/02-page-du-jour.png)
- [03 - Carnet](visual-redesign/before/03-carnet.png)
- [04 - Profil](visual-redesign/before/04-profil.png)
- [05 - Tunnel repas](visual-redesign/before/05-tunnel-repas.png)

Ces images constituent la référence « avant ». Elles servent à vérifier qu'une future migration améliore la hiérarchie sans supprimer d'état, d'action ou d'information.

## 17. Critères d'acceptation

### Pour cette Phase 1

- les 17 sections du contrat sont présentes ;
- la phrase de direction est fixée sans ambiguïté ;
- les écrans, états, composants et variantes actuels sont inventoriés ;
- les palettes claire et sombre sont définies par rôle ;
- typographie, espacements, rayons, ombres, mouvement, icônes et niveaux sont spécifiés ;
- l'ordre des quatre phases est explicite ;
- les dépendances sensibles et risques fonctionnels sont documentés ;
- cinq captures mobiles « avant » sont disponibles ;
- seule la formulation de direction artistique est ajustée dans le Product Board ;
- aucun fichier applicatif, public, package ou Supabase n'est modifié.

### Pour les futures phases d'implémentation

- la phrase « Un compagnon du quotidien clair, calme, humain et immédiatement compréhensible. » est perceptible sur chaque vue ;
- les fonctionnalités, données, règles métier et parcours V0.7.1 restent inchangés ;
- le mode local, le cloud, l'authentification, la migration et le pending continuent de fonctionner ;
- les vues restent utilisables à 320, 390 et 430 px, avec clavier, safe areas, zoom et texte agrandi ;
- les contrastes utiles atteignent WCAG AA et le focus clavier est visible ;
- toute action tactile mesure au moins 48 x 48 px ;
- une seule action visuellement forte domine une vue ;
- `rounded-full` n'est utilisé que pour les tags, indicateurs, statuts et avatars ;
- aucune carte n'est imbriquée dans une autre carte sans nécessité fonctionnelle ;
- les états ne reposent jamais uniquement sur la couleur ;
- le mode sombre utilise les mêmes tokens sémantiques que le mode clair ;
- les tests existants, le typecheck, le lint et le build restent au vert à chaque phase.
