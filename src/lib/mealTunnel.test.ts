import { describe, expect, it } from "vitest";
import {
  BREAKFAST_MEAL_TUNNEL_STEPS,
  MEAL_TUNNEL_STEPS,
  SNACK_MEAL_TUNNEL_STEPS,
  breakfastMealTunnelStepIds,
  getMealTunnelStepIds,
  mealTunnelStepIds,
  snackMealTunnelStepIds,
} from "@/lib/mealTunnel";

describe("meal tunnel", () => {
  it("ne contient plus la question de grignotage après repas", () => {
    expect(MEAL_TUNNEL_STEPS).toBe(13);
    expect(mealTunnelStepIds).not.toContain("snacking-after");
    expect(snackMealTunnelStepIds).not.toContain("snacking-after");
    expect(mealTunnelStepIds).not.toContain("tags");
  });

  it("utilise un tunnel grignotage séparé et plus court", () => {
    expect(SNACK_MEAL_TUNNEL_STEPS).toBe(9);
    expect(getMealTunnelStepIds("grignotage")).toEqual([
      "kind",
      "time",
      "snack-text",
      "clarifications",
      "quantity",
      "snack-trigger",
      "snack-context",
      "snack-fullness",
      "finding",
    ]);
  });

  it("retire entrée et dessert du petit déjeuner", () => {
    expect(BREAKFAST_MEAL_TUNNEL_STEPS).toBe(8);
    expect(getMealTunnelStepIds("petit-dejeuner")).toEqual([
      "kind",
      "time",
      "hunger",
      "text",
      "clarifications",
      "quantity",
      "fullness",
      "finding",
    ]);
    expect(breakfastMealTunnelStepIds).not.toContain("starter");
    expect(breakfastMealTunnelStepIds).not.toContain("dessert");
  });

  it("conserve entrée et dessert pour déjeuner et dîner", () => {
    expect(getMealTunnelStepIds("dejeuner")).toEqual(mealTunnelStepIds);
    expect(getMealTunnelStepIds("diner")).toEqual(mealTunnelStepIds);
    expect(getMealTunnelStepIds("dejeuner")).toContain("starter");
    expect(getMealTunnelStepIds("diner")).toContain("dessert");
  });
});
