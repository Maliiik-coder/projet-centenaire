import { describe, expect, it } from "vitest";
import { MEAL_TUNNEL_STEPS, mealTunnelStepIds } from "@/lib/mealTunnel";

describe("meal tunnel", () => {
  it("ne contient plus la question de grignotage après repas", () => {
    expect(MEAL_TUNNEL_STEPS).toBe(8);
    expect(mealTunnelStepIds).not.toContain("snacking-after");
  });
});
