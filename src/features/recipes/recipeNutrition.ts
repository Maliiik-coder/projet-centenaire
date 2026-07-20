import type {
  CiqualFoodReference,
  CiqualNutrientKey,
  NumericFoodValueQualifier,
} from "@/lib/nutrition/foodReference";
import {
  formatIngredientText,
  gramsFromIngredientQuantity,
} from "@/features/recipes/recipeModel";
import type {
  Recipe,
  RecipeIngredient,
  RecipeIngredientUnit,
} from "@/features/recipes/recipeTypes";

export const recipeNutritionNutrientKeys = [
  "energyKcal",
  "proteinsG",
  "carbohydratesG",
  "fatG",
  "fiberG",
  "saltG",
] as const satisfies readonly CiqualNutrientKey[];

export type RecipeNutritionNutrientKey =
  (typeof recipeNutritionNutrientKeys)[number];

export type RecipeNutritionStatus = "complete" | "partial" | "unavailable";

export type RecipeNutritionExclusionReason =
  | "legacy_text"
  | "missing_ciqual_code"
  | "unknown_ciqual_code"
  | "missing_grams";

export type RecipeNutritionValue = {
  qualifier: Extract<NumericFoodValueQualifier, "exact" | "less_than">;
  value: number;
};

export type RecipeNutritionNutrient = {
  perServing: RecipeNutritionValue;
  total: RecipeNutritionValue;
};

export type RecipeNutritionIncludedIngredient = {
  ciqualCode: string;
  ciqualName: string;
  grams: number;
  ingredientId: string;
  label: string;
};

export type RecipeNutritionExcludedIngredient = {
  ingredientId: string;
  label: string;
  reason: RecipeNutritionExclusionReason;
};

export type RecipeNutritionMissingNutrient = {
  ingredientId: string;
  label: string;
  nutrientKey: RecipeNutritionNutrientKey;
};

export type RecipeNutritionResult = {
  displayServings: number;
  excludedIngredients: RecipeNutritionExcludedIngredient[];
  includedIngredients: RecipeNutritionIncludedIngredient[];
  missingNutrients: RecipeNutritionMissingNutrient[];
  nutrients: Partial<Record<RecipeNutritionNutrientKey, RecipeNutritionNutrient>>;
  sourceServings: number;
  status: RecipeNutritionStatus;
};

export type ScaledRecipeIngredient = RecipeIngredient & {
  displayText: string;
  scaledGrams: number | null;
  scaledQuantity: number | null;
};

export function scaleRecipeIngredient({
  displayServings,
  ingredient,
  sourceServings,
}: {
  displayServings: number;
  ingredient: RecipeIngredient;
  sourceServings: number;
}): ScaledRecipeIngredient {
  const ratio = servingRatio(sourceServings, displayServings);
  const scaledQuantity =
    ingredient.quantity === null
      ? null
      : roundHumanQuantity(ingredient.quantity * ratio, ingredient.unit);
  const scaledGrams =
    ingredient.grams === null
      ? gramsFromIngredientQuantity(scaledQuantity, ingredient.unit)
      : roundGram(ingredient.grams * ratio);

  return {
    ...ingredient,
    displayText: formatIngredientText({
      label: ingredient.label,
      quantity: scaledQuantity,
      unit: ingredient.unit,
    }),
    scaledGrams,
    scaledQuantity,
  };
}

export function scaleRecipeIngredients({
  displayServings,
  recipe,
}: {
  displayServings: number;
  recipe: Recipe;
}): ScaledRecipeIngredient[] {
  return recipe.ingredients.map((ingredient) =>
    scaleRecipeIngredient({
      displayServings,
      ingredient,
      sourceServings: recipe.servings,
    }),
  );
}

export function calculateRecipeNutrition({
  displayServings,
  getFoodReference = () => null,
  recipe,
}: {
  displayServings?: number;
  getFoodReference?: (ciqualCode: string) => CiqualFoodReference | null;
  recipe: Recipe;
}): RecipeNutritionResult {
  const safeDisplayServings = normalizeServings(
    displayServings ?? recipe.servings,
    recipe.servings,
  );
  const scaledIngredients = scaleRecipeIngredients({
    displayServings: safeDisplayServings,
    recipe,
  });
  const includedIngredients: RecipeNutritionIncludedIngredient[] = [];
  const excludedIngredients: RecipeNutritionExcludedIngredient[] = [];
  const missingNutrients: RecipeNutritionMissingNutrient[] = [];
  const totals = new Map<RecipeNutritionNutrientKey, RecipeNutritionValue>();

  for (const ingredient of scaledIngredients) {
    if (!ingredient.ciqualCode) {
      excludedIngredients.push({
        ingredientId: ingredient.id,
        label: ingredient.label,
        reason:
          ingredient.reliability === "legacy_text"
            ? "legacy_text"
            : "missing_ciqual_code",
      });
      continue;
    }

    const food = getFoodReference(ingredient.ciqualCode);
    if (!food) {
      excludedIngredients.push({
        ingredientId: ingredient.id,
        label: ingredient.label,
        reason: "unknown_ciqual_code",
      });
      continue;
    }

    if (!ingredient.scaledGrams || ingredient.scaledGrams <= 0) {
      excludedIngredients.push({
        ingredientId: ingredient.id,
        label: ingredient.label,
        reason: "missing_grams",
      });
      continue;
    }

    includedIngredients.push({
      ciqualCode: food.ciqualCode,
      ciqualName: food.name,
      grams: ingredient.scaledGrams,
      ingredientId: ingredient.id,
      label: ingredient.label,
    });

    for (const nutrientKey of recipeNutritionNutrientKeys) {
      const nutrient = food.nutrientsPer100g[nutrientKey];
      if (nutrient.value === null) {
        missingNutrients.push({
          ingredientId: ingredient.id,
          label: ingredient.label,
          nutrientKey,
        });
        continue;
      }

      const previous = totals.get(nutrientKey);
      totals.set(nutrientKey, {
        qualifier:
          previous?.qualifier === "less_than" || nutrient.qualifier === "less_than"
            ? "less_than"
            : "exact",
        value:
          (previous?.value ?? 0) +
          (nutrient.value * ingredient.scaledGrams) / 100,
      });
    }
  }

  const nutrients: Partial<
    Record<RecipeNutritionNutrientKey, RecipeNutritionNutrient>
  > = {};

  for (const nutrientKey of recipeNutritionNutrientKeys) {
    const total = totals.get(nutrientKey);
    const hasMissingSource = missingNutrients.some(
      (item) => item.nutrientKey === nutrientKey,
    );
    if (!total || hasMissingSource) {
      continue;
    }

    nutrients[nutrientKey] = {
      perServing: {
        qualifier: total.qualifier,
        value: roundNutritionValue(total.value / safeDisplayServings),
      },
      total: {
        qualifier: total.qualifier,
        value: roundNutritionValue(total.value),
      },
    };
  }

  return {
    displayServings: safeDisplayServings,
    excludedIngredients,
    includedIngredients,
    missingNutrients,
    nutrients,
    sourceServings: recipe.servings,
    status: nutritionStatus({
      excludedCount: excludedIngredients.length,
      includedCount: includedIngredients.length,
      missingCount: missingNutrients.length,
    }),
  };
}

export function normalizeServings(value: number, fallback: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    return Number.isInteger(fallback) && fallback >= 1 && fallback <= 12
      ? fallback
      : 1;
  }

  return value;
}

function nutritionStatus({
  excludedCount,
  includedCount,
  missingCount,
}: {
  excludedCount: number;
  includedCount: number;
  missingCount: number;
}): RecipeNutritionStatus {
  if (includedCount === 0) {
    return "unavailable";
  }
  if (excludedCount > 0 || missingCount > 0) {
    return "partial";
  }

  return "complete";
}

function servingRatio(sourceServings: number, displayServings: number): number {
  if (sourceServings <= 0 || displayServings <= 0) {
    return 1;
  }

  return displayServings / sourceServings;
}

function roundHumanQuantity(value: number, unit: RecipeIngredientUnit): number {
  if (unit === "g" || unit === "ml") {
    if (value >= 50) return Math.round(value / 5) * 5;
    if (value >= 10) return Math.round(value);
    return Math.round(value * 10) / 10;
  }
  if (unit === "piece" || unit === "tablespoon" || unit === "teaspoon") {
    return Math.round(value * 2) / 2;
  }
  if (unit === "pinch") {
    return Math.max(1, Math.round(value));
  }

  return Math.round(value * 100) / 100;
}

function roundGram(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundNutritionValue(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}
