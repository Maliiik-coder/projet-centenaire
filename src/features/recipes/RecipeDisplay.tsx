import type { MouseEvent } from "react";
import { Clock3, Heart, UsersRound } from "lucide-react";
import { IconButton, Surface } from "@/components/ui";
import { cx } from "@/components/ui/styles";
import type { Recipe } from "@/features/recipes/recipeTypes";

export function FavoriteButton({
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

export function RecipeMeta({ recipe }: { recipe: Recipe }) {
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

export function RecipeTags({ recipe }: { recipe: Recipe }) {
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

export function RecipeStat({ label, value }: { label: string; value: number }) {
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
