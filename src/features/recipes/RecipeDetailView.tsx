import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ChefHat, Minus, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Surface } from "@/components/ui";
import { recipeCategoryLabels } from "@/features/recipes/recipeCatalog";
import {
  RecipeMeta,
  RecipeTags,
} from "@/features/recipes/RecipeDisplay";
import {
  calculateRecipeNutrition,
  normalizeServings,
  recipeNutritionNutrientKeys,
  scaleRecipeIngredients,
  type RecipeNutritionNutrientKey,
  type RecipeNutritionResult,
} from "@/features/recipes/recipeNutrition";
import type { CiqualFoodReference } from "@/lib/nutrition/foodReference";
import type { Recipe } from "@/features/recipes/recipeTypes";

const recipeNutritionLabels: Record<
  RecipeNutritionNutrientKey,
  { label: string; unit: string }
> = {
  carbohydratesG: { label: "Glucides", unit: "g" },
  energyKcal: { label: "Énergie", unit: "kcal" },
  fatG: { label: "Lipides", unit: "g" },
  fiberG: { label: "Fibres", unit: "g" },
  proteinsG: { label: "Protéines", unit: "g" },
  saltG: { label: "Sel", unit: "g" },
};

export type RecipeDetailViewProps = {
  notice: string | null;
  recipe: Recipe;
  onDelete: () => void;
  onEdit: () => void;
};

export function RecipeDetailView({
  notice,
  recipe,
  onDelete,
  onEdit,
}: RecipeDetailViewProps) {
  const [displayServings, setDisplayServings] = useState(recipe.servings);
  const [foodReferenceLookup, setFoodReferenceLookup] = useState<null | ((
    ciqualCode: string,
  ) => CiqualFoodReference | null)>(null);
  const scaledIngredients = useMemo(
    () => scaleRecipeIngredients({ displayServings, recipe }),
    [displayServings, recipe],
  );
  const nutrition = useMemo(
    () =>
      calculateRecipeNutrition({
        displayServings,
        getFoodReference: foodReferenceLookup ?? undefined,
        recipe,
      }),
    [displayServings, foodReferenceLookup, recipe],
  );

  useEffect(() => {
    let cancelled = false;

    void import("@/lib/nutrition/ciqualFoodNutrients").then((module) => {
      if (!cancelled) {
        setFoodReferenceLookup(() => module.getCiqualFoodReference);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
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

        <ServingSelector
          sourceServings={recipe.servings}
          value={displayServings}
          onChange={setDisplayServings}
        />

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
            {scaledIngredients.map((ingredient) => (
              <li
                className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-3 py-2 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]"
                key={ingredient.id}
              >
                {ingredient.displayText}
              </li>
            ))}
          </ul>
        </RecipeSection>

        <RecipeNutritionPanel
          loading={foodReferenceLookup === null}
          nutrition={nutrition}
        />

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

function ServingSelector({
  sourceServings,
  value,
  onChange,
}: {
  sourceServings: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const selected = normalizeServings(value, sourceServings);

  return (
    <Surface className="space-y-3 p-4" variant="subtle">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[length:var(--pc-font-size-section-title)] leading-6 font-semibold text-[var(--pc-color-text)]">
            Parts à préparer
          </p>
          <p className="mt-1 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
            Recette source : {sourceServings} {sourceServings > 1 ? "parts" : "part"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            className="rounded-full"
            disabled={selected <= 1}
            label="Réduire le nombre de parts"
            size="compact"
            onClick={() => onChange(Math.max(1, selected - 1))}
          >
            <Minus aria-hidden="true" size={20} />
          </IconButton>
          <span className="min-w-12 text-center text-2xl leading-8 font-bold tabular-nums text-[var(--pc-color-text)]">
            {selected}
          </span>
          <IconButton
            className="rounded-full"
            disabled={selected >= 12}
            label="Augmenter le nombre de parts"
            size="compact"
            onClick={() => onChange(Math.min(12, selected + 1))}
          >
            <Plus aria-hidden="true" size={20} />
          </IconButton>
        </div>
      </div>
    </Surface>
  );
}

function RecipeNutritionPanel({
  loading,
  nutrition,
}: {
  loading: boolean;
  nutrition: RecipeNutritionResult;
}) {
  const visibleNutrients = recipeNutritionNutrientKeys
    .map((key) => ({ key, nutrient: nutrition.nutrients[key] }))
    .filter((item): item is {
      key: RecipeNutritionNutrientKey;
      nutrient: NonNullable<RecipeNutritionResult["nutrients"][RecipeNutritionNutrientKey]>;
    } => Boolean(item.nutrient));

  return (
    <RecipeSection icon={<ChefHat size={19} />} title="Par part">
      <Surface className="space-y-4 p-4" variant="subtle">
        {loading ? (
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
            Calcul nutritionnel en cours.
          </p>
        ) : visibleNutrients.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {visibleNutrients.map(({ key, nutrient }) => (
              <div
                className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface)] px-3 py-2"
                key={key}
              >
                <p className="text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
                  {recipeNutritionLabels[key].label}
                </p>
                <p className="mt-1 text-lg leading-6 font-bold tabular-nums text-[var(--pc-color-text)]">
                  {nutrient.perServing.qualifier === "less_than" ? "< " : ""}
                  {formatNutritionNumber(nutrient.perServing.value)}{" "}
                  {recipeNutritionLabels[key].unit}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
            Nutrition non calculable avec les données actuelles.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
            {nutrition.status === "complete"
              ? "Estimation complète pour les ingrédients renseignés."
              : nutrition.status === "partial"
                ? "Estimation incomplète."
                : "Estimation indisponible."}
          </p>
          {nutrition.excludedIngredients.length > 0 ? (
            <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
              Non compté :{" "}
              {nutrition.excludedIngredients
                .map((ingredient) =>
                  `${ingredient.label} (${nutritionExclusionLabel(ingredient.reason)})`,
                )
                .join(", ")}
              .
            </p>
          ) : null}
        </div>
      </Surface>
    </RecipeSection>
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

function nutritionExclusionLabel(
  reason: RecipeNutritionResult["excludedIngredients"][number]["reason"],
): string {
  if (reason === "legacy_text") return "ancien texte libre";
  if (reason === "missing_ciqual_code") return "code CIQUAL manquant";
  if (reason === "unknown_ciqual_code") return "code CIQUAL introuvable";
  return "masse en grammes manquante";
}

function formatNutritionNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  }).format(value);
}
