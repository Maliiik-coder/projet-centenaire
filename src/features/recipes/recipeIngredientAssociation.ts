import type { RecipeIngredientDraft } from "@/features/recipes/recipeTypes";

export const RECIPE_INGREDIENT_SEARCH_MIN_LENGTH = 3;

export type RecipeIngredientSearchSuggestion = {
  ciqualCode: string;
  ciqualName: string;
  groupName: string | null;
};

export type RecipeIngredientSearchResultLike = {
  canonicalName: string;
  ciqualCode: string;
  groupName: string | null;
  subGroupName: string | null;
};

export function shouldSearchRecipeIngredientLabel(label: string): boolean {
  return normalizeIngredientLabel(label).length >= RECIPE_INGREDIENT_SEARCH_MIN_LENGTH;
}

export function toRecipeIngredientSearchSuggestion(
  result: RecipeIngredientSearchResultLike,
): RecipeIngredientSearchSuggestion {
  return {
    ciqualCode: result.ciqualCode,
    ciqualName: result.canonicalName,
    groupName: result.groupName ?? result.subGroupName ?? null,
  };
}

export function applyRecipeIngredientLabelChange(
  ingredient: RecipeIngredientDraft,
  label: string,
): RecipeIngredientDraft {
  const labelChanged =
    normalizeIngredientLabel(label) !== normalizeIngredientLabel(ingredient.label);
  const hasAssociation = Boolean(ingredient.ciqualCode || ingredient.ciqualName);

  if (!hasAssociation || !labelChanged) {
    return { ...ingredient, label };
  }

  return {
    ...ingredient,
    ciqualCode: "",
    ciqualName: "",
    label,
    reliability: "incomplete",
  };
}

export function applyRecipeIngredientSuggestion(
  ingredient: RecipeIngredientDraft,
  suggestion: RecipeIngredientSearchSuggestion,
): RecipeIngredientDraft {
  return {
    ...ingredient,
    ciqualCode: suggestion.ciqualCode,
    ciqualName: suggestion.ciqualName,
    reliability: "incomplete",
  };
}

export function clearRecipeIngredientAssociation(
  ingredient: RecipeIngredientDraft,
): RecipeIngredientDraft {
  return {
    ...ingredient,
    ciqualCode: "",
    ciqualName: "",
    reliability: "incomplete",
  };
}

function normalizeIngredientLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
