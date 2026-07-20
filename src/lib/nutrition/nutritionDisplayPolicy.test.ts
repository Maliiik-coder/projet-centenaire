import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dailyMealUiFiles = [
  "src/features/today/todayViewModel.ts",
  "src/features/today/TodayTimeline.tsx",
  "src/features/meal/MealTunnelScreen.tsx",
  "src/features/meal/MealTunnelControls.tsx",
  "src/features/journal/JournalScreen.tsx",
  "src/features/journal/journalModel.ts",
];

const nutritionDetailModules = [
  "src/lib/nutrition/ciqualFoodNutrients.ts",
  "src/lib/nutrition/mealNutritionContext.ts",
  "src/lib/nutrition/nutritionEstimate.ts",
  "src/lib/nutrition/generated/ciqual-2025-nutrients.json",
];

describe("nutritionDisplayPolicy", () => {
  it("n’affiche pas de calories, macros ou valeurs nutritionnelles dans le tunnel et le carnet", () => {
    const forbiddenVisibleTerms = [
      /\bkcal\b/i,
      /calorie/i,
      /protéine/i,
      /proteine/i,
      /glucide/i,
      /lipide/i,
      /macro/i,
    ];

    for (const file of dailyMealUiFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf8");
      for (const term of forbiddenVisibleTerms) {
        expect(content, `${file} contains ${term}`).not.toMatch(term);
      }
    }
  });

  it("garde l’autocomplete client hors nutriments détaillés", () => {
    const runtimeFiles = collectRuntimeLocalDependencies(
      "src/lib/nutrition/autocompleteFood.ts",
    );

    for (const modulePath of nutritionDetailModules) {
      expect(runtimeFiles.has(modulePath), modulePath).toBe(false);
    }
  });

  it("garde Aujourd’hui et Carnet hors modules d’estimation nutritionnelle", () => {
    const surfaceEntries = [
      "src/features/today/TodayTimeline.tsx",
      "src/features/today/todayViewModel.ts",
      "src/features/journal/JournalScreen.tsx",
      "src/features/journal/journalModel.ts",
    ];
    const runtimeFiles = new Set<string>();

    for (const entry of surfaceEntries) {
      for (const file of collectRuntimeLocalDependencies(entry)) {
        runtimeFiles.add(file);
      }
    }

    for (const modulePath of nutritionDetailModules) {
      expect(runtimeFiles.has(modulePath), modulePath).toBe(false);
    }
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
