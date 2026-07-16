import { describe, expect, it } from "vitest";
import {
  CIQUAL_2025_SOURCE,
  EMPTY_NUTRIENTS_PER_100G,
  type CiqualFoodReference,
} from "@/lib/nutrition/foodReference";
import { estimateNutritionForPortion } from "@/lib/nutrition/nutritionEstimate";
import { initialUsualPortionCatalog } from "@/lib/nutrition/portionCatalog";

const pastaReference: CiqualFoodReference = {
  source: CIQUAL_2025_SOURCE.id,
  sourceVersion: "2025",
  ciqualCode: "sample-pasta",
  name: "Pâtes alimentaires cuites",
  groupName: "produits céréaliers",
  subGroupName: null,
  subSubGroupName: null,
  nutrientsPer100g: {
    ...EMPTY_NUTRIENTS_PER_100G,
    energyKcal: { value: 150, qualifier: "exact" },
    proteinsG: { value: 5, qualifier: "exact" },
    fiberG: { value: 2, qualifier: "exact" },
  },
};

describe("nutritionEstimate", () => {
  it("calcule une fourchette interne à partir de Ciqual et d’une portion", () => {
    const portion = initialUsualPortionCatalog.find(
      (item) => item.id === "cooked-pasta-plate",
    );

    expect(portion).toBeDefined();
    const estimate = estimateNutritionForPortion({
      food: pastaReference,
      portion: portion!,
    });

    expect(estimate?.displayPolicy).toBe("internal_only");
    expect(estimate?.confidence).toBe("low");
    expect(estimate?.nutrients.energyKcal).toEqual({
      low: { value: 270, qualifier: "exact" },
      central: { value: 375, qualifier: "exact" },
      high: { value: 480, qualifier: "exact" },
    });
  });

  it("refuse un multiplicateur invalide", () => {
    const portion = initialUsualPortionCatalog[0];

    expect(
      estimateNutritionForPortion({
        food: pastaReference,
        portion,
        multiplier: 0,
      }),
    ).toBeNull();
  });
});
