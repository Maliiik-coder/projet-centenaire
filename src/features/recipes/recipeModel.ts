import { recipeCatalog } from "@/features/recipes/recipeCatalog";
import type {
  Recipe,
  RecipeCategory,
  RecipeDraft,
  RecipeDraftErrors,
  RecipeFoodState,
  RecipeIngredient,
  RecipeIngredientDraft,
  RecipeIngredientReliability,
  RecipeIngredientUnit,
  RecipeLocalData,
  RecipeStep,
} from "@/features/recipes/recipeTypes";

export type RecipeFilter = "all" | "favorites" | "personal";

export type RecipeDraftValidation =
  | { errors: RecipeDraftErrors; recipe: null }
  | { errors: null; recipe: Recipe };

export const recipeIngredientUnitLabels: Record<RecipeIngredientUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  cl: "cl",
  l: "l",
  piece: "pièce",
  tablespoon: "c. à soupe",
  teaspoon: "c. à café",
  pinch: "pincée",
  free: "libre",
};

export const recipeFoodStateLabels: Record<RecipeFoodState, string> = {
  raw: "Cru",
  cooked: "Cuit",
  not_applicable: "Sans objet",
  unknown: "Non précisé",
};

export const recipeIngredientReliabilityLabels: Record<
  RecipeIngredientReliability,
  string
> = {
  ciqual_linked: "CIQUAL + grammes",
  user_declared: "Quantité déclarée",
  legacy_text: "Ancien texte libre",
  incomplete: "Incomplet",
};

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
    ingredients: [createEmptyRecipeIngredientDraft("ingredient-draft-1")],
    prepMinutes: "10",
    servings: "2",
    stepsText: "",
    tagsText: "",
    title: "",
  };
}

export function createEmptyRecipeIngredientDraft(
  id: string,
): RecipeIngredientDraft {
  return {
    ciqualCode: "",
    ciqualName: "",
    foodState: "unknown",
    id,
    label: "",
    quantity: "",
    reliability: "incomplete",
    unit: "g",
  };
}

export function recipeDraftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    category: recipe.category,
    cookMinutes: String(recipe.cookMinutes),
    description: recipe.description,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ciqualCode: ingredient.ciqualCode ?? "",
      ciqualName: ingredient.ciqualName ?? "",
      foodState: ingredient.foodState,
      id: ingredient.id,
      label: ingredient.label,
      quantity: ingredient.quantity === null ? "" : String(ingredient.quantity),
      reliability: ingredient.reliability,
      unit: ingredient.unit,
    })),
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
        recipe.ingredients
          .map((ingredient) => `${ingredient.label} ${ingredient.text}`)
          .join(" "),
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
  const ingredientsResult = ingredientsFromDraft(draft.ingredients);
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
  if (ingredientsResult.error) {
    errors.ingredients = ingredientsResult.error;
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
      ingredients: ingredientsResult.ingredients,
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

export function ingredientFromText(
  text: string,
  index: number,
): RecipeIngredient {
  const label = text.trim();

  return {
    ciqualCode: null,
    ciqualName: null,
    foodState: "unknown",
    grams: null,
    id: `ingredient-${index + 1}`,
    label,
    quantity: null,
    reliability: "legacy_text",
    text: label,
    unit: "free",
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

export function unitIsRecipeIngredientUnit(
  value: string,
): value is RecipeIngredientUnit {
  return (
    value === "g" ||
    value === "kg" ||
    value === "ml" ||
    value === "cl" ||
    value === "l" ||
    value === "piece" ||
    value === "tablespoon" ||
    value === "teaspoon" ||
    value === "pinch" ||
    value === "free"
  );
}

export function foodStateIsRecipeFoodState(value: string): value is RecipeFoodState {
  return (
    value === "raw" ||
    value === "cooked" ||
    value === "not_applicable" ||
    value === "unknown"
  );
}

export function reliabilityIsRecipeIngredientReliability(
  value: string,
): value is RecipeIngredientReliability {
  return (
    value === "ciqual_linked" ||
    value === "user_declared" ||
    value === "legacy_text" ||
    value === "incomplete"
  );
}

export function gramsFromIngredientQuantity(
  quantity: number | null,
  unit: RecipeIngredientUnit,
): number | null {
  if (quantity === null || quantity <= 0) {
    return null;
  }

  if (unit === "g") {
    return roundGram(quantity);
  }
  if (unit === "kg") {
    return roundGram(quantity * 1000);
  }

  return null;
}

export function formatIngredientText(ingredient: {
  label: string;
  quantity: number | null;
  unit: RecipeIngredientUnit;
}): string {
  const label = ingredient.label.trim();
  if (!ingredient.quantity || ingredient.unit === "free") {
    return label;
  }

  return `${formatIngredientQuantity(ingredient.quantity, ingredient.unit)} ${label}`;
}

function ingredientsFromDraft(
  drafts: RecipeIngredientDraft[],
): { error: string | null; ingredients: RecipeIngredient[] } {
  const ingredients: RecipeIngredient[] = [];
  let hasInvalidBlankLabel = false;
  let hasInvalidQuantity = false;
  let hasInvalidUnit = false;
  let hasInvalidCiqualCode = false;

  drafts.forEach((draft, index) => {
    const label = draft.label.trim();
    const hasOtherData = Boolean(
      draft.quantity.trim() ||
        draft.ciqualCode.trim() ||
        draft.ciqualName.trim() ||
        draft.foodState !== "unknown",
    );

    if (!label && !hasOtherData) {
      return;
    }
    if (!label) {
      hasInvalidBlankLabel = true;
      return;
    }

    const quantity =
      draft.quantity.trim() === ""
        ? null
        : parsePositiveDecimal(draft.quantity);
    if (draft.quantity.trim() !== "" && quantity === null) {
      hasInvalidQuantity = true;
      return;
    }
    if (!unitIsRecipeIngredientUnit(draft.unit)) {
      hasInvalidUnit = true;
      return;
    }
    if (draft.ciqualCode.trim() && !/^\d+$/.test(draft.ciqualCode.trim())) {
      hasInvalidCiqualCode = true;
      return;
    }

    const ciqualCode = draft.ciqualCode.trim() || null;
    const ciqualName = draft.ciqualName.trim() || null;
    const grams = gramsFromIngredientQuantity(quantity, draft.unit);
    const reliability = ingredientReliability({
      ciqualCode,
      grams,
      quantity,
      sourceReliability: draft.reliability,
    });

    ingredients.push({
      ciqualCode,
      ciqualName,
      foodState: draft.foodState,
      grams,
      id: draft.id || `ingredient-${index + 1}`,
      label,
      quantity,
      reliability,
      text: formatIngredientText({ label, quantity, unit: draft.unit }),
      unit: draft.unit,
    });
  });

  if (hasInvalidBlankLabel) {
    return {
      error: "Chaque ingrédient renseigné doit avoir un libellé.",
      ingredients,
    };
  }
  if (hasInvalidQuantity) {
    return {
      error: "Les quantités doivent être des nombres positifs.",
      ingredients,
    };
  }
  if (hasInvalidUnit) {
    return {
      error: "Choisis une unité valide pour chaque ingrédient.",
      ingredients,
    };
  }
  if (hasInvalidCiqualCode) {
    return {
      error: "Un code CIQUAL doit contenir uniquement des chiffres.",
      ingredients,
    };
  }
  if (ingredients.length === 0) {
    return {
      error: "Ajoute au moins un ingrédient.",
      ingredients,
    };
  }

  return { error: null, ingredients };
}

function ingredientReliability({
  ciqualCode,
  grams,
  quantity,
  sourceReliability,
}: {
  ciqualCode: string | null;
  grams: number | null;
  quantity: number | null;
  sourceReliability: RecipeIngredientReliability;
}): RecipeIngredientReliability {
  if (ciqualCode && grams !== null) {
    return "ciqual_linked";
  }
  if (sourceReliability === "legacy_text" && quantity === null && !ciqualCode) {
    return "legacy_text";
  }
  if (quantity !== null) {
    return "user_declared";
  }

  return "incomplete";
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

function parsePositiveDecimal(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function toStep(text: string, index: number): RecipeStep {
  return {
    id: `step-${index + 1}`,
    text,
  };
}

function formatIngredientQuantity(
  quantity: number,
  unit: RecipeIngredientUnit,
): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: unit === "g" || unit === "ml" ? 1 : 2,
  }).format(quantity);

  if (unit === "piece") {
    return `${formatted} ${quantity > 1 ? "pièces" : "pièce"}`;
  }
  if (unit === "tablespoon") {
    return `${formatted} c. à soupe`;
  }
  if (unit === "teaspoon") {
    return `${formatted} c. à café`;
  }
  if (unit === "pinch") {
    return `${formatted} ${quantity > 1 ? "pincées" : "pincée"}`;
  }

  return `${formatted} ${recipeIngredientUnitLabels[unit]}`;
}

function roundGram(value: number): number {
  return Math.round(value * 10) / 10;
}
