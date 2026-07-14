import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import { deleteMealEntry, updateMealEntry } from "@/lib/mealMutations";
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
});
