import { recipeCatalog } from "@/features/recipes/recipeCatalog";
import type {
  Recipe,
  RecipeCategory,
  RecipeDraft,
  RecipeDraftErrors,
  RecipeIngredient,
  RecipeLocalData,
  RecipeStep,
} from "@/features/recipes/recipeTypes";

export type RecipeFilter = "all" | "favorites" | "personal";

export type RecipeDraftValidation =
  | { errors: RecipeDraftErrors; recipe: null }
  | { errors: null; recipe: Recipe };

export function createEmptyRecipeData(): RecipeLocalData {
  return {
    favoriteRecipeIds: [],
    personalRecipes: [],
  };
}

export function createEmptyRecipeDraft(): RecipeDraft {
  return {
    category: "lunch",
    cookMinutes: "0",
    description: "",
    ingredientsText: "",
    prepMinutes: "10",
    servings: "2",
    stepsText: "",
    tagsText: "",
    title: "",
  };
}

export function recipeDraftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    category: recipe.category,
    cookMinutes: String(recipe.cookMinutes),
    description: recipe.description,
    ingredientsText: recipe.ingredients.map((ingredient) => ingredient.text).join("\n"),
    prepMinutes: String(recipe.prepMinutes),
    servings: String(recipe.servings),
    stepsText: recipe.steps.map((step) => step.text).join("\n"),
    tagsText: recipe.tags.join(", "),
    title: recipe.title,
  };
}

export function allRecipes(data: RecipeLocalData): Recipe[] {
  return [...data.personalRecipes, ...recipeCatalog];
}

export function findRecipe(data: RecipeLocalData, recipeId: string): Recipe | null {
  return allRecipes(data).find((recipe) => recipe.id === recipeId) ?? null;
}

export function isFavorite(data: RecipeLocalData, recipeId: string): boolean {
  return data.favoriteRecipeIds.includes(recipeId);
}

export function toggleFavorite(
  data: RecipeLocalData,
  recipeId: string,
): RecipeLocalData {
  const exists = data.favoriteRecipeIds.includes(recipeId);

  return {
    ...data,
    favoriteRecipeIds: exists
      ? data.favoriteRecipeIds.filter((id) => id !== recipeId)
      : [...data.favoriteRecipeIds, recipeId],
  };
}

export function filterRecipes({
  data,
  filter,
  query,
}: {
  data: RecipeLocalData;
  filter: RecipeFilter;
  query: string;
}): Recipe[] {
  const normalizedQuery = normalizeSearch(query);
  return allRecipes(data).filter((recipe) => {
    if (filter === "favorites" && !isFavorite(data, recipe.id)) {
      return false;
    }
    if (filter === "personal" && recipe.origin !== "personal") {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return normalizeSearch(
      [
        recipe.title,
        recipe.description,
        recipe.tags.join(" "),
        recipe.ingredients.map((ingredient) => ingredient.text).join(" "),
      ].join(" "),
    ).includes(normalizedQuery);
  });
}

export function savePersonalRecipe(
  data: RecipeLocalData,
  recipe: Recipe,
): RecipeLocalData {
  if (recipe.origin !== "personal") {
    return data;
  }

  const exists = data.personalRecipes.some((item) => item.id === recipe.id);
  return {
    ...data,
    personalRecipes: exists
      ? data.personalRecipes.map((item) => (item.id === recipe.id ? recipe : item))
      : [recipe, ...data.personalRecipes],
  };
}

export function deletePersonalRecipe(
  data: RecipeLocalData,
  recipeId: string,
): RecipeLocalData {
  return {
    favoriteRecipeIds: data.favoriteRecipeIds.filter((id) => id !== recipeId),
    personalRecipes: data.personalRecipes.filter((recipe) => recipe.id !== recipeId),
  };
}

export function recipeFromDraft({
  draft,
  existing,
  nowIso,
  recipeId,
}: {
  draft: RecipeDraft;
  existing?: Recipe | null;
  nowIso: string;
  recipeId: string;
}): RecipeDraftValidation {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const ingredients = linesFromText(draft.ingredientsText);
  const steps = linesFromText(draft.stepsText);
  const servings = parsePositiveInteger(draft.servings);
  const prepMinutes = parseNonNegativeInteger(draft.prepMinutes);
  const cookMinutes = parseNonNegativeInteger(draft.cookMinutes);
  const errors: RecipeDraftErrors = {};

  if (title.length < 2) {
    errors.title = "Donne un nom à la recette.";
  }
  if (description.length < 8) {
    errors.description = "Ajoute une courte description.";
  }
  if (!servings || servings > 12) {
    errors.servings = "Choisis entre 1 et 12 portions.";
  }
  if (prepMinutes === null || prepMinutes > 240) {
    errors.prepMinutes = "Indique une durée entre 0 et 240 minutes.";
  }
  if (cookMinutes === null || cookMinutes > 240) {
    errors.cookMinutes = "Indique une durée entre 0 et 240 minutes.";
  }
  if (ingredients.length === 0) {
    errors.ingredientsText = "Ajoute au moins un ingrédient.";
  }
  if (steps.length === 0) {
    errors.stepsText = "Ajoute au moins une étape.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, recipe: null };
  }

  return {
    errors: null,
    recipe: {
      category: draft.category,
      cookMinutes: cookMinutes ?? 0,
      createdAt: existing?.createdAt ?? nowIso,
      description,
      id: existing?.id ?? recipeId,
      ingredients: ingredients.map(toIngredient),
      origin: "personal",
      prepMinutes: prepMinutes ?? 0,
      servings: servings ?? 1,
      steps: steps.map(toStep),
      tags: tagsFromText(draft.tagsText),
      title,
      updatedAt: nowIso,
    },
  };
}

export function categoryIsRecipeCategory(value: string): value is RecipeCategory {
  return (
    value === "breakfast" ||
    value === "lunch" ||
    value === "dinner" ||
    value === "snack"
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function linesFromText(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function tagsFromText(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function toIngredient(text: string, index: number): RecipeIngredient {
  return {
    id: `ingredient-${index + 1}`,
    text,
  };
}

function toStep(text: string, index: number): RecipeStep {
  return {
    id: `step-${index + 1}`,
    text,
  };
}
