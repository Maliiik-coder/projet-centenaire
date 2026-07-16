# Références Nutritionnelles Haru

## Principe

Haru utilise deux couches distinctes :

- **Ciqual** : catalogue canonique d'aliments et composition pour 100 g ;
- **portions usuelles** : repères humains versionnés, exprimés en fourchettes.

Ces couches ne doivent pas produire de valeur nutritionnelle visible dans le
carnet quotidien. Elles servent d'abord aux analyses internes et, plus tard, aux
recettes structurées.

## Ciqual

Source cible :

- Anses, table Ciqual 2025 ;
- 3 484 aliments ;
- 74 constituants ;
- formats Excel et XML ;
- licence ouverte Etalab 2.0 ;
- citation attendue : `Anses. 2025. Table de composition nutritionnelle des aliments Ciqual 2025. https://doi.org/10.57745/RDMHWY`.

Contrat local :

- `src/lib/nutrition/foodReference.ts` définit la source, les nutriments
  principaux et le parseur de valeurs numériques ;
- une valeur inconnue reste inconnue ;
- une valeur du type `< 0,5` garde son qualificatif `less_than` ;
- aucune quantité n'est déduite depuis Ciqual.

## Portions Usuelles

La portion usuelle est séparée de Ciqual. Elle peut venir :

- d'une source de santé publique ;
- d'un repère réglementaire ou professionnel ;
- d'une portion déclarée sur emballage ;
- d'un repère éditorial Haru, clairement marqué comme tel.

Contrat local :

- `src/lib/nutrition/portionCatalog.ts` contient un premier catalogue très court ;
- chaque entrée a une source, une version, une confiance et une fourchette
  `low / central / high` ;
- les entrées éditoriales sont des repères de tendance, pas une vérité de
  consommation.

Repères initiaux :

- portion adulte fruit/légume : 80 à 100 g ;
- bol de soupe : repère 250 ml, converti en fourchette interne ;
- pot de yaourt : graine éditoriale ;
- assiette de pâtes cuites : graine éditoriale ;
- assiette de riz cuit : graine éditoriale.

## Estimation Interne

`src/lib/nutrition/nutritionEstimate.ts` combine :

- un aliment Ciqual ;
- une portion usuelle ;
- un multiplicateur éventuel.

La sortie est une fourchette interne avec `displayPolicy: "internal_only"`.

## Sources À Réexaminer

- INCA 3 est utile pour comprendre les consommations françaises, mais ne remplace
  pas directement une base de portions par aliment.
- Open Food Facts peut aider pour les portions déclarées de produits emballés,
  mais ne doit pas devenir une vérité de portion générale.
- Les grammages de restauration collective peuvent inspirer certains repères,
  mais ils ne décrivent pas forcément les usages adultes au domicile.
