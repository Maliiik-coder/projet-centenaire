import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import { deleteMealEntry, updateMealEntry } from "@/lib/mealMutations";
import type { MealEntry } from "@/lib/types";

function meal(id: string, freeText = "repas note"): MealEntry {
  const quantity = "reasonable-plate";
  const hungerBefore = "vraie-faim";
  const afterMeal = "satisfait";
  const stopReason = "rassasie";
  const snackingAfter = "non";

  return {
    id,
    date: "2026-07-11",
    time: "12:30",
    kind: "dejeuner",
    freeText,
    quantity,
    hungerBefore,
    afterMeal,
    stopReason,
    snackingAfter,
    components: EMPTY_COMPONENTS,
    finding: buildImmediateFinding(
      quantity,
      hungerBefore,
      afterMeal,
      snackingAfter,
      stopReason,
    ),
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
