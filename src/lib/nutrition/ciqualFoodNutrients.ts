import {
  CIQUAL_2025_SOURCE,
  type CiqualFoodReference,
  type NutrientsPer100g,
} from "@/lib/nutrition/foodReference";
import ciqualNutrientsArtifact from "@/lib/nutrition/generated/ciqual-2025-nutrients.json";
import type { CiqualArtifactMetadata } from "@/lib/nutrition/ciqualFoods";

interface CiqualNutrientFood {
  code: string;
  name: string;
  groupName: string | null;
  subGroupName: string | null;
  subSubGroupName: string | null;
  nutrientsPer100g: NutrientsPer100g;
}

interface CiqualNutrientsArtifact {
  metadata: CiqualArtifactMetadata & {
    nutrientSourceCodes: Record<
      keyof NutrientsPer100g,
      {
        ciqualCode: string;
        name: string | null;
      }
    >;
  };
  foods: CiqualNutrientFood[];
}

const ciqualNutrients = ciqualNutrientsArtifact as CiqualNutrientsArtifact;
const nutrientsByCode = new Map(
  ciqualNutrients.foods.map((food) => [food.code, food]),
);

export const CIQUAL_2025_NUTRIENT_METADATA = ciqualNutrients.metadata;

export function getCiqualFoodReference(
  ciqualCode: string | null | undefined,
): CiqualFoodReference | null {
  if (!ciqualCode) return null;
  const food = nutrientsByCode.get(ciqualCode);
  if (!food) return null;

  return {
    source: CIQUAL_2025_SOURCE.id,
    sourceVersion: "2025",
    ciqualCode: food.code,
    name: food.name,
    groupName: food.groupName,
    subGroupName: food.subGroupName,
    subSubGroupName: food.subSubGroupName,
    nutrientsPer100g: food.nutrientsPer100g,
  };
}
