export type RecipeCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack";

export type RecipeOrigin = "catalog" | "personal";

export type RecipeIngredient = {
  id: string;
  text: string;
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
  ingredientsText: string;
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
