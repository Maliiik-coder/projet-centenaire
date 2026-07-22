"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChefHat, Plus, Search } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Button,
  EmptyState,
  IconButton,
  Surface,
  TextInput,
} from "@/components/ui";
import { HaruModuleHeader } from "@/components/centenaire/HaruModuleHeader";
import { cx } from "@/components/ui/styles";
import { RecipeCard } from "@/features/recipes/RecipeCard";
import { RecipeFormView } from "@/features/recipes/RecipeFormView";
import { FavoriteButton, RecipeStat } from "@/features/recipes/RecipeDisplay";
import {
  allRecipes,
  createEmptyRecipeData,
  deletePersonalRecipe,
  filterRecipes,
  findRecipe,
  isFavorite,
  savePersonalRecipe,
  toggleFavorite,
  type RecipeFilter,
} from "@/features/recipes/recipeModel";
import {
  guestRecipeStorageScope,
  loadRecipeLocalData,
  saveRecipeLocalData,
  userRecipeStorageScope,
} from "@/features/recipes/recipeLocalStore";
import type {
  Recipe,
  RecipeLocalData,
  RecipeStorageScope,
} from "@/features/recipes/recipeTypes";
import type { RecipeDetailViewProps } from "@/features/recipes/RecipeDetailView";

type RecipesView =
  | { kind: "catalog" }
  | { kind: "detail"; recipeId: string }
  | { kind: "create" }
  | { kind: "edit"; recipeId: string };

const filterLabels: Record<RecipeFilter, string> = {
  all: "Toutes",
  favorites: "Favoris",
  personal: "Les miennes",
};

const filters: RecipeFilter[] = ["all", "favorites", "personal"];
const RecipeDetailView = dynamic<RecipeDetailViewProps>(
  () =>
    import("@/features/recipes/RecipeDetailView").then(
      (module) => module.RecipeDetailView,
    ),
  {
    loading: () => (
      <Surface className="p-4" variant="subtle">
        <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
          Ouverture de la recette.
        </p>
      </Surface>
    ),
    ssr: false,
  },
);

export function RecipesApp() {
  const [data, setData] = useState<RecipeLocalData>(() => createEmptyRecipeData());
  const [loaded, setLoaded] = useState(false);
  const [storageScope, setStorageScope] = useState<RecipeStorageScope | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecipeFilter>("all");
  const [view, setView] = useState<RecipesView>({ kind: "catalog" });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadScopedRecipes = async () => {
      let scope: RecipeStorageScope = guestRecipeStorageScope;
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user.id;
          if (userId) scope = userRecipeStorageScope(userId);
        } catch {
          scope = guestRecipeStorageScope;
        }
      }

      if (cancelled) return;

      setData(loadRecipeLocalData(scope));
      setStorageScope(scope);
      setLoaded(true);
    };

    void loadScopedRecipes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && storageScope) {
      saveRecipeLocalData(storageScope, data);
    }
  }, [data, loaded, storageScope]);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  const visibleRecipes = useMemo(
    () => filterRecipes({ data, filter, query }),
    [data, filter, query],
  );
  const selectedRecipe =
    view.kind === "detail" || view.kind === "edit"
      ? findRecipe(data, view.recipeId)
      : null;

  const showCatalog = () => {
    setView({ kind: "catalog" });
    setNotice(null);
  };
  const openRecipe = (recipeId: string) => {
    setNotice(null);
    setView({ kind: "detail", recipeId });
  };
  const saveRecipe = (recipe: Recipe) => {
    setData((current) => savePersonalRecipe(current, recipe));
    setView({ kind: "detail", recipeId: recipe.id });
    setNotice("Recette enregistrée.");
  };
  const removeRecipe = (recipe: Recipe) => {
    if (recipe.origin !== "personal") return;
    if (!window.confirm("Supprimer cette recette ?")) return;

    setData((current) => deletePersonalRecipe(current, recipe.id));
    setView({ kind: "catalog" });
    setNotice("Recette supprimée.");
  };
  const changeFavorite = (recipeId: string) => {
    setData((current) => toggleFavorite(current, recipeId));
  };

  const headerBackAction =
    view.kind === "catalog"
      ? undefined
      : view.kind === "edit" && selectedRecipe
        ? () => setView({ kind: "detail", recipeId: selectedRecipe.id })
        : showCatalog;
  const headerRightAction =
    view.kind === "detail" && selectedRecipe ? (
      <FavoriteButton
        favorite={isFavorite(data, selectedRecipe.id)}
        onClick={() => changeFavorite(selectedRecipe.id)}
      />
    ) : null;

  return (
    <main className="pc-screen">
      <div className="pc-screen-inner flex min-h-dvh flex-col">
        <HaruModuleHeader
          backLabel={
            view.kind === "catalog" ? "Retour à Haru" : "Retour aux recettes"
          }
          onBack={headerBackAction}
          rightAction={headerRightAction}
          showBack={view.kind !== "catalog"}
        />

        <div className="flex-1 space-y-6 pb-5 pt-3">
          {view.kind === "catalog" ? (
            <RecipesCatalogView
              favoriteCount={data.favoriteRecipeIds.length}
              filter={filter}
              loaded={loaded}
              personalCount={data.personalRecipes.length}
              query={query}
              recipes={visibleRecipes}
              totalCount={allRecipes(data).length}
              onCreate={() => {
                setNotice(null);
                setView({ kind: "create" });
              }}
              onFavoriteToggle={changeFavorite}
              onFilterChange={setFilter}
              onOpen={openRecipe}
              onQueryChange={setQuery}
              isFavorite={(recipeId) => isFavorite(data, recipeId)}
            />
          ) : null}

          {view.kind === "detail" && selectedRecipe ? (
            <RecipeDetailView
              key={selectedRecipe.id}
              notice={notice}
              recipe={selectedRecipe}
              onDelete={() => removeRecipe(selectedRecipe)}
              onEdit={() => {
                setNotice(null);
                setView({ kind: "edit", recipeId: selectedRecipe.id });
              }}
            />
          ) : null}

          {view.kind === "detail" && !selectedRecipe ? <MissingRecipeView /> : null}

          {view.kind === "create" ? (
            <RecipeFormView onBack={showCatalog} onSave={saveRecipe} />
          ) : null}

          {view.kind === "edit" && selectedRecipe?.origin === "personal" ? (
            <RecipeFormView
              existingRecipe={selectedRecipe}
              onBack={() => setView({ kind: "detail", recipeId: selectedRecipe.id })}
              onSave={saveRecipe}
            />
          ) : null}

          {view.kind === "edit" && selectedRecipe?.origin !== "personal" ? (
            <MissingRecipeView />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function RecipesCatalogView({
  favoriteCount,
  filter,
  loaded,
  personalCount,
  query,
  recipes,
  totalCount,
  onCreate,
  onFavoriteToggle,
  onFilterChange,
  onOpen,
  onQueryChange,
  isFavorite,
}: {
  favoriteCount: number;
  filter: RecipeFilter;
  loaded: boolean;
  personalCount: number;
  query: string;
  recipes: Recipe[];
  totalCount: number;
  onCreate: () => void;
  onFavoriteToggle: (recipeId: string) => void;
  onFilterChange: (filter: RecipeFilter) => void;
  onOpen: (recipeId: string) => void;
  onQueryChange: (query: string) => void;
  isFavorite: (recipeId: string) => boolean;
}) {
  return (
    <>
      <header className="space-y-2">
        <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
          Catalogue
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              Recettes
            </h1>
            <p className="mt-2 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
              Des idées simples à garder sous la main.
            </p>
          </div>
          <IconButton
            className="rounded-full"
            label="Créer une recette"
            onClick={onCreate}
          >
            <Plus aria-hidden="true" size={24} />
          </IconButton>
        </div>
      </header>

      <section className="space-y-3" aria-label="Recherche et filtres">
        <label className="relative block">
          <span className="sr-only">Rechercher une recette</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pc-color-text-subtle)]"
            size={18}
          />
          <TextInput
            className="pl-11"
            placeholder="Rechercher"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item}
              className={cx(
                "pc-focus-ring min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-[length:var(--pc-font-size-secondary)] font-semibold transition",
                filter === item
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)]",
              )}
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
            >
              {filterLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2" aria-label="Résumé recettes">
        <RecipeStat label="Catalogue" value={totalCount} />
        <RecipeStat label="Favoris" value={favoriteCount} />
        <RecipeStat label="Perso" value={personalCount} />
      </section>

      <section className="space-y-3" aria-labelledby="recipes-list-title">
        <h2
          className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]"
          id="recipes-list-title"
        >
          À cuisiner
        </h2>
        {!loaded ? (
          <Surface className="p-4" variant="subtle">
            <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
              Chargement des recettes.
            </p>
          </Surface>
        ) : recipes.length === 0 ? (
          <EmptyState
            action={
              <Button variant="secondary" onClick={onCreate}>
                <Plus aria-hidden="true" size={18} />
                Ajouter une recette
              </Button>
            }
            description={
              filter === "favorites"
                ? "Ajoute une recette aux favoris pour la retrouver ici."
                : filter === "personal"
                  ? "Crée une première recette privée pour remplir cette vue."
                  : "Essaie une autre recherche ou crée ta propre recette."
            }
            icon={<ChefHat size={20} />}
            title="Rien à afficher"
          />
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <RecipeCard
                favorite={isFavorite(recipe.id)}
                key={recipe.id}
                recipe={recipe}
                onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                onOpen={() => onOpen(recipe.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function MissingRecipeView() {
  return (
    <div>
      <EmptyState
        description="Elle a peut-être été supprimée de cet appareil."
        icon={<ChefHat size={20} />}
        title="Recette introuvable"
      />
    </div>
  );
}
