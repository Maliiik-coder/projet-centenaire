import {
  type CiqualFoodReference,
  type CiqualNutrientKey,
  type NumericFoodValue,
  nutrientValuePerQuantity,
} from "@/lib/nutrition/foodReference";
import type {
  GramRange,
  PortionConfidence,
  UsualPortionReference,
} from "@/lib/nutrition/portionCatalog";

export interface NutrientRangeEstimate {
  low: NumericFoodValue;
  central: NumericFoodValue;
  high: NumericFoodValue;
}

export type NutritionEstimateConfidence = "low" | "medium" | "high";

export interface InternalNutritionEstimate {
  ciqualCode: string;
  ciqualName: string;
  sourceVersion: string;
  portionReferenceId: string;
  gramRange: GramRange;
  nutrients: Record<CiqualNutrientKey, NutrientRangeEstimate>;
  confidence: NutritionEstimateConfidence;
  displayPolicy: "internal_only";
}

export function estimateNutritionForPortion({
  food,
  portion,
  multiplier = 1,
}: {
  food: CiqualFoodReference;
  portion: UsualPortionReference;
  multiplier?: number;
}): InternalNutritionEstimate | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;

  const gramRange = {
    low: roundGram(portion.gramRange.low * multiplier),
    central: roundGram(portion.gramRange.central * multiplier),
    high: roundGram(portion.gramRange.high * multiplier),
  };

  const nutrientKeys = Object.keys(
    food.nutrientsPer100g,
  ) as CiqualNutrientKey[];

  return {
    ciqualCode: food.ciqualCode,
    ciqualName: food.name,
    sourceVersion: food.sourceVersion,
    portionReferenceId: portion.id,
    gramRange,
    nutrients: Object.fromEntries(
      nutrientKeys.map((key) => [
        key,
        {
          low: nutrientValuePerQuantity(food.nutrientsPer100g[key], gramRange.low),
          central: nutrientValuePerQuantity(
            food.nutrientsPer100g[key],
            gramRange.central,
          ),
          high: nutrientValuePerQuantity(
            food.nutrientsPer100g[key],
            gramRange.high,
          ),
        },
      ]),
    ) as Record<CiqualNutrientKey, NutrientRangeEstimate>,
    confidence: estimateConfidence(portion.confidence),
    displayPolicy: "internal_only",
  };
}

function estimateConfidence(
  portionConfidence: PortionConfidence,
): NutritionEstimateConfidence {
  if (portionConfidence === "high") return "high";
  if (portionConfidence === "medium") return "medium";
  return "low";
}

function roundGram(value: number): number {
  return Math.round(value * 10) / 10;
}
