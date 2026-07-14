import { describe, expect, it } from "vitest";
import {
  MEAL_TUNNEL_STEPS,
  SNACK_MEAL_TUNNEL_STEPS,
  getMealTunnelStepIds,
  mealTunnelStepIds,
  snackMealTunnelStepIds,
} from "@/lib/mealTunnel";

describe("meal tunnel", () => {
  it("ne contient plus la question de grignotage après repas", () => {
    expect(MEAL_TUNNEL_STEPS).toBe(9);
    expect(mealTunnelStepIds).not.toContain("snacking-after");
    expect(snackMealTunnelStepIds).not.toContain("snacking-after");
  });

  it("utilise un tunnel grignotage séparé et plus court", () => {
    expect(SNACK_MEAL_TUNNEL_STEPS).toBe(6);
    expect(getMealTunnelStepIds("grignotage")).toEqual([
      "kind",
      "snack-text",
      "snack-trigger",
      "snack-context",
      "snack-fullness",
      "finding",
    ]);
    expect(getMealTunnelStepIds("dejeuner")).toEqual(mealTunnelStepIds);
  });
});
