import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS } from "@/lib/analytics";
import { createEmptyData } from "@/lib/storage";
import type { MealEntry } from "@/lib/types";
import {
  buildJournalDayEvents,
  buildJournalDayReflection,
  journalMealDetailLines,
  type JournalDayEvent,
} from "@/features/journal/journalModel";

function meal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "meal-1",
    date: "2026-07-16",
    time: "12:30",
    kind: "dejeuner",
    freeText: "riz et poulet",
    quantity: "reasonable-plate",
    servingPattern: "none",
    hungerBefore: "yes",
    afterMeal: "fine",
    fullnessAfter: "fine",
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
    components: { ...EMPTY_COMPONENTS },
    finding: {
      fact: "Repas stable noté.",
      reading: "Rien d’évident à corriger.",
      nextAction: "Observer.",
      frictionPoint: "repère",
      evidenceLevel: "observation unique",
    },
    createdAt: "2026-07-16T10:30:00.000Z",
    ...overrides,
  };
}

function mealEvent(entry: MealEntry): JournalDayEvent {
  return {
    createdAt: entry.createdAt,
    id: entry.id,
    kind: "meal",
    meal: entry,
    time: entry.time,
  };
}

describe("journal model", () => {
  it("trie les événements d'une journée par heure", () => {
    const data = {
      ...createEmptyData(),
      meals: [meal({ time: "20:00" })],
      weights: [
        {
          id: "weight-1",
          date: "2026-07-16",
          time: "08:00",
          weightKg: 149,
          createdAt: "2026-07-16T06:00:00.000Z",
        },
      ],
    };

    expect(buildJournalDayEvents(data, "2026-07-16").map((event) => event.kind)).toEqual([
      "weight",
      "meal",
    ]);
  });

  it("relie factuellement resservice et trop plein", () => {
    const reflection = buildJournalDayReflection([
      mealEvent(
        meal({
          quantity: "two-plates",
          servingPattern: "once",
          afterMeal: "too_full",
          fullnessAfter: "too_full",
        }),
      ),
    ]);

    expect(reflection.facts).toEqual(["1 repas noté"]);
    expect(reflection.reading).toContain("resservice");
    expect(reflection.reading).toContain("trop plein");
  });

  it("affiche entrée et dessert sans réintroduire les portions", () => {
    const lines = journalMealDetailLines(
      meal({
        starterTaken: true,
        starterText: "tomates",
        dessertTaken: true,
        dessertText: "yaourt",
      }),
    );

    expect(lines).toEqual(["Entrée · tomates", "Dessert · yaourt"]);
    expect(lines.join(" ")).not.toContain("portion");
  });
});
