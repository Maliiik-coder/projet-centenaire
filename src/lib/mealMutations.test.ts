import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import {
  deleteMealEntry,
  mergeMealsByCreatedAt,
  updateMealEntry,
} from "@/lib/mealMutations";
import type { MealEntry } from "@/lib/types";

function meal(id: string, freeText = "repas note"): MealEntry {
  const quantity = "reasonable-plate";
  const servingPattern = "none";
  const hungerBefore = "yes";
  const fullnessAfter = "fine";
  const afterMeal = fullnessAfter;
  const stopReason = "rassasie";
  const snackingAfter = "non";

  return {
    id,
    date: "2026-07-11",
    time: "12:30",
    kind: "dejeuner",
    freeText,
    quantity,
    servingPattern,
    hungerBefore,
    afterMeal,
    fullnessAfter,
    stopReason,
    snackingAfter,
    starterTaken: false,
    starterText: null,
    dessertTaken: false,
    dessertText: null,
    snackTrigger: null,
    snackContext: null,
    clarifications: [],
    questionnaireVersion: "v0.7",
    components: EMPTY_COMPONENTS,
    finding: buildImmediateFinding({
      kind: "dejeuner",
      servingPattern,
      hungerBefore,
      fullnessAfter,
      components: EMPTY_COMPONENTS,
    }),
    createdAt: `2026-07-11T12:${id.padStart(2, "0")}:00.000Z`,
  };
}

describe("meal mutations", () => {
  it("modifie une observation sans créer de doublon", () => {
    const original = meal("1");
    const updated = { ...original, freeText: "repas modifie" };
    const meals = updateMealEntry([original], original.id, updated);

    expect(meals).toHaveLength(1);
    expect(meals[0]).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      freeText: "repas modifie",
    });
  });

  it("supprime une observation repas", () => {
    const meals = [meal("1"), meal("2")];

    expect(deleteMealEntry(meals, "1").map((entry) => entry.id)).toEqual(["2"]);
  });

  it("importe des repas sans supprimer ceux déjà présents dans le compte", () => {
    const existing = meal("3", "déjà sur le compte");
    const importedA = meal("1", "import A");
    const importedB = meal("2", "import B");

    expect(
      mergeMealsByCreatedAt([existing], [importedA, importedB]).map(
        (entry) => entry.freeText,
      ),
    ).toEqual(["import A", "import B", "déjà sur le compte"]);
  });

  it("remplace un repas importé avec la même clé stable", () => {
    const original = meal("1", "ancienne version");
    const imported = { ...original, freeText: "version importée" };

    expect(mergeMealsByCreatedAt([original], [imported])).toMatchObject([
      { id: original.id, createdAt: original.createdAt, freeText: "version importée" },
    ]);
  });

  it("fusionne Z et +02:00 lorsqu'ils représentent le même instant", () => {
    const original = {
      ...meal("1", "ancienne version"),
      createdAt: "2026-07-14T12:00:00.000Z",
    };
    const imported = {
      ...meal("2", "version importée"),
      createdAt: "2026-07-14T14:00:00.000+02:00",
    };

    expect(mergeMealsByCreatedAt([original], [imported])).toMatchObject([
      {
        id: "2",
        createdAt: "2026-07-14T12:00:00.000Z",
        freeText: "version importée",
      },
    ]);
  });
});
