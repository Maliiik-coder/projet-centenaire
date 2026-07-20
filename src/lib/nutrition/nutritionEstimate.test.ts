import { describe, expect, it } from "vitest";
import {
  CIQUAL_2025_SOURCE,
  EMPTY_NUTRIENTS_PER_100G,
  type CiqualFoodReference,
} from "@/lib/nutrition/foodReference";
import { estimateNutritionForPortion } from "@/lib/nutrition/nutritionEstimate";
import { initialUsualPortionCatalog } from "@/lib/nutrition/portionCatalog";

const appleReference: CiqualFoodReference = {
  source: CIQUAL_2025_SOURCE.id,
  sourceVersion: "2025",
  ciqualCode: "sample-apple",
  name: "Pomme",
  groupName: "fruits, légumes, légumineuses et oléagineux",
  subGroupName: null,
  subSubGroupName: null,
  nutrientsPer100g: {
    ...EMPTY_NUTRIENTS_PER_100G,
    energyKcal: { value: 52, qualifier: "exact" },
    fiberG: { value: 2.4, qualifier: "exact" },
  },
};

describe("nutritionEstimate", () => {
  it("calcule une fourchette interne à partir de Ciqual et d’une portion massique institutionnelle", () => {
    const portion = initialUsualPortionCatalog.find(
      (item) => item.id === "fruit-veg-adult-portion",
    );

    expect(portion).toBeDefined();
    const estimate = estimateNutritionForPortion({
      food: appleReference,
      portion: portion!,
    });

    expect(estimate?.displayPolicy).toBe("internal_only");
    expect(estimate?.confidence).toBe("high");
    expect(estimate?.nutrients.energyKcal).toEqual({
      low: { value: 41.6, qualifier: "exact" },
      central: { value: 46.8, qualifier: "exact" },
      high: { value: 52, qualifier: "exact" },
    });
  });

  it("refuse les repères éditoriaux Haru pour une estimation active", () => {
    const portion = initialUsualPortionCatalog.find(
      (item) => item.id === "cooked-pasta-plate",
    );

    expect(portion?.source.kind).toBe("haru_editorial_seed");
    expect(
      estimateNutritionForPortion({
        food: appleReference,
        portion: portion!,
      }),
    ).toBeNull();
  });

  it("refuse un volume en ml sans densité sourcée", () => {
    const portion = initialUsualPortionCatalog.find(
      (item) => item.id === "soup-bowl",
    );

    expect(portion?.milliliterRange?.central).toBe(250);
    expect(portion?.gramRange).toBeNull();
    expect(
      estimateNutritionForPortion({
        food: appleReference,
        portion: portion!,
      }),
    ).toBeNull();
  });

  it("refuse un multiplicateur invalide", () => {
    const portion = initialUsualPortionCatalog[0];

    expect(
      estimateNutritionForPortion({
        food: appleReference,
        portion,
        multiplier: 0,
      }),
    ).toBeNull();
  });
});
