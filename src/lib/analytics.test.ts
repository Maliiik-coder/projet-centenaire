import { describe, expect, it } from "vitest";
import {
  EMPTY_COMPONENTS,
  buildImmediateFinding,
  calculateWeeklyAnalysis,
} from "@/lib/analytics";
import type { AppData, MealEntry, Profile } from "@/lib/types";

const profile: Profile = {
  firstName: "Test",
  age: 38,
  heightCm: 200,
  startWeightKg: 150,
  goalWeightKg: 100,
  startDate: "2026-07-06",
  initialFriction: "unknown",
  smokingStatus: "tous-les-jours",
  smokingGoal: "observer",
  weeklyActivityGoal: 5,
  createdAt: "2026-07-06T08:00:00.000Z",
};

function meal(id: string, overrides: Partial<MealEntry> = {}): MealEntry {
  const quantity = overrides.quantity ?? "reasonable-plate";
  const hungerBefore = overrides.hungerBefore ?? "vraie-faim";
  const afterMeal = overrides.afterMeal ?? "satisfait";
  const stopReason = overrides.stopReason ?? "rassasie";
  const snackingAfter = overrides.snackingAfter ?? "non";

  return {
    id,
    date: "2026-07-06",
    time: "12:30",
    kind: "dejeuner",
    freeText: "repas noté",
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
    createdAt: `2026-07-06T12:${id.padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

function data(meals: MealEntry[], extra: Partial<AppData> = {}): AppData {
  return {
    profile,
    weights: [],
    meals,
    activities: [],
    smokingEntries: [],
    ...extra,
  };
}

describe("calculateWeeklyAnalysis", () => {
  it("qualifie un repas cohérent sans surinterprétation", () => {
    const finding = buildImmediateFinding(
      "reasonable-plate",
      "vraie-faim",
      "satisfait",
      "non",
      "rassasie",
    );

    expect(finding.fact).toBe("Repas cohérent.");
    expect(finding.reading).toContain("ne signale un excès clair");
    expect(finding.evidenceLevel).toBe("observation unique");
  });

  it("nuance une assiette chargée mais satisfaisante", () => {
    const finding = buildImmediateFinding(
      "loaded-plate",
      "vraie-faim",
      "satisfait",
      "non",
      "rassasie",
    );

    expect(finding.fact).toContain("repas cohérent");
    expect(finding.reading).toContain("ne suffit pas à conclure");
  });

  it("détecte la priorité resservice", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { quantity: "two-plates" }),
        meal("2", { quantity: "two-plates" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("quantity");
    expect(analysis.priority.rationale).toContain("deux assiettes");
  });

  it("détecte la priorité portion initiale sur assiette très chargée", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { quantity: "loaded-plate" }),
        meal("2", { quantity: "loaded-plate" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("initial-portion");
    expect(analysis.priority.rationale).toContain("très chargée");
  });

  it("détecte la priorité faim réelle", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { hungerBefore: "pas-faim" }),
        meal("2", { hungerBefore: "pas-faim" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("real-hunger");
  });

  it("détecte l’inconfort après repas", () => {
    const finding = buildImmediateFinding(
      "loaded-plate",
      "vraie-faim",
      "inconfortable",
      "non",
      "assiette-vide",
    );

    expect(finding.fact).toBe("Une seule assiette, mais poussée trop loin.");
    expect(finding.frictionPoint).toBe("portion initiale");
    expect(finding.reading).toContain("sensation après le repas");
  });

  it("détecte une quantité importante sans faim réelle", () => {
    const finding = buildImmediateFinding(
      "two-plates",
      "pas-faim",
      "satisfait",
      "non",
      "assiette-vide",
    );

    expect(finding.fact).toBe("Repas peu guidé par la faim.");
    expect(finding.nextAction).toContain("attendre 10 minutes");
  });

  it("mentionne obligatoirement le grignotage important", () => {
    const finding = buildImmediateFinding(
      "two-plates",
      "vraie-faim",
      "satisfait",
      "oui-important",
      "assiette-vide",
    );

    expect(finding.fact).toBe("Resservice observé.");
    expect(finding.reading).toContain("grignotage important");
  });

  it("détecte la priorité grignotage", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { snackingAfter: "oui-leger" }),
        meal("2", { snackingAfter: "oui-important" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("context");
  });

  it("renvoie données insuffisantes sous cinq repas", () => {
    const analysis = calculateWeeklyAnalysis(
      data([meal("1"), meal("2"), meal("3"), meal("4")]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("insufficient-data");
    expect(analysis.priority.evidenceLevel).toBe("données insuffisantes");
  });

  it("sépare tabac et alimentation dans la priorité", () => {
    const analysis = calculateWeeklyAnalysis(
      data(
        [meal("1"), meal("2"), meal("3"), meal("4"), meal("5")],
        {
          smokingEntries: [
            {
              id: "smoke-1",
              date: "2026-07-06",
              time: "20:00",
              state: "cigarette",
              createdAt: "2026-07-06T20:00:00.000Z",
            },
            {
              id: "smoke-2",
              date: "2026-07-07",
              time: "20:00",
              state: "cigarette",
              createdAt: "2026-07-07T20:00:00.000Z",
            },
          ],
        },
      ),
      "2026-07-10",
    );

    expect(analysis.smokingEntries).toBe(2);
    expect(analysis.priority.id).toBe("maintenance");
    expect(analysis.priority.domain).toBe("observation");
  });

  it("compte les jours sans tabac explicites par date unique", () => {
    const analysis = calculateWeeklyAnalysis(
      data([], {
        smokingEntries: [
          {
            id: "none-1",
            date: "2026-07-06",
            time: "08:00",
            state: "aucun",
            createdAt: "2026-07-06T08:00:00.000Z",
          },
          {
            id: "none-2",
            date: "2026-07-06",
            time: "21:00",
            state: "aucun",
            createdAt: "2026-07-06T21:00:00.000Z",
          },
          {
            id: "none-3",
            date: "2026-07-07",
            time: "21:00",
            state: "aucun",
            createdAt: "2026-07-07T21:00:00.000Z",
          },
        ],
      }),
      "2026-07-10",
    );

    expect(analysis.smokeFreeDays).toBe(2);
  });

  it("ne compte pas une absence de donnée tabac comme aucun", () => {
    const analysis = calculateWeeklyAnalysis(data([], { smokingEntries: [] }), "2026-07-10");

    expect(analysis.smokingEntries).toBe(0);
    expect(analysis.smokeFreeDays).toBe(0);
  });

  it("conserve l'analyse repas malgré les données stabilisées autour", () => {
    const analysis = calculateWeeklyAnalysis(
      data(
        [
          meal("1", { quantity: "loaded-plate" }),
          meal("2", { quantity: "loaded-plate" }),
          meal("3"),
          meal("4"),
          meal("5"),
        ],
        {
          weights: [
            {
              id: "weight-1",
              date: "2026-07-06",
              time: "08:00",
              weightKg: 150,
              createdAt: "2026-07-06T08:00:00.000Z",
            },
            {
              id: "weight-2",
              date: "2026-07-06",
              time: "09:00",
              weightKg: 149,
              createdAt: "2026-07-06T09:00:00.000Z",
            },
          ],
        },
      ),
      "2026-07-10",
    );

    expect(analysis.mealCount).toBe(5);
    expect(analysis.priority.id).toBe("initial-portion");
  });
});
