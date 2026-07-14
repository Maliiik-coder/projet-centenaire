import { describe, expect, it } from "vitest";
import { activeMealKindLabels, mealKindLabels, normalizeMealKind } from "@/lib/mealKinds";

describe("meal kinds", () => {
  it("propose uniquement les types de repas V0.6", () => {
    expect(Object.keys(activeMealKindLabels)).toEqual([
      "petit-dejeuner",
      "dejeuner",
      "diner",
      "grignotage",
    ]);
  });

  it("convertit l'ancienne collation en grignotage", () => {
    expect(normalizeMealKind("collation")).toBe("grignotage");
    expect(mealKindLabels.collation).toBe("Grignotage");
  });

  it("garde l'ancien autre lisible sans le proposer", () => {
    expect(normalizeMealKind("autre")).toBe("autre");
    expect(activeMealKindLabels).not.toHaveProperty("autre");
  });
});
