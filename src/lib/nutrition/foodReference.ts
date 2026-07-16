import type { MealItemRecognitionStatus } from "@/lib/types";

export const CIQUAL_2025_SOURCE = {
  id: "ciqual-2025",
  name: "Table de composition nutritionnelle des aliments Ciqual 2025",
  producer: "Anses",
  citation:
    "Anses. 2025. Table de composition nutritionnelle des aliments Ciqual 2025. https://doi.org/10.57745/RDMHWY",
  url: "https://doi.org/10.57745/RDMHWY",
  license: "Etalab Open License 2.0",
} as const;

export type CiqualNutrientKey =
  | "energyKcal"
  | "proteinsG"
  | "carbohydratesG"
  | "sugarsG"
  | "fatG"
  | "saturatedFatG"
  | "fiberG"
  | "saltG"
  | "sodiumMg";

export type NumericFoodValueQualifier = "exact" | "less_than" | "unknown";

export interface NumericFoodValue {
  value: number | null;
  qualifier: NumericFoodValueQualifier;
}

export type NutrientsPer100g = Record<CiqualNutrientKey, NumericFoodValue>;

export interface CiqualFoodReference {
  source: typeof CIQUAL_2025_SOURCE.id;
  sourceVersion: "2025";
  ciqualCode: string;
  name: string;
  groupName: string | null;
  subGroupName: string | null;
  subSubGroupName: string | null;
  nutrientsPer100g: NutrientsPer100g;
}

export type FoodReferenceMatchStatus =
  | "safe"
  | "probable"
  | "ambiguous"
  | "unrecognized";

export interface FoodReferenceCandidate {
  rawText: string;
  status: FoodReferenceMatchStatus;
  recognitionStatus: MealItemRecognitionStatus;
  ciqualCode: string | null;
  canonicalName: string | null;
  confidence: number | null;
  sourceVersion: string | null;
}

export const EMPTY_NUTRIENTS_PER_100G: NutrientsPer100g = {
  energyKcal: { value: null, qualifier: "unknown" },
  proteinsG: { value: null, qualifier: "unknown" },
  carbohydratesG: { value: null, qualifier: "unknown" },
  sugarsG: { value: null, qualifier: "unknown" },
  fatG: { value: null, qualifier: "unknown" },
  saturatedFatG: { value: null, qualifier: "unknown" },
  fiberG: { value: null, qualifier: "unknown" },
  saltG: { value: null, qualifier: "unknown" },
  sodiumMg: { value: null, qualifier: "unknown" },
};

export function parseFoodNumber(value: unknown): NumericFoodValue {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { value, qualifier: "exact" }
      : { value: null, qualifier: "unknown" };
  }

  if (typeof value !== "string") {
    return { value: null, qualifier: "unknown" };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "traces") {
    return { value: null, qualifier: "unknown" };
  }

  const lessThanMatch = trimmed.match(/^<\s*(\d+(?:[,.]\d+)?)$/);
  if (lessThanMatch) {
    return {
      value: Number(lessThanMatch[1].replace(",", ".")),
      qualifier: "less_than",
    };
  }

  const normalized = Number(trimmed.replace(",", "."));
  return Number.isFinite(normalized)
    ? { value: normalized, qualifier: "exact" }
    : { value: null, qualifier: "unknown" };
}

export function nutrientValuePerQuantity(
  nutrient: NumericFoodValue,
  grams: number,
): NumericFoodValue {
  if (nutrient.value === null || grams <= 0) {
    return { value: null, qualifier: "unknown" };
  }

  return {
    value: roundNutrientValue((nutrient.value * grams) / 100),
    qualifier: nutrient.qualifier,
  };
}

function roundNutrientValue(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}
