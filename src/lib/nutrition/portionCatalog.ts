import { normalizeFoodText } from "@/lib/foodDetection";

export const PORTION_CATALOG_VERSION = "haru-portions-v0.1";

export type PortionReferenceKind =
  | "public_health_reference"
  | "regulatory_reference"
  | "haru_editorial_seed"
  | "declared_packaging";

export type PortionConfidence = "low" | "medium" | "high";

export interface GramRange {
  low: number;
  central: number;
  high: number;
}

export interface MilliliterRange {
  low: number;
  central: number;
  high: number;
}

export interface PortionReferenceSource {
  kind: PortionReferenceKind;
  name: string;
  citation: string;
  url?: string;
}

export interface UsualPortionReference {
  id: string;
  version: typeof PORTION_CATALOG_VERSION;
  label: string;
  aliases: string[];
  units: string[];
  gramRange: GramRange | null;
  milliliterRange: MilliliterRange | null;
  confidence: PortionConfidence;
  source: PortionReferenceSource;
  note: string;
}

export const portionSources = {
  mangerBougerFruitVeg: {
    kind: "public_health_reference",
    name: "Manger Bouger - fruits et légumes",
    citation:
      "Manger Bouger indique qu’une portion adulte de fruits ou légumes correspond à 80 à 100 g.",
    url: "https://www.mangerbouger.fr/manger-mieux/a-tout-age-et-a-chaque-etape-de-la-vie/les-recommandations-alimentaires-pour-les-adultes/augmenter/augmenter-les-fruits-et-legumes",
  },
  ameliFruitVegSoup: {
    kind: "public_health_reference",
    name: "ameli.fr - fruits et légumes",
    citation:
      "ameli.fr indique 80 à 100 g pour une portion adulte de fruits ou légumes et cite un bol de soupe de 250 ml.",
    url: "https://www.ameli.fr/assure/sante/themes/alimentation/fruits-et-legumes/fruits-legumes-consommation",
  },
  haruEditorialSeed: {
    kind: "haru_editorial_seed",
    name: "Haru editorial seed",
    citation:
      "Repère éditorial Haru destiné aux fourchettes internes, à réviser avant affichage public.",
  },
} satisfies Record<string, PortionReferenceSource>;

export const initialUsualPortionCatalog: UsualPortionReference[] = [
  {
    id: "fruit-veg-adult-portion",
    version: PORTION_CATALOG_VERSION,
    label: "portion adulte de fruit ou légume",
    aliases: ["fruit", "pomme", "legume", "légume", "crudites", "crudités"],
    units: ["portion", "piece"],
    gramRange: { low: 80, central: 90, high: 100 },
    milliliterRange: null,
    confidence: "high",
    source: portionSources.mangerBougerFruitVeg,
    note: "Repère de santé publique ; ce n’est pas une portion personnalisée.",
  },
  {
    id: "soup-bowl",
    version: PORTION_CATALOG_VERSION,
    label: "bol de soupe",
    aliases: ["soupe", "bol de soupe"],
    units: ["bowl"],
    gramRange: null,
    milliliterRange: { low: 200, central: 250, high: 300 },
    confidence: "medium",
    source: portionSources.ameliFruitVegSoup,
    note: "La source parle en ml ; Haru ne convertit pas ce volume en grammes sans densité sourcée.",
  },
  {
    id: "yogurt-pot",
    version: PORTION_CATALOG_VERSION,
    label: "pot de yaourt",
    aliases: ["yaourt", "yogourt", "skyr", "fromage blanc"],
    units: ["piece", "portion"],
    gramRange: { low: 100, central: 125, high: 150 },
    milliliterRange: null,
    confidence: "medium",
    source: portionSources.haruEditorialSeed,
    note: "Repère courant à valider avec les contenants réels ou les recettes.",
  },
  {
    id: "cooked-pasta-plate",
    version: PORTION_CATALOG_VERSION,
    label: "assiette de pâtes cuites",
    aliases: ["pates", "pâtes", "assiette de pates", "assiette de pâtes"],
    units: ["plate", "portion"],
    gramRange: { low: 180, central: 250, high: 320 },
    milliliterRange: null,
    confidence: "low",
    source: portionSources.haruEditorialSeed,
    note: "Repère de tendance seulement ; une assiette de pâtes varie fortement selon la personne et le service.",
  },
  {
    id: "cooked-rice-plate",
    version: PORTION_CATALOG_VERSION,
    label: "assiette de riz cuit",
    aliases: ["riz", "assiette de riz"],
    units: ["plate", "portion"],
    gramRange: { low: 170, central: 230, high: 300 },
    milliliterRange: null,
    confidence: "low",
    source: portionSources.haruEditorialSeed,
    note: "Repère de tendance seulement ; à remplacer par une source plus robuste si disponible.",
  },
];

export function findUsualPortionReferences(
  query: string,
  unit?: string,
  catalog: UsualPortionReference[] = initialUsualPortionCatalog,
): UsualPortionReference[] {
  const normalizedQuery = normalizeFoodText(query);
  const normalizedUnit = unit ? normalizeFoodText(unit) : null;

  return catalog.filter((reference) => {
    const matchesUnit =
      !normalizedUnit ||
      reference.units.some((item) => normalizeFoodText(item) === normalizedUnit);

    return (
      matchesUnit &&
      reference.aliases.some((alias) =>
        normalizedQuery.includes(normalizeFoodText(alias)),
      )
    );
  });
}

export function isNutritionEstimablePortion(
  reference: UsualPortionReference,
): boolean {
  return (
    reference.source.kind !== "haru_editorial_seed" &&
    reference.gramRange !== null
  );
}

export function combineGramRanges(
  range: GramRange,
  multiplier: number,
): GramRange | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;

  return {
    low: roundGram(range.low * multiplier),
    central: roundGram(range.central * multiplier),
    high: roundGram(range.high * multiplier),
  };
}

function roundGram(value: number): number {
  return Math.round(value * 10) / 10;
}
