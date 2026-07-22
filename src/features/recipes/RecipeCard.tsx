import { BookOpen } from "lucide-react";
import { Button, Surface } from "@/components/ui";
import { recipeCategoryLabels } from "@/features/recipes/recipeCatalog";
import {
  FavoriteButton,
  RecipeMeta,
  RecipeTags,
} from "@/features/recipes/RecipeDisplay";
import type { Recipe } from "@/features/recipes/recipeTypes";

export function RecipeCard({
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
    <Surface as="article" className="pc-recipe-card p-4" variant="default">
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
        <FavoriteButton favorite={favorite} onClick={() => onFavoriteToggle()} />
      </div>
      <RecipeMeta recipe={recipe} />
      <RecipeTags recipe={recipe} />
      <Button className="mt-4" variant="secondary" fullWidth onClick={onOpen}>
        <BookOpen aria-hidden="true" size={18} />
        Ouvrir la recette
      </Button>
    </Surface>
  );
}
