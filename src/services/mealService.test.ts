import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS } from "@/lib/analytics";
import type { MealEntry } from "@/lib/types";
import { buildMealObservationUpsert } from "@/services/mealService";

function createMeal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "meal-1",
    date: "2026-07-16",
    time: "12:45",
    kind: "dejeuner",
    freeText: "steak, pâtes et champignons",
    quantity: "two-plates",
    servingPattern: "once",
    hungerBefore: "yes",
    afterMeal: "too_full",
    fullnessAfter: "too_full",
    stopReason: "rassasie",
    snackingAfter: "non",
    starterTaken: false,
    starterText: null,
    dessertTaken: false,
    dessertText: null,
    snackTrigger: null,
    snackContext: null,
    clarifications: [],
    questionnaireVersion: "v2",
    mealStructure: {
      version: 2,
      source: "meal_tunnel_v2",
      sections: [],
      behavior: {
        hungerBefore: "yes",
        fullnessAfter: "too_full",
        hungerAtReservice: "not_really",
        reserviceReasons: ["pleasure"],
      },
    },
    components: { ...EMPTY_COMPONENTS },
    finding: {
      fact: "Une reprise notée.",
      reading: "Lecture différée.",
      nextAction: "Observer.",
      frictionPoint: "reservice",
      evidenceLevel: "observation unique",
    },
    createdAt: "2026-07-16T10:45:00.000Z",
    ...overrides,
  };
}

describe("meal service serialization", () => {
  it("envoie la structure V2 et sa version dans l'upsert cloud", () => {
    const meal = createMeal();
    const row = buildMealObservationUpsert(
      "user-a",
      meal,
      "2026-07-16T11:00:00.000Z",
    );

    expect(row).toMatchObject({
      user_id: "user-a",
      observed_date: "2026-07-16",
      observed_time: "12:45",
      questionnaire_version: "v2",
      meal_structure: meal.mealStructure,
      updated_at: "2026-07-16T11:00:00.000Z",
    });
  });

  it("écrit explicitement null pour un ancien repas sans structure V2", () => {
    const row = buildMealObservationUpsert(
      "user-a",
      createMeal({ mealStructure: undefined, questionnaireVersion: "legacy" }),
    );

    expect(row.meal_structure).toBeNull();
  });
});
