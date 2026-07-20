import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyRecipeData,
} from "@/features/recipes/recipeModel";
import {
  guestRecipeStorageScope,
  loadRecipeLocalData,
  recipeStorageKey,
  saveRecipeLocalData,
  userRecipeStorageScope,
} from "@/features/recipes/recipeLocalStore";
import type { Recipe, RecipeLocalData } from "@/features/recipes/recipeTypes";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("recipeLocalStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retourne une donnee vide quand le stockage navigateur est indisponible", () => {
    vi.stubGlobal("window", blockedLocalStorageWindow());

    expect(loadRecipeLocalData(guestRecipeStorageScope)).toEqual(createEmptyRecipeData());
  });

  it("ignore les sauvegardes quand le stockage est bloque", () => {
    vi.stubGlobal("window", blockedLocalStorageWindow());

    expect(() =>
      saveRecipeLocalData(guestRecipeStorageScope, createEmptyRecipeData()),
    ).not.toThrow();
  });

  it("cloisonne les recettes invite et utilisateur", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const guestData: RecipeLocalData = {
      favoriteRecipeIds: ["catalog-wrap-oeuf-crudites"],
      personalRecipes: [createRecipe("recipe-guest", "Recette invite")],
    };
    const userData: RecipeLocalData = {
      favoriteRecipeIds: ["recipe-user"],
      personalRecipes: [createRecipe("recipe-user", "Recette utilisateur")],
    };

    saveRecipeLocalData(guestRecipeStorageScope, guestData);
    saveRecipeLocalData(userRecipeStorageScope("user-a"), userData);

    expect(recipeStorageKey(guestRecipeStorageScope)).not.toBe(
      recipeStorageKey(userRecipeStorageScope("user-a")),
    );
    expect(loadRecipeLocalData(guestRecipeStorageScope)).toEqual(guestData);
    expect(loadRecipeLocalData(userRecipeStorageScope("user-a"))).toEqual(userData);
    expect(loadRecipeLocalData(userRecipeStorageScope("user-b"))).toEqual(
      createEmptyRecipeData(),
    );
  });

  it("normalise les donnees stockees et ignore les recettes non personnelles", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    storage.setItem(
      recipeStorageKey(guestRecipeStorageScope),
      JSON.stringify({
        data: {
          favoriteRecipeIds: ["recipe-a", "recipe-a", 42],
          personalRecipes: [
            { ...createRecipe("catalog-copy", "Copie catalogue"), origin: "catalog" },
            { ...createRecipe("invalid", ""), title: "" },
            {
              ...createRecipe("recipe-a", "Recette gardee"),
              cookMinutes: 999,
              ingredients: [
                {
                  ciqualCode: "20009",
                  foodState: "raw",
                  grams: 999,
                  id: "ingredient-1",
                  label: "Carotte",
                  quantity: 999,
                  reliability: "ciqual_linked",
                  text: "999 g Carotte",
                  unit: "g",
                },
              ],
              servings: 99,
            },
          ],
        },
        ownerUserId: null,
        updatedAt: "2026-07-20T10:00:00.000Z",
        version: 1,
      }),
    );

    const loaded = loadRecipeLocalData(guestRecipeStorageScope);

    expect(loaded.favoriteRecipeIds).toEqual(["recipe-a"]);
    expect(loaded.personalRecipes).toHaveLength(1);
    expect(loaded.personalRecipes[0]?.cookMinutes).toBe(240);
    expect(loaded.personalRecipes[0]?.servings).toBe(12);
    expect(loaded.personalRecipes[0]?.ingredients[0]).toMatchObject({
      grams: 999,
      label: "Carotte",
      reliability: "ciqual_linked",
      unit: "g",
    });
  });

  it("garde les anciennes recettes locales texte libre lisibles mais incompletes", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    storage.setItem(
      recipeStorageKey(guestRecipeStorageScope),
      JSON.stringify({
        data: {
          favoriteRecipeIds: [],
          personalRecipes: [
            {
              ...createRecipe("recipe-legacy", "Ancienne recette"),
              ingredients: [{ id: "ingredient-1", text: "Une poignée de riz" }],
            },
          ],
        },
        ownerUserId: null,
        updatedAt: "2026-07-20T10:00:00.000Z",
        version: 1,
      }),
    );

    expect(loadRecipeLocalData(guestRecipeStorageScope).personalRecipes[0]?.ingredients).toEqual([
      {
        ciqualCode: null,
        ciqualName: null,
        foodState: "unknown",
        grams: null,
        id: "ingredient-1",
        label: "Une poignée de riz",
        quantity: null,
        reliability: "legacy_text",
        text: "Une poignée de riz",
        unit: "free",
      },
    ]);
  });
});

function blockedLocalStorageWindow(): object {
  return Object.defineProperty({}, "localStorage", {
    get() {
      throw new Error("localStorage unavailable");
    },
  });
}

function createRecipe(id: string, title: string): Recipe {
  return {
    category: "dinner",
    cookMinutes: 15,
    createdAt: "2026-07-20T10:00:00.000Z",
    description: "Une recette de test sauvegardee localement.",
    id,
    ingredients: [
      {
        ciqualCode: "20009",
        ciqualName: "Carotte, crue",
        foodState: "raw",
        grams: 120,
        id: "ingredient-1",
        label: "Carotte",
        quantity: 120,
        reliability: "ciqual_linked",
        text: "120 g Carotte",
        unit: "g",
      },
    ],
    origin: "personal",
    prepMinutes: 10,
    servings: 2,
    steps: [{ id: "step-1", text: "Melanger" }],
    tags: ["test"],
    title,
    updatedAt: "2026-07-20T10:00:00.000Z",
  };
}
