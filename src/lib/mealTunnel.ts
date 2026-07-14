import type { ActiveMealKind } from "@/lib/types";

export const mealTunnelStepIds = [
  "kind",
  "text",
  "starter",
  "dessert",
  "serving",
  "hunger",
  "fullness",
  "tags",
  "finding",
] as const;

export const breakfastMealTunnelStepIds = [
  "kind",
  "text",
  "serving",
  "hunger",
  "fullness",
  "tags",
  "finding",
] as const;

export const snackMealTunnelStepIds = [
  "kind",
  "snack-text",
  "snack-trigger",
  "snack-context",
  "snack-fullness",
  "finding",
] as const;

export type MealTunnelStepId =
  | (typeof mealTunnelStepIds)[number]
  | (typeof breakfastMealTunnelStepIds)[number]
  | (typeof snackMealTunnelStepIds)[number];

export function getMealTunnelStepIds(kind: ActiveMealKind): readonly MealTunnelStepId[] {
  if (kind === "grignotage") {
    return snackMealTunnelStepIds;
  }

  if (kind === "petit-dejeuner") {
    return breakfastMealTunnelStepIds;
  }

  return mealTunnelStepIds;
}

export const MEAL_TUNNEL_STEPS = mealTunnelStepIds.length;
export const BREAKFAST_MEAL_TUNNEL_STEPS = breakfastMealTunnelStepIds.length;
export const SNACK_MEAL_TUNNEL_STEPS = snackMealTunnelStepIds.length;
export const MEAL_TEXT_STEP = mealTunnelStepIds.indexOf("text");
export const MEAL_TAGS_STEP = mealTunnelStepIds.indexOf("tags");
export const MEAL_FINDING_STEP = mealTunnelStepIds.indexOf("finding");
export const MEAL_LAST_STEP = MEAL_TUNNEL_STEPS - 1;
