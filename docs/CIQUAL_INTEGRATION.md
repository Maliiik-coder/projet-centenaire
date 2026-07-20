# Integration CIQUAL 2025

## Frontiere client

L'autocomplete Repas importe uniquement `src/lib/nutrition/ciqualFoods.ts`.
Ce module charge l'index de recherche `ciqual-2025-index.json` et expose les
resultats avec les vrais codes CIQUAL, la source et la version.

L'index client ne contient aucun nutriment detaille. Il est volontairement
compact :

- `fields` fixe l'ordre des colonnes ;
- `foods` contient les lignes `[code, name, groupName, subGroupName,
  subSubGroupName, normalizedName]`.

Les nutriments detailles restent dans `src/lib/nutrition/ciqualFoodNutrients.ts`.
Ce module importe `ciqual-2025-nutrients.json` et doit rester reserve aux
traitements internes explicites, comme le contexte nutritionnel estime. Le
tunnel quotidien n'affiche pas ces valeurs.

## Sources

Version source : CIQUAL 2025, Anses, publication du 2025-11-19.

Dataset :

- DOI : `10.57745/RDMHWY`
- URL : `https://doi.org/10.57745/RDMHWY`
- Licence : Etalab Open License 2.0

Fichiers d'entree attendus dans `/tmp/ciqual-2025` par defaut :

| Fichier | Identifiant persistant | MD5 officiel | SHA-256 verifie localement |
| --- | --- | --- | --- |
| `alim_2025_11_03.xml` | `doi:10.57745/OH8KXC` | `8e1171d63cee4b6010cfce25dd29243d` | `e0b1de25b3039028205e9d54a96892e403e1b313c2efeb41180fabe132627478` |
| `alim_grp_2025_11_03.xml` | `doi:10.57745/FMNIUZ` | `c31aeea90349c3aab86f98ef5f4f10da` | `e216928be1001aed15ba1b120405b70a98145da2a1a76026d6e33542bd5e39dc` |
| `const_2025_11_03.xml` | `doi:10.57745/FWSPCX` | `d8f2f25fdacb887bc993a6eeaf80f203` | `3a231ea3e9836e4ac0b6ff94511e010210b2523d1b8b486c6b29e211066ba3f3` |
| `compo_2025_11_03.xml` | `doi:10.57745/O73GDX` | `2da725585946434df320d8041631998b` | `8c46a9032ece4eab4ffccc9dfcb0c490ec2f416aa664cc1ee013b241c6bdd4af` |

## Import reproductible

Commande de regeneration :

```bash
npm run import:ciqual
```

Commande equivalente explicite :

```bash
node scripts/import-ciqual-2025.mjs --source-dir /tmp/ciqual-2025 --out-dir src/lib/nutrition/generated
```

`scripts/import-ciqual-2025.mjs` utilise par defaut `sourceFileDate`
(`2025-11-03`) comme `importDate`. L'option `--import-date YYYY-MM-DD` permet un
changement explicite. Deux imports de la meme source et des memes parametres
produisent donc les memes artefacts ; une date d'execution variable ne doit pas
modifier seule les fichiers generes.

Artefacts generes verifies localement le 20 juillet 2026 :

| Artefact | Taille | SHA-256 |
| --- | ---: | --- |
| `src/lib/nutrition/generated/ciqual-2025-index.json` | 589 689 octets | `9cf9a81f969d8656497e038e14e107d7a4eda6a608b1535c2e445e8cb4dc762d` |
| `src/lib/nutrition/generated/ciqual-2025-nutrients.json` | 2 165 130 octets | `64e886040b990e57dcc211dd419ced0f1a8381928d0ecc0f57a4daed10968201` |

## Mesures build

Mesures Next 16.2.10/Turbopack, build de production froid apres suppression de
`.next`, JS client non compresse. La colonne "Avant" correspond a l'etat du
worktree avant compactage de l'index client ; la colonne "Apres" correspond a
ce format compact.

| Mesure | Avant | Apres |
| --- | ---: | ---: |
| Route `/` first load JS | 1 896 099 octets | 1 631 533 octets |
| Plus gros chunk client | 1 005 804 octets | 741 238 octets |
| Total JS client dans `.next/static/chunks` | 2 348 218 octets | 2 083 652 octets |
| `.next/static/chunks` | 2 408 Ko | 2 148 Ko |

Controle final : les chunks client statiques et le manifest client de `/` ne
contiennent pas `ciqual-2025-nutrients`, `nutrientsPer100g`, `energyKcal` ou
`sodiumMg`. Le chunk CIQUAL restant contient uniquement l'index de recherche.
