import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecipeFormView } from "@/features/recipes/RecipeFormView";
import type { Recipe } from "@/features/recipes/recipeTypes";

describe("RecipeFormView", () => {
  it("affiche l'aliment reconnu sans exposer de code ou de champs techniques", () => {
    const html = renderToStaticMarkup(
      <RecipeFormView
        existingRecipe={recipeWithRecognizedIngredient()}
        onBack={() => {}}
        onSave={() => {}}
      />,
    );

    expect(html).toContain("Aliment reconnu");
    expect(html).toContain("Carotte, crue");
    expect(html).toContain("220");
    expect(html).toContain("g");
    expect(html).not.toContain("Code CIQUAL");
    expect(html).not.toContain("Nom CIQUAL");
    expect(html).not.toContain("CIQUAL + grammes");
    expect(html).not.toContain("Fiabilité");
    expect(html).not.toContain("20009");
  });
});

function recipeWithRecognizedIngredient(): Recipe {
  return {
    category: "lunch",
    cookMinutes: 15,
    createdAt: "2026-07-21T10:00:00.000Z",
    description: "Une recette simple pour tester le formulaire.",
    id: "recipe-form-render",
    ingredients: [
      {
        ciqualCode: "20009",
        ciqualName: "Carotte, crue",
        foodState: "raw",
        grams: 220,
        id: "ingredient-carotte",
        label: "Carotte",
        quantity: 220,
        reliability: "ciqual_linked",
        text: "220 g Carotte",
        unit: "g",
      },
    ],
    origin: "personal",
    prepMinutes: 10,
    servings: 2,
    steps: [{ id: "step-1", text: "Couper puis cuire." }],
    tags: ["simple"],
    title: "Carottes test",
    updatedAt: "2026-07-21T10:00:00.000Z",
  };
}
