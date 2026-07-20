import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecipeCard } from "@/features/recipes/RecipeCard";
import { recipeCatalog } from "@/features/recipes/recipeCatalog";

describe("RecipeCard", () => {
  it("n'imbrique pas le bouton Favori dans un autre controle interactif", () => {
    const html = renderToStaticMarkup(
      <RecipeCard
        favorite={false}
        recipe={recipeCatalog[0]}
        onFavoriteToggle={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(html).not.toContain('role="button"');
    expect(hasNestedButton(html)).toBe(false);
    expect(html).toContain("Ouvrir la recette");
    expect(html).toContain('aria-label="Ajouter aux favoris"');
  });
});

function hasNestedButton(html: string): boolean {
  const tags = html.match(/<\/?button\b[^>]*>/g) ?? [];
  let depth = 0;

  for (const tag of tags) {
    if (tag.startsWith("</button")) {
      depth = Math.max(0, depth - 1);
    } else {
      if (depth > 0) return true;
      depth += 1;
    }
  }

  return false;
}
