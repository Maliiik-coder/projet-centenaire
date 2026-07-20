import { describe, expect, it } from "vitest";
import { searchCiqualFoods } from "@/lib/nutrition/ciqualFoods";
import { estimateMealItemNutritionContext } from "@/lib/nutrition/mealNutritionContext";
import type { MealItemV2 } from "@/lib/types";

function confirmedItem(
  overrides: Partial<MealItemV2> = {},
  query = "pomme",
): MealItemV2 {
  const food = searchCiqualFoods(query)[0]!;

  return {
    id: `item-${query}`,
    rawText: query,
    recognitionStatus: "confirmed",
    canonicalName: food.canonicalName,
    ciqualCode: food.ciqualCode,
    confidence: food.confidence,
    source: food.source,
    sourceVersion: food.sourceVersion,
    quantity: {
      amount: 1,
      unit: "piece",
      text: null,
      confidence: "medium",
    },
    ...overrides,
  };
}

describe("mealNutritionContext", () => {
  it("produit une estimation interne seulement avec aliment confirmé et portion massique compatible", () => {
    const context = estimateMealItemNutritionContext(confirmedItem());

    expect(context.status).toBe("estimated");
    if (context.status === "estimated") {
      expect(context.estimate.displayPolicy).toBe("internal_only");
      expect(context.estimate.ciqualCode).toMatch(/^\d+$/);
      expect(context.estimate.gramRange.central).toBeGreaterThan(0);
    }
  });

  it("ne produit aucune estimation avec une portion éditoriale Haru", () => {
    expect(
      estimateMealItemNutritionContext(
        confirmedItem(
          {
            quantity: {
              amount: 1,
              unit: "plate",
              text: null,
              confidence: "medium",
            },
          },
          "riz",
        ),
      ),
    ).toMatchObject({
      status: "not_estimated",
      reason: "incompatible_portion_reference",
    });
  });

  it("ne convertit pas un volume en grammes sans densité sourcée", () => {
    expect(
      estimateMealItemNutritionContext(
        confirmedItem(
          {
            rawText: "soupe",
            canonicalName: "Soupe de légumes",
            quantity: {
              amount: 1,
              unit: "bowl",
              text: null,
              confidence: "medium",
            },
          },
          "soupe",
        ),
      ),
    ).toMatchObject({
      status: "not_estimated",
      reason: "incompatible_portion_reference",
    });
  });

  it("ne produit aucune estimation sans code Ciqual confirmé", () => {
    expect(
      estimateMealItemNutritionContext(
        confirmedItem({
          ciqualCode: null,
          canonicalName: null,
          recognitionStatus: "unprocessed",
        }),
      ),
    ).toMatchObject({
      status: "not_estimated",
      reason: "not_confirmed",
    });
  });

  it("ne produit aucune estimation quand la portion est inconnue", () => {
    expect(
      estimateMealItemNutritionContext(
        confirmedItem({
          quantity: {
            amount: 1,
            unit: "unknown",
            text: null,
            confidence: "not_estimated",
          },
        }),
      ),
    ).toMatchObject({
      status: "not_estimated",
      reason: "missing_quantity",
    });
  });
});
