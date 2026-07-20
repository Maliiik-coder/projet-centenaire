import { describe, expect, it } from "vitest";
import { recipeCatalog } from "@/features/recipes/recipeCatalog";
import {
  createEmptyRecipeData,
  createEmptyRecipeDraft,
  deletePersonalRecipe,
  filterRecipes,
  findRecipe,
  gramsFromIngredientQuantity,
  isFavorite,
  recipeDraftFromRecipe,
  recipeFromDraft,
  savePersonalRecipe,
  toggleFavorite,
} from "@/features/recipes/recipeModel";
import type { Recipe, RecipeDraft } from "@/features/recipes/recipeTypes";

const validDraft: RecipeDraft = {
  category: "dinner",
  cookMinutes: "20",
  description: "Une soupe simple pour un soir tranquille.",
  ingredients: [
    {
      ciqualCode: "20009",
      ciqualName: "Carotte, crue",
      foodState: "raw",
      id: "ingredient-draft-1",
      label: "Carottes",
      quantity: "200",
      reliability: "incomplete",
      unit: "g",
    },
    {
      ciqualCode: "",
      ciqualName: "",
      foodState: "unknown",
      id: "ingredient-draft-2",
      label: "Eau",
      quantity: "500",
      reliability: "incomplete",
      unit: "ml",
    },
  ],
  prepMinutes: "10",
  servings: "2",
  stepsText: "Couper les legumes\nCuire doucement",
  tagsText: "chaud, simple",
  title: "Soupe maison",
};

describe("recipeModel", () => {
  it("expose un catalogue initial consultable et filtrable", () => {
    const data = createEmptyRecipeData();

    expect(recipeCatalog.length).toBeGreaterThanOrEqual(5);
    expect(
      filterRecipes({ data, filter: "all", query: "wrap" }).map((recipe) => recipe.id),
    ).toContain("catalog-wrap-oeuf-crudites");
    expect(
      filterRecipes({ data, filter: "all", query: "pates" }).map((recipe) => recipe.id),
    ).toContain("catalog-salade-pates-tomates");
  });

  it("valide les champs necessaires avant creation", () => {
    const result = recipeFromDraft({
      draft: createEmptyRecipeDraft(),
      nowIso: "2026-07-20T10:00:00.000Z",
      recipeId: "recipe-empty",
    });

    expect(result.recipe).toBeNull();
    expect(result.errors?.title).toBe("Donne un nom à la recette.");
    expect(result.errors?.ingredients).toBe("Ajoute au moins un ingrédient.");
    expect(result.errors?.stepsText).toBe("Ajoute au moins une étape.");
  });

  it("cree une recette personnelle structuree sans donnees nutritionnelles arbitraires", () => {
    const recipe = createRecipeFromDraft();

    expect(recipe).toMatchObject({
      category: "dinner",
      cookMinutes: 20,
      origin: "personal",
      prepMinutes: 10,
      servings: 2,
      title: "Soupe maison",
    });
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.ingredients[0]).toMatchObject({
      ciqualCode: "20009",
      foodState: "raw",
      grams: 200,
      label: "Carottes",
      quantity: 200,
      reliability: "ciqual_linked",
      unit: "g",
    });
    expect(recipe.ingredients[1]).toMatchObject({
      grams: null,
      label: "Eau",
      reliability: "user_declared",
      unit: "ml",
    });
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.tags).toEqual(["chaud", "simple"]);
    expect("calories" in recipe).toBe(false);
    expect("macros" in recipe).toBe(false);
    expect("nutrition" in recipe).toBe(false);
  });

  it("valide les quantites, les unites et les codes CIQUAL", () => {
    const invalidQuantity = recipeFromDraft({
      draft: {
        ...validDraft,
        ingredients: [
          { ...validDraft.ingredients[0], quantity: "-20" },
        ],
      },
      nowIso: "2026-07-20T10:00:00.000Z",
      recipeId: "recipe-invalid",
    });
    const invalidCode = recipeFromDraft({
      draft: {
        ...validDraft,
        ingredients: [
          { ...validDraft.ingredients[0], ciqualCode: "abc" },
        ],
      },
      nowIso: "2026-07-20T10:00:00.000Z",
      recipeId: "recipe-invalid-code",
    });

    expect(invalidQuantity.errors?.ingredients).toBe(
      "Les quantités doivent être des nombres positifs.",
    );
    expect(invalidCode.errors?.ingredients).toBe(
      "Un code CIQUAL doit contenir uniquement des chiffres.",
    );
    expect(gramsFromIngredientQuantity(0.25, "kg")).toBe(250);
    expect(gramsFromIngredientQuantity(120, "ml")).toBeNull();
  });

  it("modifie et supprime uniquement les recettes personnelles", () => {
    const recipe = createRecipeFromDraft();
    const catalogRecipe = recipeCatalog[0];
    const data = savePersonalRecipe(createEmptyRecipeData(), recipe);

    expect(savePersonalRecipe(data, catalogRecipe)).toEqual(data);
    expect(findRecipe(data, recipe.id)?.title).toBe("Soupe maison");

    const editedDraft = recipeDraftFromRecipe(recipe);
    const edited = createRecipeFromDraft(
      { ...editedDraft, title: "Soupe maison modifiee" },
      recipe,
    );
    const editedData = savePersonalRecipe(toggleFavorite(data, recipe.id), edited);

    expect(findRecipe(editedData, recipe.id)?.title).toBe("Soupe maison modifiee");
    expect(findRecipe(editedData, recipe.id)?.createdAt).toBe(recipe.createdAt);

    const deletedData = deletePersonalRecipe(editedData, recipe.id);
    expect(findRecipe(deletedData, recipe.id)).toBeNull();
    expect(isFavorite(deletedData, recipe.id)).toBe(false);
  });

  it("ajoute et retire un favori", () => {
    const data = createEmptyRecipeData();
    const favoriteData = toggleFavorite(data, "catalog-wrap-oeuf-crudites");

    expect(isFavorite(favoriteData, "catalog-wrap-oeuf-crudites")).toBe(true);
    expect(
      isFavorite(toggleFavorite(favoriteData, "catalog-wrap-oeuf-crudites"), "catalog-wrap-oeuf-crudites"),
    ).toBe(false);
  });

  it("filtre les favoris et les recettes personnelles", () => {
    const recipe = createRecipeFromDraft();
    const data = toggleFavorite(savePersonalRecipe(createEmptyRecipeData(), recipe), recipe.id);

    expect(filterRecipes({ data, filter: "personal", query: "" })).toEqual([recipe]);
    expect(filterRecipes({ data, filter: "favorites", query: "" })).toEqual([recipe]);
  });
});

function createRecipeFromDraft(
  draft: RecipeDraft = validDraft,
  existing?: Recipe,
): Recipe {
  const result = recipeFromDraft({
    draft,
    existing,
    nowIso: "2026-07-20T10:00:00.000Z",
    recipeId: existing?.id ?? "recipe-soupe-maison",
  });

  if (!result.recipe) {
    throw new Error("Expected a valid recipe draft");
  }

  return result.recipe;
}
