import { describe, expect, it } from "vitest";
import {
  EMPTY_COMPONENTS,
  buildImmediateFinding,
  calculateWeeklyAnalysis,
  detectMealComponents,
  isSmokingTrackingEnabled,
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
  showActiveMission: true,
  darkMode: false,
  weeklyActivityGoal: 5,
  createdAt: "2026-07-06T08:00:00.000Z",
};

function meal(id: string, overrides: Partial<MealEntry> = {}): MealEntry {
  const servingPattern = overrides.servingPattern ?? "none";
  const quantity = overrides.quantity ?? "reasonable-plate";
  const hungerBefore = overrides.hungerBefore ?? "yes";
  const fullnessAfter = overrides.fullnessAfter ?? "fine";
  const afterMeal = overrides.afterMeal ?? fullnessAfter;
  const stopReason = overrides.stopReason ?? "rassasie";
  const snackingAfter = overrides.snackingAfter ?? "non";
  const kind = overrides.kind ?? "dejeuner";
  const components = overrides.components ?? EMPTY_COMPONENTS;

  return {
    id,
    date: "2026-07-06",
    time: "12:30",
    kind,
    freeText: "repas noté",
    quantity,
    servingPattern,
    hungerBefore,
    afterMeal,
    fullnessAfter,
    stopReason,
    snackingAfter,
    starterTaken: overrides.starterTaken ?? false,
    starterText: overrides.starterText ?? null,
    dessertTaken: overrides.dessertTaken ?? false,
    dessertText: overrides.dessertText ?? null,
    snackTrigger: overrides.snackTrigger ?? null,
    snackContext: overrides.snackContext ?? null,
    clarifications: overrides.clarifications ?? [],
    questionnaireVersion: overrides.questionnaireVersion ?? "v0.7",
    components,
    finding: buildImmediateFinding({
      kind,
      servingPattern,
      hungerBefore,
      fullnessAfter,
      starterTaken: overrides.starterTaken ?? false,
      dessertTaken: overrides.dessertTaken ?? false,
      snackTrigger: overrides.snackTrigger ?? null,
      snackContext: overrides.snackContext ?? null,
      components,
    }),
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
  it("qualifie une observation simple sans surinterprétation", () => {
    const finding = buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "none",
      hungerBefore: "yes",
      fullnessAfter: "fine",
      components: EMPTY_COMPONENTS,
    });

    expect(finding.fact).toBe("Observation ajoutée.");
    expect(finding.reading).toContain("si le même signal se répète");
    expect(finding.evidenceLevel).toBe("observation unique");
  });

  it("détecte pas vraiment faim + dessert + trop plein", () => {
    const finding = buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "none",
      hungerBefore: "not_really",
      fullnessAfter: "too_full",
      dessertTaken: true,
      components: { ...EMPTY_COMPONENTS, dessert: true },
    });

    expect(finding.fact).toContain("pas vraiment faim");
    expect(finding.reading).toContain("écart entre la faim de départ");
  });

  it("détecte la priorité resservice", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { servingPattern: "once" }),
        meal("2", { servingPattern: "once" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("quantity");
    expect(analysis.priority.rationale).toContain("resservice");
  });

  it("détecte la priorité resservice sur plusieurs passages", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { servingPattern: "multiple" }),
        meal("2", { servingPattern: "buffet" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("quantity");
    expect(analysis.priority.rationale).toContain("plusieurs passages");
  });

  it("détecte la priorité faim réelle", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { hungerBefore: "no" }),
        meal("2", { hungerBefore: "not_really" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("real-hunger");
  });

  it("détecte l’inconfort après repas", () => {
    const finding = buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "none",
      hungerBefore: "yes",
      fullnessAfter: "uncomfortable",
      components: EMPTY_COMPONENTS,
    });

    expect(finding.fact).toBe("Tu termines trop plein.");
    expect(finding.frictionPoint).toBe("sensation après repas");
    expect(finding.reading).toContain("volume ou de rythme");
  });

  it("détecte un resservice qui finit trop plein", () => {
    const finding = buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "once",
      hungerBefore: "yes",
      fullnessAfter: "too_full",
      components: EMPTY_COMPONENTS,
    });

    expect(finding.fact).toBe("Tu t’es resservi et tu termines trop plein.");
    expect(finding.nextAction).toContain("10 à 15 minutes");
  });

  it("garde la signature héritée du constat immédiat compatible", () => {
    const finding = buildImmediateFinding(
      "two-plates",
      "vraie-faim",
      "satisfait",
      "oui-important",
      "assiette-vide",
    );

    expect(finding.frictionPoint).toBe("resservice");
    expect(finding.reading).not.toContain("après le repas");
  });

  it("détecte la priorité grignotage depuis le type de repas", () => {
    const analysis = calculateWeeklyAnalysis(
      data([
        meal("1", { kind: "grignotage", snackTrigger: "boredom" }),
        meal("2", { kind: "grignotage", snackTrigger: "stress" }),
        meal("3"),
        meal("4"),
        meal("5"),
      ]),
      "2026-07-10",
    );

    expect(analysis.priority.id).toBe("context");
  });

  it("détecte plusieurs étiquettes simples sur un repas mixte", () => {
    expect(detectMealComponents("Muffin oeuf bacon")).toMatchObject({
      proteins: true,
      starches: true,
      dessert: false,
      ultraProcessed: true,
    });
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

  it("ne considère pas le tabac non renseigné comme un suivi actif", () => {
    expect(
      isSmokingTrackingEnabled(
        data([], {
          profile: {
            ...profile,
            smokingStatus: "non-renseigne",
            smokingGoal: undefined,
          },
        }),
      ),
    ).toBe(false);
  });

  it("conserve l'analyse repas malgré les données stabilisées autour", () => {
    const analysis = calculateWeeklyAnalysis(
      data(
        [
          meal("1", { servingPattern: "multiple" }),
          meal("2", { servingPattern: "buffet" }),
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
    expect(analysis.priority.id).toBe("quantity");
  });
});
