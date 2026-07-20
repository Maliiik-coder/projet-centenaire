import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const forbiddenInitialRecipeModules = [
  "src/lib/nutrition/ciqualFoods.ts",
  "src/lib/nutrition/generated/ciqual-2025-index.json",
  "src/lib/nutrition/ciqualFoodNutrients.ts",
  "src/lib/nutrition/generated/ciqual-2025-nutrients.json",
];

describe("recipeBundlePolicy", () => {
  it("garde les nutriments CIQUAL détaillés hors du graphe statique initial de Recettes", () => {
    const runtimeFiles = collectRuntimeLocalDependencies(
      "src/features/recipes/RecipesApp.tsx",
    );

    for (const modulePath of forbiddenInitialRecipeModules) {
      expect(runtimeFiles.has(modulePath), modulePath).toBe(false);
    }
  });

  it("charge les nutriments CIQUAL uniquement depuis la fiche recette", () => {
    const detailSource = readFileSync(
      join(process.cwd(), "src/features/recipes/RecipeDetailView.tsx"),
      "utf8",
    );
    const calculationSource = readFileSync(
      join(process.cwd(), "src/features/recipes/recipeNutrition.ts"),
      "utf8",
    );

    expect(detailSource).toContain(
      'import("@/lib/nutrition/ciqualFoodNutrients")',
    );
    expect(calculationSource).not.toContain("ciqualFoodNutrients");
  });

  it("charge la recherche CIQUAL uniquement quand le formulaire en a besoin", () => {
    const formSource = readFileSync(
      join(process.cwd(), "src/features/recipes/RecipeFormView.tsx"),
      "utf8",
    );

    expect(formSource).toContain('import("@/lib/nutrition/ciqualFoods")');
    expect(formSource).not.toMatch(
      /import\s+(type\s+)?[\s\S]*?\sfrom\s+["']@\/lib\/nutrition\/ciqualFoods["']/,
    );
  });
});

function collectRuntimeLocalDependencies(
  entry: string,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);

  const content = readFileSync(join(process.cwd(), entry), "utf8");
  for (const specifier of runtimeImportSpecifiers(content)) {
    const resolved = resolveLocalModule(specifier, entry);
    if (resolved) collectRuntimeLocalDependencies(resolved, seen);
  }

  return seen;
}

function runtimeImportSpecifiers(content: string): string[] {
  return Array.from(
    content.matchAll(/import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g),
  )
    .filter((match) => match[1] !== "type ")
    .map((match) => match[2]);
}

function resolveLocalModule(specifier: string, importer: string): string | null {
  if (specifier.startsWith("@/")) {
    return resolveModulePath(specifier.replace("@/", "src/"));
  }

  if (specifier.startsWith(".")) {
    const importerParts = importer.split("/");
    importerParts.pop();
    return resolveModulePath(join(importerParts.join("/"), specifier));
  }

  return null;
}

function resolveModulePath(basePath: string): string | null {
  const normalizedBasePath = basePath.replaceAll("\\", "/");
  const candidates = [
    normalizedBasePath,
    `${normalizedBasePath}.ts`,
    `${normalizedBasePath}.tsx`,
    `${normalizedBasePath}.json`,
    `${normalizedBasePath}/index.ts`,
    `${normalizedBasePath}/index.tsx`,
  ];

  return (
    candidates.find((candidate) =>
      isFile(join(process.cwd(), candidate)),
    ) ?? null
  );
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}
