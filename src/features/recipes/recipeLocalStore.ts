import {
  categoryIsRecipeCategory,
  foodStateIsRecipeFoodState,
  formatIngredientText,
  gramsFromIngredientQuantity,
  ingredientFromText,
  reliabilityIsRecipeIngredientReliability,
  unitIsRecipeIngredientUnit,
} from "@/features/recipes/recipeModel";
import type {
  Recipe,
  RecipeFoodState,
  RecipeIngredient,
  RecipeIngredientReliability,
  RecipeIngredientUnit,
  RecipeLocalData,
  RecipeStep,
  RecipeStorageScope,
} from "@/features/recipes/recipeTypes";

const RECIPE_STORAGE_PREFIX = "haru-recipes-local-v1";

type RecipeLocalEnvelope = {
  data: RecipeLocalData;
  ownerUserId: string | null;
  updatedAt: string;
  version: 1;
};

export const guestRecipeStorageScope: RecipeStorageScope = { kind: "guest" };

export function userRecipeStorageScope(userId: string): RecipeStorageScope {
  return { kind: "user", userId };
}

export function recipeStorageKey(scope: RecipeStorageScope): string {
  return scope.kind === "guest"
    ? `${RECIPE_STORAGE_PREFIX}:guest`
    : `${RECIPE_STORAGE_PREFIX}:user:${encodeURIComponent(scope.userId)}`;
}

export function loadRecipeLocalData(scope: RecipeStorageScope): RecipeLocalData {
  const storage = getLocalStorage();
  if (!storage) {
    return createEmptyRecipeData();
  }

  try {
    const raw = storage.getItem(recipeStorageKey(scope));
    if (!raw) {
      return createEmptyRecipeData();
    }

    return normalizeEnvelope(JSON.parse(raw), scope) ?? createEmptyRecipeData();
  } catch {
    return createEmptyRecipeData();
  }
}

export function saveRecipeLocalData(
  scope: RecipeStorageScope,
  data: RecipeLocalData,
): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const envelope: RecipeLocalEnvelope = {
      data: normalizeRecipeData(data),
      ownerUserId: ownerUserId(scope),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    storage.setItem(recipeStorageKey(scope), JSON.stringify(envelope));
  } catch {
    // Recettes remains usable for the current session when storage is blocked.
  }
}

function createEmptyRecipeData(): RecipeLocalData {
  return {
    favoriteRecipeIds: [],
    personalRecipes: [],
  };
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ownerUserId(scope: RecipeStorageScope): string | null {
  return scope.kind === "user" ? scope.userId : null;
}

function normalizeEnvelope(
  value: unknown,
  scope: RecipeStorageScope,
): RecipeLocalData | null {
  if (!isRecord(value) || value.version !== 1 || value.ownerUserId !== ownerUserId(scope)) {
    return null;
  }

  return normalizeRecipeData(value.data);
}

function normalizeRecipeData(value: unknown): RecipeLocalData {
  if (!isRecord(value)) {
    return createEmptyRecipeData();
  }

  const favoriteRecipeIds = Array.isArray(value.favoriteRecipeIds)
    ? value.favoriteRecipeIds.filter((id): id is string => typeof id === "string")
    : [];
  const personalRecipes = Array.isArray(value.personalRecipes)
    ? value.personalRecipes.map(normalizeRecipe).filter((recipe): recipe is Recipe => recipe !== null)
    : [];

  return {
    favoriteRecipeIds: [...new Set(favoriteRecipeIds)],
    personalRecipes,
  };
}

function normalizeRecipe(value: unknown): Recipe | null {
  if (!isRecord(value) || value.origin !== "personal") {
    return null;
  }

  const id = asString(value.id);
  const title = asString(value.title).trim();
  const description = asString(value.description).trim();
  const category = asString(value.category);

  if (!id || !title || !categoryIsRecipeCategory(category)) {
    return null;
  }

  return {
    category,
    cookMinutes: boundedInteger(value.cookMinutes, 0, 240, 0),
    createdAt: asString(value.createdAt, new Date().toISOString()),
    description,
    id,
    ingredients: normalizeIngredients(value.ingredients),
    origin: "personal",
    prepMinutes: boundedInteger(value.prepMinutes, 0, 240, 0),
    servings: boundedInteger(value.servings, 1, 12, 1),
    steps: normalizeSteps(value.steps),
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 5)
      : [],
    title,
    updatedAt: asString(value.updatedAt, new Date().toISOString()),
  };
}

function normalizeIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeIngredient)
    .filter((ingredient): ingredient is RecipeIngredient => ingredient !== null);
}

function normalizeIngredient(value: unknown, index: number): RecipeIngredient | null {
  if (!isRecord(value)) {
    return null;
  }

  const legacyText = asString(value.text).trim();
  const label = asString(value.label, legacyText).trim();
  if (!label) {
    return null;
  }

  if (!("label" in value) && legacyText) {
    return ingredientFromText(legacyText, index);
  }

  const unit = normalizeUnit(value.unit);
  const quantity = normalizeQuantity(value.quantity);
  const grams = gramsFromIngredientQuantity(quantity, unit);
  const ciqualCode = asString(value.ciqualCode).trim() || null;
  const ciqualName = asString(value.ciqualName).trim() || null;
  const foodState = normalizeFoodState(value.foodState);
  const reliability = normalizeReliability({
    ciqualCode,
    grams,
    quantity,
    value: value.reliability,
  });

  return {
    ciqualCode,
    ciqualName,
    foodState,
    grams,
    id: asString(value.id, `ingredient-${index + 1}`),
    label,
    quantity,
    reliability,
    text: formatIngredientText({ label, quantity, unit }),
    unit,
  };
}

function normalizeSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }
      const text = asString(item.text).trim();
      if (!text) {
        return null;
      }
      return {
        id: asString(item.id, `step-${index + 1}`),
        text,
      };
    })
    .filter((item): item is RecipeStep => item !== null);
}

function normalizeQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function normalizeUnit(value: unknown): RecipeIngredientUnit {
  const unit = asString(value);
  return unitIsRecipeIngredientUnit(unit) ? unit : "free";
}

function normalizeFoodState(value: unknown): RecipeFoodState {
  const foodState = asString(value);
  return foodStateIsRecipeFoodState(foodState) ? foodState : "unknown";
}

function normalizeReliability({
  ciqualCode,
  grams,
  quantity,
  value,
}: {
  ciqualCode: string | null;
  grams: number | null;
  quantity: number | null;
  value: unknown;
}): RecipeIngredientReliability {
  const reliability = asString(value);
  if (reliabilityIsRecipeIngredientReliability(reliability)) {
    if (reliability === "ciqual_linked" && (!ciqualCode || grams === null)) {
      return quantity ? "user_declared" : "incomplete";
    }
    return reliability;
  }

  if (ciqualCode && grams !== null) {
    return "ciqual_linked";
  }
  if (quantity !== null) {
    return "user_declared";
  }

  return "incomplete";
}

function boundedInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
