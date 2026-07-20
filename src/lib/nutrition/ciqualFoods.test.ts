import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CIQUAL_2025_INDEX_METADATA,
  searchCiqualFoods,
} from "@/lib/nutrition/ciqualFoods";
import {
  CIQUAL_2025_NUTRIENT_METADATA,
  getCiqualFoodReference,
} from "@/lib/nutrition/ciqualFoodNutrients";
import ciqualIndexArtifact from "@/lib/nutrition/generated/ciqual-2025-index.json";
import ciqualNutrientsArtifact from "@/lib/nutrition/generated/ciqual-2025-nutrients.json";

interface CiqualIndexTestArtifact {
  fields: string[];
  foods: Array<
    [
      code: string,
      name: string,
      groupName: string | null,
      subGroupName: string | null,
      subSubGroupName: string | null,
      normalizedName: string,
    ]
  >;
}

interface CiqualNutrientTestArtifact {
  foods: Array<{
    code: string;
    nutrientsPer100g: Record<
      string,
      { value: number | null; qualifier: "exact" | "less_than" | "unknown" }
    >;
  }>;
}

const ciqualIndex = ciqualIndexArtifact as unknown as CiqualIndexTestArtifact;
const ciqualNutrients = ciqualNutrientsArtifact as CiqualNutrientTestArtifact;
const indexArtifactPath = join(
  process.cwd(),
  "src/lib/nutrition/generated/ciqual-2025-index.json",
);
const nutrientArtifactPath = join(
  process.cwd(),
  "src/lib/nutrition/generated/ciqual-2025-nutrients.json",
);

describe("ciqualFoods", () => {
  it("charge l’index officiel avec métadonnées et codes uniques", () => {
    const codes = new Set(ciqualIndex.foods.map((food) => food[0]));

    expect(CIQUAL_2025_INDEX_METADATA).toMatchObject({
      id: "ciqual-2025",
      sourceVersion: "2025",
      datasetDoi: "10.57745/RDMHWY",
      license: "Etalab Open License 2.0",
      foodCount: 3484,
      nutrientCount: 74,
    });
    expect(CIQUAL_2025_INDEX_METADATA.importDate).toBe(
      CIQUAL_2025_INDEX_METADATA.sourceFileDate,
    );
    expect(CIQUAL_2025_INDEX_METADATA.sourceFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "alim_2025_11_03.xml",
          md5: "8e1171d63cee4b6010cfce25dd29243d",
        }),
        expect.objectContaining({
          name: "compo_2025_11_03.xml",
          md5: "2da725585946434df320d8041631998b",
        }),
      ]),
    );
    expect(ciqualIndex.fields).toEqual([
      "code",
      "name",
      "groupName",
      "subGroupName",
      "subSubGroupName",
      "normalizedName",
    ]);
    expect(ciqualIndex.foods).toHaveLength(3484);
    expect(codes.size).toBe(ciqualIndex.foods.length);
  });

  it("garde l’index client sans nutriments détaillés", () => {
    const rawIndex = readFileSync(indexArtifactPath, "utf8");

    expect(rawIndex).not.toContain("nutrientsPer100g");
    expect(rawIndex).not.toContain("energyKcal");
    expect(rawIndex).not.toContain("sodiumMg");
    expect(rawIndex).toContain('"fields":["code","name"');
  });

  it("préserve les valeurs inconnues et les valeurs inférieures à un seuil", () => {
    expect(CIQUAL_2025_NUTRIENT_METADATA.importDate).toBe(
      CIQUAL_2025_NUTRIENT_METADATA.sourceFileDate,
    );

    const nutrientValues = ciqualNutrients.foods.flatMap((food) =>
      Object.values(food.nutrientsPer100g),
    );

    expect(nutrientValues).toContainEqual({
      value: null,
      qualifier: "unknown",
    });
    expect(
      nutrientValues.some((value) => value.qualifier === "less_than"),
    ).toBe(true);
  });

  it("recherche riz, accents, casse et pluriel sans code inventé", () => {
    const rice = searchCiqualFoods("riz");
    const pasta = searchCiqualFoods("PÂTES");

    expect(rice).toHaveLength(4);
    expect(rice[0]?.ciqualCode).toMatch(/^\d+$/);
    expect(rice[0]?.canonicalName.toLowerCase()).toContain("riz");
    expect(pasta[0]?.canonicalName.toLowerCase()).toContain("pâte");
    expect(pasta[0]?.source).toBe("ciqual-2025");
    expect(pasta[0]?.sourceVersion).toBe("2025");
  });

  it("tolère des fautes raisonnables sans alias spécial par faute", () => {
    const steakTypo = searchCiqualFoods("staik");
    const steakMissingLetter = searchCiqualFoods("stek");

    expect(steakTypo[0]?.canonicalName.toLowerCase()).toContain("steak");
    expect(steakMissingLetter[0]?.canonicalName.toLowerCase()).toContain(
      "steak",
    );
  });

  it("marque les recherches concurrentes comme ambiguës plutôt que confirmées", () => {
    const steak = searchCiqualFoods("steak");

    expect(steak.length).toBeGreaterThan(1);
    expect(steak[0]?.matchStatus).toBe("ambiguous");
  });

  it("ne retourne rien quand aucun résultat n’est suffisamment fiable", () => {
    expect(searchCiqualFoods("zzzzzzzz")).toEqual([]);
  });

  it("retrouve une référence nutritionnelle locale hors ligne par code Ciqual", () => {
    const [rice] = searchCiqualFoods("riz");
    const reference = getCiqualFoodReference(rice?.ciqualCode);

    expect(reference).toMatchObject({
      source: "ciqual-2025",
      sourceVersion: "2025",
      ciqualCode: rice?.ciqualCode,
      name: rice?.canonicalName,
    });
    expect(reference?.nutrientsPer100g.energyKcal).toHaveProperty("qualifier");
  });

  it("génère une date d’import déterministe sauf paramètre explicite", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/import-ciqual-2025.mjs"),
      "utf8",
    );

    expect(script).not.toMatch(/new Date\(/);
    expect(script).not.toMatch(/Date\.now\(/);
    expect(script).not.toMatch(/toISOString\(/);
    expect(script).toContain(
      'const IMPORT_DATE = getArg("--import-date") ?? SOURCE.sourceFileDate;',
    );
  });

  it("documente la régénération et les checksums générés", () => {
    const docs = readFileSync(
      join(process.cwd(), "docs/CIQUAL_INTEGRATION.md"),
      "utf8",
    );
    const indexChecksum = sha256(readFileSync(indexArtifactPath));
    const nutrientChecksum = sha256(readFileSync(nutrientArtifactPath));

    expect(docs).toContain("npm run import:ciqual");
    expect(docs).toContain(indexChecksum);
    expect(docs).toContain(nutrientChecksum);
    for (const sourceFile of CIQUAL_2025_INDEX_METADATA.sourceFiles) {
      expect(docs).toContain(sourceFile.name);
      expect(docs).toContain(sourceFile.md5);
    }
  });
});

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
