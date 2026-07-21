import { describe, expect, it } from "vitest";
import {
  createEmptyMealDraft,
  mealEntryFromDraft,
} from "@/features/meal/mealDraftModel";
import { commitMealDraft } from "@/features/meal/mealJournalModel";

describe("mealJournalModel", () => {
  it("ajoute un dîner sans remplacer le déjeuner du même jour", () => {
    const lunch = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-21", "12:30"),
        kind: "dejeuner",
        freeText: "steak et pâtes",
      },
      null,
    );
    const dinnerDraft = {
      ...createEmptyMealDraft("2026-07-21", "20:15"),
      kind: "diner" as const,
      freeText: "soupe et pain",
    };

    const result = commitMealDraft([lunch], dinnerDraft, null);

    expect(result.wasUpdate).toBe(false);
    expect(result.meals).toHaveLength(2);
    expect(result.meals).toMatchObject([
      { id: lunch.id, kind: "dejeuner", time: "12:30" },
      { kind: "diner", time: "20:15" },
    ]);
    expect(result.meals[1]?.id).not.toBe(lunch.id);
  });

  it("ne transforme pas une création en modification si un ancien id est absent", () => {
    const lunch = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-21", "12:30"),
        kind: "dejeuner",
        freeText: "steak et pâtes",
      },
      null,
    );
    const dinnerDraft = {
      ...createEmptyMealDraft("2026-07-21", "20:15"),
      kind: "diner" as const,
      freeText: "soupe et pain",
    };

    const result = commitMealDraft(
      [lunch],
      dinnerDraft,
      "meal-session-obsolete",
    );

    expect(result.wasUpdate).toBe(false);
    expect(result.meals).toHaveLength(2);
  });

  it("modifie uniquement le repas explicitement ouvert en édition", () => {
    const lunch = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-21", "12:30"),
        kind: "dejeuner",
        freeText: "steak et pâtes",
      },
      null,
    );
    const editedDraft = {
      ...createEmptyMealDraft("2026-07-21", "13:00"),
      kind: "dejeuner" as const,
      freeText: "steak et riz",
    };

    const result = commitMealDraft([lunch], editedDraft, lunch.id);

    expect(result.wasUpdate).toBe(true);
    expect(result.meals).toHaveLength(1);
    expect(result.meals[0]).toMatchObject({
      id: lunch.id,
      createdAt: lunch.createdAt,
      freeText: "steak et riz",
      time: "13:00",
    });
  });
});
