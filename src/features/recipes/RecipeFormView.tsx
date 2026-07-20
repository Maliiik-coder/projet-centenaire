import { useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  FormField,
  IconButton,
  Select,
  Surface,
  TextInput,
} from "@/components/ui";
import { cx } from "@/components/ui/styles";
import { recipeCategoryLabels } from "@/features/recipes/recipeCatalog";
import {
  categoryIsRecipeCategory,
  createEmptyRecipeDraft,
  createEmptyRecipeIngredientDraft,
  recipeDraftFromRecipe,
  recipeFromDraft,
  recipeIngredientUnitLabels,
} from "@/features/recipes/recipeModel";
import {
  applyRecipeIngredientLabelChange,
  applyRecipeIngredientSuggestion,
  clearRecipeIngredientAssociation,
  shouldSearchRecipeIngredientLabel,
  toRecipeIngredientSearchSuggestion,
  type RecipeIngredientSearchSuggestion,
} from "@/features/recipes/recipeIngredientAssociation";
import type {
  Recipe,
  RecipeDraft,
  RecipeDraftErrors,
  RecipeIngredientDraft,
} from "@/features/recipes/recipeTypes";

type SearchCiqualFoods = (
  query: string,
  limit?: number,
) => Array<{
  canonicalName: string;
  ciqualCode: string;
  groupName: string | null;
  subGroupName: string | null;
}>;

export function RecipeFormView({
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
  const [ingredientSearch, setIngredientSearch] =
    useState<SearchCiqualFoods | null>(null);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchLoadingId, setSearchLoadingId] = useState<string | null>(null);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<
    Record<string, RecipeIngredientSearchSuggestion[]>
  >({});
  const [ingredientSearchQueries, setIngredientSearchQueries] = useState<
    Record<string, string>
  >({});
  const [ingredientSearchErrors, setIngredientSearchErrors] = useState<
    Record<string, string>
  >({});

  const loadIngredientSearch = async (): Promise<SearchCiqualFoods> => {
    if (ingredientSearch) return ingredientSearch;

    const ciqualFoodsModule = await import("@/lib/nutrition/ciqualFoods");
    setIngredientSearch(() => ciqualFoodsModule.searchCiqualFoods);
    return ciqualFoodsModule.searchCiqualFoods;
  };

  const searchIngredientLabel = async (ingredientId: string, label: string) => {
    const query = label.trim();

    if (!shouldSearchRecipeIngredientLabel(query)) {
      setIngredientSuggestions((current) => omitRecordKey(current, ingredientId));
      setIngredientSearchQueries((current) => omitRecordKey(current, ingredientId));
      setIngredientSearchErrors((current) => omitRecordKey(current, ingredientId));
      return;
    }

    setActiveSearchId(ingredientId);
    setSearchLoadingId(ingredientId);
    setIngredientSearchErrors((current) => omitRecordKey(current, ingredientId));

    try {
      const search = await loadIngredientSearch();
      const suggestions = search(query, 5).map(toRecipeIngredientSearchSuggestion);

      setIngredientSuggestions((current) => ({
        ...current,
        [ingredientId]: suggestions,
      }));
      setIngredientSearchQueries((current) => ({
        ...current,
        [ingredientId]: query,
      }));
    } catch {
      setIngredientSuggestions((current) => omitRecordKey(current, ingredientId));
      setIngredientSearchErrors((current) => ({
        ...current,
        [ingredientId]: "Recherche indisponible pour le moment.",
      }));
    } finally {
      setSearchLoadingId((current) => (current === ingredientId ? null : current));
    }
  };

  const updateDraft =
    (field: keyof RecipeDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };
  const updateCategory = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!categoryIsRecipeCategory(value)) return;

    setDraft((current) => ({ ...current, category: value }));
    setErrors((current) => ({ ...current, category: undefined }));
  };
  const updateIngredient =
    <K extends keyof RecipeIngredientDraft>(ingredientId: string, field: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value as RecipeIngredientDraft[K];
      setDraft((current) => ({
        ...current,
        ingredients: current.ingredients.map((ingredient) =>
          ingredient.id === ingredientId
            ? { ...ingredient, [field]: value }
            : ingredient,
        ),
      }));
      setErrors((current) => ({ ...current, ingredients: undefined }));
    };
  const updateIngredientLabel =
    (ingredientId: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const label = event.target.value;
      setDraft((current) => ({
        ...current,
        ingredients: current.ingredients.map((ingredient) =>
          ingredient.id === ingredientId
            ? applyRecipeIngredientLabelChange(ingredient, label)
            : ingredient,
        ),
      }));
      setErrors((current) => ({ ...current, ingredients: undefined }));
      void searchIngredientLabel(ingredientId, label);
    };
  const selectIngredientSuggestion = (
    ingredientId: string,
    suggestion: RecipeIngredientSearchSuggestion,
  ) => {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === ingredientId
          ? applyRecipeIngredientSuggestion(ingredient, suggestion)
          : ingredient,
      ),
    }));
    setErrors((current) => ({ ...current, ingredients: undefined }));
    setActiveSearchId(null);
    setIngredientSuggestions((current) => omitRecordKey(current, ingredientId));
    setIngredientSearchQueries((current) => omitRecordKey(current, ingredientId));
  };
  const clearIngredientAssociation = (ingredientId: string) => {
    const ingredient = draft.ingredients.find((item) => item.id === ingredientId);
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.id === ingredientId ? clearRecipeIngredientAssociation(item) : item,
      ),
    }));
    setErrors((current) => ({ ...current, ingredients: undefined }));
    if (ingredient) {
      void searchIngredientLabel(ingredientId, ingredient.label);
    }
  };
  const addIngredient = () => {
    setDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        createEmptyRecipeIngredientDraft(createDraftIngredientId()),
      ],
    }));
    setErrors((current) => ({ ...current, ingredients: undefined }));
  };
  const removeIngredient = (ingredientId: string) => {
    setDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.length > 1
          ? current.ingredients.filter((ingredient) => ingredient.id !== ingredientId)
          : current.ingredients,
    }));
    setErrors((current) => ({ ...current, ingredients: undefined }));
    setIngredientSuggestions((current) => omitRecordKey(current, ingredientId));
    setIngredientSearchQueries((current) => omitRecordKey(current, ingredientId));
    setIngredientSearchErrors((current) => omitRecordKey(current, ingredientId));
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
      <div className="flex items-center justify-end">
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

      <IngredientDraftSection
        error={errors.ingredients}
        ingredients={draft.ingredients}
        activeSearchId={activeSearchId}
        searchErrors={ingredientSearchErrors}
        searchLoadingId={searchLoadingId}
        searchQueries={ingredientSearchQueries}
        suggestions={ingredientSuggestions}
        onAdd={addIngredient}
        onChange={updateIngredient}
        onClearAssociation={clearIngredientAssociation}
        onLabelChange={updateIngredientLabel}
        onRemove={removeIngredient}
        onSelectSuggestion={selectIngredientSuggestion}
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

function IngredientDraftSection({
  activeSearchId,
  error,
  ingredients,
  searchErrors,
  searchLoadingId,
  searchQueries,
  suggestions,
  onAdd,
  onChange,
  onClearAssociation,
  onLabelChange,
  onRemove,
  onSelectSuggestion,
}: {
  activeSearchId: string | null;
  error?: string;
  ingredients: RecipeIngredientDraft[];
  searchErrors: Record<string, string>;
  searchLoadingId: string | null;
  searchQueries: Record<string, string>;
  suggestions: Record<string, RecipeIngredientSearchSuggestion[]>;
  onAdd: () => void;
  onChange: (
    ingredientId: string,
    field: keyof RecipeIngredientDraft,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClearAssociation: (ingredientId: string) => void;
  onLabelChange: (ingredientId: string) => (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (ingredientId: string) => void;
  onSelectSuggestion: (
    ingredientId: string,
    suggestion: RecipeIngredientSearchSuggestion,
  ) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="recipe-ingredients-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]"
            id="recipe-ingredients-title"
          >
            Ingrédients
          </h2>
          <p className="mt-1 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
            La nutrition utilise seulement les aliments reconnus avec une quantité en g ou kg.
          </p>
        </div>
        <IconButton
          className="rounded-full"
          label="Ajouter un ingrédient"
          onClick={onAdd}
        >
          <Plus aria-hidden="true" size={24} />
        </IconButton>
      </div>

      {error ? (
        <p className="text-[length:var(--pc-font-size-meta)] leading-5 font-medium text-[var(--pc-color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => (
          <Surface className="space-y-3 p-4" key={ingredient.id} variant="default">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
                Ingrédient {index + 1}
              </p>
              <IconButton
                className="rounded-full"
                disabled={ingredients.length <= 1}
                label="Retirer cet ingrédient"
                size="compact"
                onClick={() => onRemove(ingredient.id)}
              >
                <Trash2 aria-hidden="true" size={18} />
              </IconButton>
            </div>

            <FormField id={`${ingredient.id}-label`} label="Libellé" required>
              <TextInput
                placeholder="Ex. riz cuit"
                value={ingredient.label}
                onChange={onLabelChange(ingredient.id)}
              />
            </FormField>

            <IngredientRecognitionControl
              active={activeSearchId === ingredient.id}
              error={searchErrors[ingredient.id]}
              ingredient={ingredient}
              loading={searchLoadingId === ingredient.id}
              lastSearchQuery={searchQueries[ingredient.id]}
              suggestions={suggestions[ingredient.id] ?? []}
              onClear={() => onClearAssociation(ingredient.id)}
              onSelect={(suggestion) => onSelectSuggestion(ingredient.id, suggestion)}
            />

            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
              <FormField id={`${ingredient.id}-quantity`} label="Quantité">
                <TextInput
                  inputMode="decimal"
                  placeholder="Ex. 120"
                  value={ingredient.quantity}
                  onChange={onChange(ingredient.id, "quantity")}
                />
              </FormField>
              <FormField id={`${ingredient.id}-unit`} label="Unité">
                <Select
                  value={ingredient.unit}
                  onChange={onChange(ingredient.id, "unit")}
                >
                  {Object.entries(recipeIngredientUnitLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
}

function IngredientRecognitionControl({
  active,
  error,
  ingredient,
  lastSearchQuery,
  loading,
  suggestions,
  onClear,
  onSelect,
}: {
  active: boolean;
  error?: string;
  ingredient: RecipeIngredientDraft;
  lastSearchQuery?: string;
  loading: boolean;
  suggestions: RecipeIngredientSearchSuggestion[];
  onClear: () => void;
  onSelect: (suggestion: RecipeIngredientSearchSuggestion) => void;
}) {
  const canSearch = shouldSearchRecipeIngredientLabel(ingredient.label);
  const searchIsCurrent = lastSearchQuery === ingredient.label.trim();
  const showEmptySearch =
    active && canSearch && searchIsCurrent && !loading && suggestions.length === 0;

  if (ingredient.ciqualName) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-[var(--pc-radius-control)] border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Aliment reconnu
          </p>
          <p className="mt-1 truncate text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]">
            {ingredient.ciqualName}
          </p>
        </div>
        <Button className="min-h-11 rounded-full px-3" variant="tertiary" onClick={onClear}>
          Changer
        </Button>
      </div>
    );
  }

  if (!canSearch && !error) {
    return (
      <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
        Tape au moins 3 lettres pour reconnaître l’aliment, ou garde-le libre.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {loading ? (
        <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
          Recherche des aliments.
        </p>
      ) : null}
      {error ? (
        <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
          {error}
        </p>
      ) : null}
      {active && searchIsCurrent && suggestions.length > 0 ? (
        <div className="space-y-2" aria-label="Aliments reconnus proposés">
          {suggestions.map((suggestion) => (
            <button
              className="pc-focus-ring flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--pc-radius-control)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-3 py-2 text-left shadow-[var(--pc-shadow-level-1)] transition hover:border-[var(--pc-color-primary-muted)] hover:bg-[var(--pc-color-surface-subtle)]"
              key={`${suggestion.ciqualCode}-${suggestion.ciqualName}`}
              type="button"
              onClick={() => onSelect(suggestion)}
            >
              <span className="min-w-0">
                <span className="block truncate text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
                  {suggestion.ciqualName}
                </span>
                {suggestion.groupName ? (
                  <span className="mt-0.5 block truncate text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
                    {suggestion.groupName}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
                Choisir
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {showEmptySearch ? (
        <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
          Aucun aliment reconnu. Il restera libre et ne sera pas compté.
        </p>
      ) : null}
    </div>
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

function createDraftIngredientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ingredient-draft-${crypto.randomUUID()}`;
  }

  return `ingredient-draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRecipeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `recipe-${crypto.randomUUID()}`;
  }

  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function omitRecordKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;

  const next = { ...record };
  delete next[key];
  return next;
}
