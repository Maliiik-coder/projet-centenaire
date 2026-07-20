import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeFoodSegment,
  appendFoodInputText,
  removeActiveFoodSegment,
  searchFoodAutocomplete,
} from "@/lib/nutrition/autocompleteFood";

describe("autocompleteFood", () => {
  it("propose Riz quand l’utilisateur tape riz", () => {
    expect(searchFoodAutocomplete("riz")[0]).toMatchObject({
      source: "ciqual-2025",
      sourceVersion: "2025",
    });
    expect(searchFoodAutocomplete("riz")[0]?.label.toLowerCase()).toContain(
      "riz",
    );
    expect(searchFoodAutocomplete("riz")[0]?.ciqualCode).toMatch(/^\d+$/);
  });

  it("tolère les variantes simples avec un vrai candidat Ciqual", () => {
    const [suggestion] = searchFoodAutocomplete("staik");

    expect(suggestion?.label.toLowerCase()).toContain("steak");
    expect(suggestion?.ciqualCode).toMatch(/^\d+$/);
    expect(suggestion?.source).toBe("ciqual-2025");
  });

  it("cherche sur le segment actif du texte libre", () => {
    expect(activeFoodSegment("riz, poulet")).toEqual({
      raw: "poulet",
      start: 5,
      end: 11,
    });
    expect(
      searchFoodAutocomplete("riz, poulet")[0]?.label.toLowerCase(),
    ).toContain("poulet");
  });

  it("continue de proposer un aliment déjà confirmé pour permettre x2", () => {
    expect(searchFoodAutocomplete("riz", 1)).toHaveLength(1);
    expect(searchFoodAutocomplete("riz", 1)[0]?.ciqualCode).toMatch(/^\d+$/);
  });

  it("retire uniquement le segment actif de la saisie libre", () => {
    expect(removeActiveFoodSegment("steak")).toBe("");
    expect(removeActiveFoodSegment("sauce maison, steak")).toBe(
      "sauce maison",
    );
    expect(removeActiveFoodSegment("riz ;  staik")).toBe("riz");
  });

  it("restaure un texte alimentaire sans abîmer la ponctuation", () => {
    expect(appendFoodInputText("", "steak")).toBe("steak");
    expect(appendFoodInputText("sauce maison", "steak")).toBe(
      "sauce maison, steak",
    );
  });

  it("garde le chemin client autocomplete hors nutriments détaillés", () => {
    const runtimeFiles = collectRuntimeLocalDependencies(
      "src/lib/nutrition/autocompleteFood.ts",
    );

    expect(Array.from(runtimeFiles).sort()).not.toContain(
      "src/lib/nutrition/ciqualFoodNutrients.ts",
    );
    expect(
      Array.from(runtimeFiles).some((file) =>
        file.endsWith("ciqual-2025-nutrients.json"),
      ),
    ).toBe(false);
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
    const resolved = resolveLocalModule(specifier);
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

function resolveLocalModule(specifier: string): string | null {
  if (!specifier.startsWith("@/")) return null;

  const basePath = specifier.replace("@/", "src/");
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.json`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
  ];

  return (
    candidates.find((candidate) =>
      existsSync(join(process.cwd(), candidate)),
    ) ?? null
  );
}
