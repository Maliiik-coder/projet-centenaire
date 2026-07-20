"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  BookOpen,
  ChefHat,
  ChevronLeft,
  Clock3,
  Heart,
  PencilLine,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BackButton,
  Button,
  EmptyState,
  FormField,
  IconButton,
  Select,
  Surface,
  TextInput,
  TopBar,
} from "@/components/ui";
import { cx } from "@/components/ui/styles";
import { recipeCategoryLabels } from "@/features/recipes/recipeCatalog";
import {
  allRecipes,
  categoryIsRecipeCategory,
  createEmptyRecipeData,
  createEmptyRecipeDraft,
  deletePersonalRecipe,
  filterRecipes,
  findRecipe,
  isFavorite,
  recipeDraftFromRecipe,
  recipeFromDraft,
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
  RecipeDraft,
  RecipeDraftErrors,
  RecipeLocalData,
  RecipeStorageScope,
} from "@/features/recipes/recipeTypes";

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
          if (userId) {
            scope = userRecipeStorageScope(userId);
          }
        } catch {
          scope = guestRecipeStorageScope;
        }
      }

      if (cancelled) {
        return;
      }

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

  const visibleRecipes = useMemo(
    () => filterRecipes({ data, filter, query }),
    [data, filter, query],
  );
  const selectedRecipe =
    view.kind === "detail" || view.kind === "edit"
      ? findRecipe(data, view.recipeId)
      : null;
  const favoriteCount = data.favoriteRecipeIds.length;
  const personalCount = data.personalRecipes.length;

  const showCatalog = () => {
    setView({ kind: "catalog" });
    setNotice(null);
  };

  const saveRecipe = (recipe: Recipe) => {
    setData((current) => savePersonalRecipe(current, recipe));
    setView({ kind: "detail", recipeId: recipe.id });
    setNotice("Recette enregistrée.");
  };

  const removeRecipe = (recipe: Recipe) => {
    if (recipe.origin !== "personal") {
      return;
    }

    if (!window.confirm("Supprimer cette recette ?")) {
      return;
    }

    setData((current) => deletePersonalRecipe(current, recipe.id));
    setView({ kind: "catalog" });
    setNotice("Recette supprimée.");
  };

  const changeFavorite = (recipeId: string) => {
    setData((current) => toggleFavorite(current, recipeId));
  };

  return (
    <main className="pc-screen">
      <div className="pc-screen-inner flex min-h-dvh flex-col">
        <TopBar label="Recettes" />

        <div className="flex-1 space-y-6 py-5">
          {view.kind === "catalog" ? (
            <RecipesCatalogView
              favoriteCount={favoriteCount}
              filter={filter}
              loaded={loaded}
              personalCount={personalCount}
              query={query}
              recipes={visibleRecipes}
              totalCount={allRecipes(data).length}
              onCreate={() => {
                setNotice(null);
                setView({ kind: "create" });
              }}
              onFavoriteToggle={changeFavorite}
              onFilterChange={setFilter}
              onOpen={(recipeId) => {
                setNotice(null);
                setView({ kind: "detail", recipeId });
              }}
              onQueryChange={setQuery}
              isFavorite={(recipeId) => isFavorite(data, recipeId)}
            />
          ) : null}

          {view.kind === "detail" && selectedRecipe ? (
            <RecipeDetailView
              favorite={isFavorite(data, selectedRecipe.id)}
              notice={notice}
              recipe={selectedRecipe}
              onBack={showCatalog}
              onDelete={() => removeRecipe(selectedRecipe)}
              onEdit={() => {
                setNotice(null);
                setView({ kind: "edit", recipeId: selectedRecipe.id });
              }}
              onFavoriteToggle={() => changeFavorite(selectedRecipe.id)}
            />
          ) : null}

          {view.kind === "detail" && !selectedRecipe ? (
            <MissingRecipeView onBack={showCatalog} />
          ) : null}

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
            <MissingRecipeView onBack={showCatalog} />
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
      <header className="space-y-4">
        <BackButton
          className="self-start"
          fallbackHref="/?app-resume=1&tab=today"
          label="Retour à Haru"
        />
        <div className="space-y-2">
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

function RecipeCard({
  favorite,
  recipe,
  onFavoriteToggle,
  onOpen,
}: {
  favorite: boolean;
  recipe: Recipe;
  onFavoriteToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <Surface
      as="article"
      className="pc-focus-ring pc-motion-safe cursor-pointer p-4 transition active:translate-y-px"
      role="button"
      tabIndex={0}
      variant="interactive"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            {recipeCategoryLabels[recipe.category]}
          </p>
          <h3 className="mt-1 text-[length:var(--pc-font-size-card-title)] leading-6 font-bold text-[var(--pc-color-text)]">
            {recipe.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
            {recipe.description}
          </p>
        </div>
        <FavoriteButton
          favorite={favorite}
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle();
          }}
        />
      </div>
      <RecipeMeta recipe={recipe} />
      <RecipeTags recipe={recipe} />
    </Surface>
  );
}

function RecipeDetailView({
  favorite,
  notice,
  recipe,
  onBack,
  onDelete,
  onEdit,
  onFavoriteToggle,
}: {
  favorite: boolean;
  notice: string | null;
  recipe: Recipe;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onFavoriteToggle: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <IconButton className="rounded-full" label="Retour au catalogue" onClick={onBack}>
          <ChevronLeft aria-hidden="true" size={24} />
        </IconButton>
        <FavoriteButton
          favorite={favorite}
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle();
          }}
        />
      </div>

      {notice ? (
        <Surface className="px-4 py-3" variant="selected">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-primary)]">
            {notice}
          </p>
        </Surface>
      ) : null}

      <article className="space-y-5">
        <header className="space-y-3">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            {recipe.origin === "personal" ? "Recette personnelle" : recipeCategoryLabels[recipe.category]}
          </p>
          <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
            {recipe.title}
          </h1>
          <p className="text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
            {recipe.description}
          </p>
          <RecipeMeta recipe={recipe} />
          <RecipeTags recipe={recipe} />
        </header>

        {recipe.origin === "personal" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onEdit}>
              <PencilLine aria-hidden="true" size={18} />
              Modifier
            </Button>
            <Button variant="danger" onClick={onDelete}>
              <Trash2 aria-hidden="true" size={18} />
              Supprimer
            </Button>
          </div>
        ) : null}

        <RecipeSection icon={<BookOpen size={19} />} title="Ingrédients">
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient) => (
              <li
                className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-3 py-2 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]"
                key={ingredient.id}
              >
                {ingredient.text}
              </li>
            ))}
          </ul>
        </RecipeSection>

        <RecipeSection icon={<ChefHat size={19} />} title="Étapes">
          <ol className="space-y-3">
            {recipe.steps.map((step, index) => (
              <li className="flex gap-3" key={step.id}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[length:var(--pc-font-size-secondary)] font-bold text-[var(--pc-color-primary)]">
                  {index + 1}
                </span>
                <p className="pt-1 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text)]">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </RecipeSection>
      </article>
    </>
  );
}

function RecipeFormView({
  existingRecipe,
  onBack,
  onSave,
}: {
  existingRecipe?: Recipe;
  onBack: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    existingRecipe ? recipeDraftFromRecipe(existingRecipe) : createEmptyRecipeDraft(),
  );
  const [errors, setErrors] = useState<RecipeDraftErrors>({});

  const updateDraft =
    (field: keyof RecipeDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };
  const updateCategory = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!categoryIsRecipeCategory(value)) {
      return;
    }

    setDraft((current) => ({ ...current, category: value }));
    setErrors((current) => ({ ...current, category: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nowIso = new Date().toISOString();
    const result = recipeFromDraft({
      draft,
      existing: existingRecipe,
      nowIso,
      recipeId: existingRecipe?.id ?? createRecipeId(),
    });

    if (!result.recipe) {
      setErrors(result.errors);
      return;
    }

    onSave(result.recipe);
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="flex items-center justify-between gap-3">
        <IconButton className="rounded-full" label="Retour" onClick={onBack}>
          <ChevronLeft aria-hidden="true" size={24} />
        </IconButton>
        <Button type="submit">
          {existingRecipe ? "Enregistrer" : "Créer"}
        </Button>
      </div>

      <header className="space-y-2">
        <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
          {existingRecipe ? "Recette personnelle" : "Nouvelle recette"}
        </p>
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          {existingRecipe ? "Modifier" : "Créer une recette"}
        </h1>
      </header>

      <Surface className="space-y-4 p-4" variant="default">
        <FormField error={errors.title} id="recipe-title" label="Nom" required>
          <TextInput
            placeholder="Ex. soupe de légumes"
            value={draft.title}
            onChange={updateDraft("title")}
          />
        </FormField>

        <FormField
          error={errors.description}
          help="Une phrase suffit."
          id="recipe-description"
          label="Description"
          required
        >
          <TextInput
            placeholder="Ce que tu veux retrouver plus tard"
            value={draft.description}
            onChange={updateDraft("description")}
          />
        </FormField>

        <FormField id="recipe-category" label="Moment">
          <Select value={draft.category} onChange={updateCategory}>
            {Object.entries(recipeCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-3 gap-2">
          <FormField error={errors.servings} id="recipe-servings" label="Parts" required>
            <TextInput
              inputMode="numeric"
              min={1}
              max={12}
              type="number"
              value={draft.servings}
              onChange={updateDraft("servings")}
            />
          </FormField>
          <FormField error={errors.prepMinutes} id="recipe-prep" label="Prépa" required>
            <TextInput
              inputMode="numeric"
              min={0}
              max={240}
              type="number"
              value={draft.prepMinutes}
              onChange={updateDraft("prepMinutes")}
            />
          </FormField>
          <FormField error={errors.cookMinutes} id="recipe-cook" label="Cuisson" required>
            <TextInput
              inputMode="numeric"
              min={0}
              max={240}
              type="number"
              value={draft.cookMinutes}
              onChange={updateDraft("cookMinutes")}
            />
          </FormField>
        </div>
      </Surface>

      <RecipeTextArea
        error={errors.ingredientsText}
        help="Un ingrédient par ligne."
        id="recipe-ingredients"
        label="Ingrédients"
        required
        rows={6}
        value={draft.ingredientsText}
        onChange={updateDraft("ingredientsText")}
      />

      <RecipeTextArea
        error={errors.stepsText}
        help="Une étape par ligne."
        id="recipe-steps"
        label="Étapes"
        required
        rows={5}
        value={draft.stepsText}
        onChange={updateDraft("stepsText")}
      />

      <FormField help="Optionnel, séparé par des virgules." id="recipe-tags" label="Repères">
        <TextInput
          placeholder="rapide, froid, à emporter"
          value={draft.tagsText}
          onChange={updateDraft("tagsText")}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <Button variant="secondary" onClick={onBack}>
          Annuler
        </Button>
        <Button type="submit">
          {existingRecipe ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function RecipeTextArea({
  error,
  help,
  id,
  label,
  required,
  rows,
  value,
  onChange,
}: {
  error?: string;
  help?: string;
  id: string;
  label: string;
  required?: boolean;
  rows: number;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <label
        className="text-[length:var(--pc-font-size-secondary)] leading-5 font-medium text-[var(--pc-color-text)]"
        htmlFor={id}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        aria-invalid={error ? true : undefined}
        className={cx(
          "pc-focus-ring w-full rounded-[var(--pc-radius-control)] border bg-[var(--pc-color-surface)] px-4 py-3 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--pc-color-text-subtle)]",
          error
            ? "border-[var(--pc-color-danger)]"
            : "border-[var(--pc-color-border)] hover:border-[var(--pc-color-text-subtle)]",
        )}
        id={id}
        required={required}
        rows={rows}
        value={value}
        onChange={onChange}
      />
      {help && !error ? (
        <p
          className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]"
          id={`${id}-help`}
        >
          {help}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-[length:var(--pc-font-size-meta)] leading-5 font-medium text-[var(--pc-color-danger)]"
          id={`${id}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RecipeSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
          {icon}
        </span>
        <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-text-muted)]">
      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--pc-color-surface-subtle)] px-3">
        <Clock3 aria-hidden="true" size={15} />
        {totalMinutes} min
      </span>
      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--pc-color-surface-subtle)] px-3">
        <UsersRound aria-hidden="true" size={15} />
        {recipe.servings} {recipe.servings > 1 ? "parts" : "part"}
      </span>
      <span className="inline-flex min-h-8 items-center rounded-full bg-[var(--pc-color-surface-subtle)] px-3">
        {recipe.origin === "personal" ? "Privée" : "Catalogue Haru"}
      </span>
    </div>
  );
}

function RecipeTags({ recipe }: { recipe: Recipe }) {
  if (recipe.tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {recipe.tags.map((tag) => (
        <span
          className="rounded-full bg-[var(--pc-color-primary-soft)] px-3 py-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]"
          key={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function FavoriteButton({
  favorite,
  onClick,
}: {
  favorite: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <IconButton
      className={cx(
        "rounded-full",
        favorite &&
          "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]",
      )}
      label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={onClick}
    >
      <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} size={22} />
    </IconButton>
  );
}

function RecipeStat({ label, value }: { label: string; value: number }) {
  return (
    <Surface className="px-3 py-2" variant="subtle">
      <p className="text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl leading-7 font-bold tabular-nums text-[var(--pc-color-text)]">
        {value}
      </p>
    </Surface>
  );
}

function MissingRecipeView({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <IconButton className="rounded-full" label="Retour au catalogue" onClick={onBack}>
        <ChevronLeft aria-hidden="true" size={24} />
      </IconButton>
      <EmptyState
        description="Elle a peut-être été supprimée de cet appareil."
        icon={<ChefHat size={20} />}
        title="Recette introuvable"
      />
    </div>
  );
}

function createRecipeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `recipe-${crypto.randomUUID()}`;
  }

  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
