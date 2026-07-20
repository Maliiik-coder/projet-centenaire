import { describe, expect, it } from "vitest";
import {
  calculateRecipeNutrition,
  scaleRecipeIngredient,
  scaleRecipeIngredients,
} from "@/features/recipes/recipeNutrition";
import {
  CIQUAL_2025_SOURCE,
  EMPTY_NUTRIENTS_PER_100G,
  type CiqualFoodReference,
} from "@/lib/nutrition/foodReference";
import type { Recipe, RecipeIngredient } from "@/features/recipes/recipeTypes";

const carrotReference = foodReference("20009", "Carotte", {
  carbohydratesG: 6.45,
  energyKcal: 40,
  fatG: 0.26,
  fiberG: 2.7,
  proteinsG: 0.63,
  saltG: 0.11,
});
const riceReference = foodReference("9104", "Riz blanc cuit", {
  carbohydratesG: 28,
  energyKcal: 145,
  fatG: 0.4,
  fiberG: 1,
  proteinsG: 2.7,
  saltG: 0.01,
});
const partialReference = foodReference("partial", "Aliment incomplet", {
  carbohydratesG: null,
  energyKcal: 100,
  fatG: 1,
  fiberG: 2,
  proteinsG: 3,
  saltG: 0.1,
});

describe("recipeNutrition", () => {
  it("met les quantites a l'echelle avec un arrondi humain sans modifier l'ingredient source", () => {
    const ingredient = recipeIngredient({
      ciqualCode: "20009",
      grams: 125,
      label: "Carottes",
      quantity: 125,
    });
    const before = structuredClone(ingredient);

    const scaled = scaleRecipeIngredient({
      displayServings: 3,
      ingredient,
      sourceServings: 2,
    });

    expect(scaled.scaledQuantity).toBe(190);
    expect(scaled.scaledGrams).toBe(187.5);
    expect(scaled.displayText).toBe("190 g Carottes");
    expect(ingredient).toEqual(before);
  });

  it("conserve la recette source quand le nombre de parts affiché change", () => {
    const recipe = createRecipe();
    const before = structuredClone(recipe);

    expect(scaleRecipeIngredients({ displayServings: 4, recipe })[0]?.scaledQuantity).toBe(200);
    expect(recipe).toEqual(before);
  });

  it("somme plusieurs ingredients puis divise par les parts affichees", () => {
    const recipe = createRecipe({
      ingredients: [
        recipeIngredient({
          ciqualCode: "20009",
          grams: 100,
          label: "Carotte",
          quantity: 100,
        }),
        recipeIngredient({
          ciqualCode: "9104",
          grams: 200,
          id: "ingredient-2",
          label: "Riz",
          quantity: 200,
        }),
      ],
      servings: 2,
    });

    const result = calculateRecipeNutrition({
      displayServings: 2,
      getFoodReference: testFoodReference,
      recipe,
    });

    expect(result.status).toBe("complete");
    expect(result.nutrients.energyKcal?.total.value).toBe(330);
    expect(result.nutrients.energyKcal?.perServing.value).toBe(165);
    expect(result.nutrients.proteinsG?.total.value).toBe(6.03);
    expect(result.nutrients.proteinsG?.perServing.value).toBe(3.02);
  });

  it("recalcule le total pour les parts choisies tout en gardant la valeur par part stable", () => {
    const recipe = createRecipe({
      ingredients: [
        recipeIngredient({
          ciqualCode: "20009",
          grams: 100,
          label: "Carotte",
          quantity: 100,
        }),
      ],
      servings: 2,
    });

    const result = calculateRecipeNutrition({
      displayServings: 4,
      getFoodReference: testFoodReference,
      recipe,
    });

    expect(result.includedIngredients[0]?.grams).toBe(200);
    expect(result.nutrients.energyKcal?.total.value).toBe(80);
    expect(result.nutrients.energyKcal?.perServing.value).toBe(20);
  });

  it("distingue les ingredients inconnus ou sans masse exploitable", () => {
    const recipe = createRecipe({
      ingredients: [
        recipeIngredient({
          ciqualCode: "20009",
          grams: 100,
          label: "Carotte",
          quantity: 100,
        }),
        recipeIngredient({
          ciqualCode: null,
          grams: null,
          id: "ingredient-2",
          label: "Herbes",
          quantity: null,
          reliability: "incomplete",
          unit: "free",
        }),
        recipeIngredient({
          ciqualCode: "999999",
          grams: 80,
          id: "ingredient-3",
          label: "Aliment inconnu",
          quantity: 80,
        }),
        recipeIngredient({
          ciqualCode: "9104",
          grams: null,
          id: "ingredient-4",
          label: "Riz en bol",
          quantity: 1,
          reliability: "user_declared",
          unit: "piece",
        }),
      ],
    });

    const result = calculateRecipeNutrition({
      getFoodReference: testFoodReference,
      recipe,
    });

    expect(result.status).toBe("partial");
    expect(result.includedIngredients.map((item) => item.label)).toEqual(["Carotte"]);
    expect(result.excludedIngredients).toEqual([
      {
        ingredientId: "ingredient-2",
        label: "Herbes",
        reason: "missing_ciqual_code",
      },
      {
        ingredientId: "ingredient-3",
        label: "Aliment inconnu",
        reason: "unknown_ciqual_code",
      },
      {
        ingredientId: "ingredient-4",
        label: "Riz en bol",
        reason: "missing_grams",
      },
    ]);
  });

  it("marque les anciennes recettes texte libre comme non calculables", () => {
    const recipe = createRecipe({
      ingredients: [
        recipeIngredient({
          ciqualCode: null,
          grams: null,
          label: "Une poignée de riz",
          quantity: null,
          reliability: "legacy_text",
          unit: "free",
        }),
      ],
    });

    const result = calculateRecipeNutrition({
      getFoodReference: testFoodReference,
      recipe,
    });

    expect(result.status).toBe("unavailable");
    expect(result.excludedIngredients).toEqual([
      {
        ingredientId: "ingredient-1",
        label: "Une poignée de riz",
        reason: "legacy_text",
      },
    ]);
    expect(result.nutrients).toEqual({});
  });

  it("n'affiche pas un nutriment absent d'une source incluse", () => {
    const recipe = createRecipe({
      ingredients: [
        recipeIngredient({
          ciqualCode: "partial",
          grams: 100,
          label: "Aliment incomplet",
          quantity: 100,
        }),
      ],
    });

    const result = calculateRecipeNutrition({
      getFoodReference: testFoodReference,
      recipe,
    });

    expect(result.status).toBe("partial");
    expect(result.nutrients.energyKcal?.perServing.value).toBe(50);
    expect(result.nutrients.carbohydratesG).toBeUndefined();
    expect(result.missingNutrients).toEqual([
      {
        ingredientId: "ingredient-1",
        label: "Aliment incomplet",
        nutrientKey: "carbohydratesG",
      },
    ]);
  });
});

function testFoodReference(ciqualCode: string): CiqualFoodReference | null {
  if (ciqualCode === carrotReference.ciqualCode) return carrotReference;
  if (ciqualCode === riceReference.ciqualCode) return riceReference;
  if (ciqualCode === partialReference.ciqualCode) return partialReference;
  return null;
}

function createRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    category: "dinner",
    cookMinutes: 15,
    createdAt: "2026-07-20T10:00:00.000Z",
    description: "Une recette de test avec des quantités structurées.",
    id: "recipe-test",
    ingredients: [
      recipeIngredient({
        ciqualCode: "20009",
        grams: 100,
        label: "Carotte",
        quantity: 100,
      }),
    ],
    origin: "personal",
    prepMinutes: 10,
    servings: 2,
    steps: [{ id: "step-1", text: "Mélanger" }],
    tags: [],
    title: "Recette test",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function recipeIngredient({
  ciqualCode,
  grams,
  id = "ingredient-1",
  label,
  quantity,
  reliability = ciqualCode && grams !== null ? "ciqual_linked" : "incomplete",
  unit = "g",
}: {
  ciqualCode: string | null;
  grams: number | null;
  id?: string;
  label: string;
  quantity: number | null;
  reliability?: RecipeIngredient["reliability"];
  unit?: RecipeIngredient["unit"];
}): RecipeIngredient {
  return {
    ciqualCode,
    ciqualName: ciqualCode,
    foodState: "unknown",
    grams,
    id,
    label,
    quantity,
    reliability,
    text: quantity ? `${quantity} ${unit} ${label}` : label,
    unit,
  };
}

function foodReference(
  ciqualCode: string,
  name: string,
  nutrients: Partial<Record<keyof typeof EMPTY_NUTRIENTS_PER_100G, number | null>>,
): CiqualFoodReference {
  return {
    ciqualCode,
    groupName: null,
    name,
    nutrientsPer100g: {
      ...EMPTY_NUTRIENTS_PER_100G,
      ...Object.fromEntries(
        Object.entries(nutrients).map(([key, value]) => [
          key,
          value === null
            ? { qualifier: "unknown", value: null }
            : { qualifier: "exact", value },
        ]),
      ),
    },
    source: CIQUAL_2025_SOURCE.id,
    sourceVersion: "2025",
    subGroupName: null,
    subSubGroupName: null,
  };
}
