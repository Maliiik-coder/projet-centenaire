import { getCiqualFoodReference } from "@/lib/nutrition/ciqualFoodNutrients";
import { estimateNutritionForPortion } from "@/lib/nutrition/nutritionEstimate";
import {
  findUsualPortionReferences,
  isNutritionEstimablePortion,
} from "@/lib/nutrition/portionCatalog";
import type { InternalNutritionEstimate } from "@/lib/nutrition/nutritionEstimate";
import type { MealItemV2 } from "@/lib/types";

export type MealItemNutritionContext =
  | {
      status: "estimated";
      itemId: string;
      ciqualCode: string;
      estimate: InternalNutritionEstimate;
    }
  | {
      status: "not_estimated";
      itemId: string;
      reason:
        | "not_confirmed"
        | "missing_ciqual_code"
        | "unknown_food_reference"
        | "missing_quantity"
        | "missing_portion_reference"
        | "incompatible_portion_reference";
    };

export function estimateMealItemNutritionContext(
  item: MealItemV2,
): MealItemNutritionContext {
  if (item.recognitionStatus !== "confirmed") {
    return notEstimated(item, "not_confirmed");
  }

  if (!item.ciqualCode) {
    return notEstimated(item, "missing_ciqual_code");
  }

  const food = getCiqualFoodReference(item.ciqualCode);
  if (!food) {
    return notEstimated(item, "unknown_food_reference");
  }

  if (
    !item.quantity?.amount ||
    item.quantity.amount <= 0 ||
    item.quantity.unit === "unknown" ||
    item.quantity.unit === "other"
  ) {
    return notEstimated(item, "missing_quantity");
  }

  const portions = findUsualPortionReferences(
    item.canonicalName ?? item.rawText,
    item.quantity.unit,
  );
  const portion = portions.find(isNutritionEstimablePortion);
  if (!portion) {
    return notEstimated(
      item,
      portions.length > 0
        ? "incompatible_portion_reference"
        : "missing_portion_reference",
    );
  }

  const estimate = estimateNutritionForPortion({
    food,
    portion,
    multiplier: item.quantity.amount,
  });

  return estimate
    ? {
        status: "estimated",
        itemId: item.id,
        ciqualCode: item.ciqualCode,
        estimate,
      }
    : notEstimated(item, "incompatible_portion_reference");
}

function notEstimated(
  item: MealItemV2,
  reason: Extract<MealItemNutritionContext, { status: "not_estimated" }>["reason"],
): MealItemNutritionContext {
  return {
    status: "not_estimated",
    itemId: item.id,
    reason,
  };
}
