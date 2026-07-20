export type RecipeCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack";

export type RecipeOrigin = "catalog" | "personal";

export type RecipeIngredientUnit =
  | "g"
  | "kg"
  | "ml"
  | "cl"
  | "l"
  | "piece"
  | "tablespoon"
  | "teaspoon"
  | "pinch"
  | "free";

export type RecipeFoodState =
  | "raw"
  | "cooked"
  | "not_applicable"
  | "unknown";

export type RecipeIngredientReliability =
  | "ciqual_linked"
  | "user_declared"
  | "legacy_text"
  | "incomplete";

export type RecipeIngredient = {
  id: string;
  label: string;
  text: string;
  quantity: number | null;
  unit: RecipeIngredientUnit;
  grams: number | null;
  ciqualCode: string | null;
  ciqualName: string | null;
  foodState: RecipeFoodState;
  reliability: RecipeIngredientReliability;
};

export type RecipeIngredientDraft = {
  id: string;
  label: string;
  quantity: string;
  unit: RecipeIngredientUnit;
  ciqualCode: string;
  ciqualName: string;
  foodState: RecipeFoodState;
  reliability: RecipeIngredientReliability;
};

export type RecipeStep = {
  id: string;
  text: string;
};

export type Recipe = {
  id: string;
  category: RecipeCategory;
  cookMinutes: number;
  createdAt: string;
  description: string;
  ingredients: RecipeIngredient[];
  origin: RecipeOrigin;
  prepMinutes: number;
  servings: number;
  steps: RecipeStep[];
  tags: string[];
  title: string;
  updatedAt: string;
};

export type RecipeDraft = {
  category: RecipeCategory;
  cookMinutes: string;
  description: string;
  ingredients: RecipeIngredientDraft[];
  prepMinutes: string;
  servings: string;
  stepsText: string;
  tagsText: string;
  title: string;
};

export type RecipeDraftErrors = Partial<Record<keyof RecipeDraft, string>>;

export type RecipeLocalData = {
  favoriteRecipeIds: string[];
  personalRecipes: Recipe[];
};

export type RecipeStorageScope =
  | { kind: "guest" }
  | { kind: "user"; userId: string };
