import { describe, expect, it } from "vitest";
import { normalizeData } from "@/lib/storage";

describe("storage normalization", () => {
  it("mappe une ancienne observation repas vers les champs V0.7", () => {
    const data = normalizeData({
      profile: null,
      weights: [],
      activities: [],
      smokingEntries: [],
      meals: [
        {
          id: "meal-1",
          date: "2026-07-14",
          time: "12:30",
          kind: "collation",
          freeText: "sandwich",
          quantity: "two-plates",
          hungerBefore: "pas-faim",
          afterMeal: "trop-plein",
          stopReason: "assiette-vide",
          snackingAfter: "non",
          createdAt: "2026-07-14T12:30:00.000Z",
        },
      ],
    });

    expect(data.meals[0]).toMatchObject({
      kind: "grignotage",
      servingPattern: "once",
      fullnessAfter: "too_full",
      questionnaireVersion: "legacy",
    });
  });
});
