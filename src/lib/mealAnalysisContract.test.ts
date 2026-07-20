import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS } from "@/lib/analytics";
import {
  analyzeMeal,
  analyzeMealWeek,
  type MealAnalysisResult,
} from "@/lib/mealAnalysisContract";
import type {
  FullnessAfter,
  HungerAtReservice,
  HungerBefore,
  MealEntry,
  MealItemV2,
  MealStructureV2,
  ReserviceReason,
} from "@/lib/types";

const stableFinding: MealEntry["finding"] = {
  fact: "Repas noté.",
  reading: "Observation de test.",
  nextAction: "Continuer à observer.",
  frictionPoint: "repère",
  evidenceLevel: "observation unique",
};

function confirmedItem(
  id: string,
  overrides: Partial<MealItemV2> = {},
): MealItemV2 {
  return {
    id,
    rawText: "riz",
    recognitionStatus: "confirmed",
    canonicalName: "Riz blanc, cuit",
    ciqualCode: "9310",
    confidence: 0.92,
    source: "ciqual-2025",
    sourceVersion: "2025",
    quantity: {
      amount: 1,
      unit: "plate",
      text: null,
      confidence: "medium",
    },
    ...overrides,
  };
}

function unrecognizedItem(id: string): MealItemV2 {
  return {
    id,
    rawText: "truc maison",
    recognitionStatus: "unrecognized",
    canonicalName: null,
    ciqualCode: null,
    confidence: null,
    quantity: null,
  };
}

function structure({
  hungerBefore = "yes",
  fullnessAfter = "fine",
  hungerAtReservice = null,
  reserviceReasons = [],
  items = [confirmedItem("item-1")],
}: {
  hungerBefore?: HungerBefore;
  fullnessAfter?: FullnessAfter;
  hungerAtReservice?: HungerAtReservice | null;
  reserviceReasons?: ReserviceReason[];
  items?: MealItemV2[];
} = {}): MealStructureV2 {
  return {
    version: 2,
    source: "meal_tunnel_v2",
    sections: [
      {
        id: "section-main",
        kind: "main",
        rawText: items.map((item) => item.rawText).join(", "),
        quantity: {
          amount: 1,
          unit: "plate",
          text: null,
          confidence: "medium",
        },
        passages: [
          {
            id: "passage-1",
            index: 1,
            relationToPrevious: null,
            relationText: null,
            items,
          },
        ],
      },
    ],
    behavior: {
      hungerBefore,
      fullnessAfter,
      hungerAtReservice,
      reserviceReasons,
    },
  };
}

function meal(
  id: string,
  overrides: Partial<MealEntry> = {},
): MealEntry {
  const date = overrides.date ?? "2026-07-13";
  const time = overrides.time ?? "20:00";
  const servingPattern = overrides.servingPattern ?? "none";
  const hungerBefore = overrides.hungerBefore ?? "yes";
  const fullnessAfter = overrides.fullnessAfter ?? "fine";
  const mealStructure =
    "mealStructure" in overrides
      ? overrides.mealStructure
      : structure({
          hungerBefore,
          fullnessAfter,
          hungerAtReservice:
            servingPattern === "none" ? null : "yes",
          items: [confirmedItem(`item-${id}`)],
        });

  return {
    id,
    date,
    time,
    kind: overrides.kind ?? "diner",
    freeText: overrides.freeText ?? "riz",
    quantity: overrides.quantity ?? "reasonable-plate",
    servingPattern,
    hungerBefore,
    afterMeal: overrides.afterMeal ?? fullnessAfter,
    fullnessAfter,
    stopReason: overrides.stopReason ?? "rassasie",
    snackingAfter: overrides.snackingAfter ?? "non",
    starterTaken: overrides.starterTaken ?? false,
    starterText: overrides.starterText ?? null,
    dessertTaken: overrides.dessertTaken ?? false,
    dessertText: overrides.dessertText ?? null,
    snackTrigger: overrides.snackTrigger ?? null,
    snackContext: overrides.snackContext ?? null,
    clarifications: overrides.clarifications ?? [],
    questionnaireVersion: overrides.questionnaireVersion ?? "v2",
    mealStructure,
    components: overrides.components ?? EMPTY_COMPONENTS,
    finding: overrides.finding ?? stableFinding,
    createdAt: overrides.createdAt ?? `${date}T${time}:00.000Z`,
  };
}

function weekResult(meals: MealEntry[]): MealAnalysisResult {
  return analyzeMealWeek({
    weekStart: "2026-07-13",
    weekEnd: "2026-07-19",
    profileStartDate: "2026-07-01",
    referenceDate: "2026-07-19",
    meals,
  });
}

describe("meal analysis contract", () => {
  it("garde un seul repas au niveau descriptif sans tendance", () => {
    const result = analyzeMeal(meal("single"));

    expect(result.scope).toBe("meal");
    expect(result.status).toBe("descriptive");
    expect(result.hypothesis).toBeNull();
    expect(result.action).toBeNull();
    expect(result.absenceReasons).toContain("single_meal_no_trend");
    expect(result.nutritionDisplayPolicy).toBe("internal_only");
  });

  it("observe pendant les sept premiers jours sans action corrective", () => {
    const result = analyzeMealWeek({
      weekStart: "2026-07-06",
      weekEnd: "2026-07-12",
      profileStartDate: "2026-07-06",
      referenceDate: "2026-07-12",
      meals: Array.from({ length: 7 }, (_, index) =>
        meal(`first-week-${index}`, {
          date: `2026-07-${String(6 + index).padStart(2, "0")}`,
          servingPattern: "once",
          mealStructure: structure({
            hungerAtReservice: "no",
            reserviceReasons: ["food_available"],
            items: [confirmedItem(`first-week-item-${index}`)],
          }),
        }),
      ),
    });

    expect(result.status).toBe("descriptive");
    expect(result.action).toBeNull();
    expect(result.hypothesis).toBeNull();
    expect(result.absenceReasons).toContain("observation_phase");
  });

  it("documente un resservice répété sans faim avec preuves", () => {
    const result = weekResult([
      meal("1", {
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "no",
          reserviceReasons: ["food_available"],
          items: [confirmedItem("item-1")],
        }),
      }),
      meal("2", {
        date: "2026-07-14",
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "not_really",
          reserviceReasons: ["food_available", "pleasure"],
          items: [confirmedItem("item-2")],
        }),
      }),
      meal("3", {
        date: "2026-07-15",
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "no",
          reserviceReasons: ["habit"],
          items: [confirmedItem("item-3")],
        }),
      }),
      meal("4", {
        date: "2026-07-16",
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "yes",
          items: [confirmedItem("item-4")],
        }),
      }),
      meal("5", { date: "2026-07-17" }),
    ]);

    expect(result.status).toBe("experiment");
    expect(result.mainSignal?.id).toBe("repeated_reservice_without_hunger");
    expect(result.hypothesis?.isHypothesis).toBe(true);
    expect(result.evidence[0]).toMatchObject({
      count: 3,
      denominator: 4,
      observationIds: ["1", "2", "3"],
    });
  });

  it("ne signale un rythme variable que si plusieurs jours le prouvent", () => {
    const result = weekResult([
      meal("d1", { time: "18:30" }),
      meal("d2", { date: "2026-07-14", time: "22:15" }),
      meal("d3", { date: "2026-07-15", time: "19:00" }),
      meal("d4", { date: "2026-07-16", time: "23:00" }),
      meal("d5", { date: "2026-07-17", time: "20:30" }),
    ]);

    expect(result.status).toBe("experiment");
    expect(result.mainSignal?.id).toBe("variable_meal_time");
    expect(result.evidence[0]?.axis).toBe("rhythm");
  });

  it("ne fabrique pas de problème sur un repas riche si faim et sensation sont cohérentes", () => {
    const result = analyzeMeal(
      meal("rich-stable", {
        components: {
          ...EMPTY_COMPONENTS,
          fried: true,
          richSauce: true,
        },
      }),
    );

    expect(result.status).toBe("descriptive");
    expect(result.hypothesis).toBeNull();
    expect(result.action).toBeNull();
    expect(result.absenceReasons).toContain(
      "composition_context_without_behavior_signal",
    );
  });

  it("ne masque pas un signal comportemental sous prétexte que le repas est léger", () => {
    const result = weekResult([
      meal("light-1", {
        servingPattern: "once",
        fullnessAfter: "too_full",
        mealStructure: structure({
          fullnessAfter: "too_full",
          hungerAtReservice: "yes",
          items: [confirmedItem("light-item-1")],
        }),
      }),
      meal("light-2", {
        date: "2026-07-14",
        servingPattern: "once",
        fullnessAfter: "uncomfortable",
        mealStructure: structure({
          fullnessAfter: "uncomfortable",
          hungerAtReservice: "yes",
          items: [confirmedItem("light-item-2")],
        }),
      }),
      meal("light-3", {
        date: "2026-07-15",
        servingPattern: "once",
        fullnessAfter: "too_full",
        mealStructure: structure({
          fullnessAfter: "too_full",
          hungerAtReservice: "yes",
          items: [confirmedItem("light-item-3")],
        }),
      }),
      meal("light-4", { date: "2026-07-16" }),
      meal("light-5", { date: "2026-07-17" }),
    ]);

    expect(result.status).toBe("experiment");
    expect(result.mainSignal?.id).toBe("repeated_reservice_discomfort");
    expect(result.mainSignal?.axis).toBe("hunger_satiety");
  });

  it("fonctionne en mode comportement seul sans bruit nutrition_not_estimated", () => {
    const result = analyzeMeal(
      meal("unknown-food", {
        mealStructure: structure({
          items: [
            unrecognizedItem("unknown-item"),
            confirmedItem("unknown-portion", {
              quantity: {
                amount: null,
                unit: "unknown",
                text: null,
                confidence: "not_estimated",
              },
            }),
          ],
        }),
      }),
    );

    expect(result.completeness.unresolvedFoodItems).toBe(1);
    expect(result.completeness.unestimatedFoodItems).toBe(0);
    expect(
      result.facts.find(
        (fact) => fact.id === "internal_nutrition_estimate_context",
      ),
    ).toBeUndefined();
    expect(result.absenceReasons).toContain("food_text_not_recognized");
    expect(result.absenceReasons).not.toContain("nutrition_not_estimated");
  });

  it("signale nutrition_not_estimated seulement quand le contexte nutritionnel est fourni", () => {
    const result = analyzeMeal(
      meal("unknown-food", {
        mealStructure: structure({
          items: [confirmedItem("unknown-portion")],
        }),
      }),
      {
        nutritionContexts: [
          {
            status: "not_estimated",
            itemId: "unknown-portion",
            reason: "incompatible_portion_reference",
          },
        ],
      },
    );

    expect(result.completeness.unestimatedFoodItems).toBe(1);
    expect(result.absenceReasons).toContain("nutrition_not_estimated");
  });

  it("rend les données manquantes explicitement incomplètes", () => {
    const result = analyzeMeal(
      meal("incomplete", {
        freeText: "",
        hungerBefore: "unsure",
        mealStructure: null,
      }),
    );

    expect(result.status).toBe("insufficient_data");
    expect(result.completeness.missingFields).toEqual(
      expect.arrayContaining(["meal_structure", "food_text"]),
    );
    expect(result.completeness.unknownFields).toContain("hunger_before");
    expect(result.absenceReasons).toContain("missing_behavior_data");
  });

  it("propose une action vérifiable uniquement quand une hypothèse hebdomadaire tient", () => {
    const result = weekResult([
      meal("a1", {
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "no",
          reserviceReasons: ["food_available"],
          items: [confirmedItem("a-item-1")],
        }),
      }),
      meal("a2", {
        date: "2026-07-14",
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "no",
          reserviceReasons: ["food_available"],
          items: [confirmedItem("a-item-2")],
        }),
      }),
      meal("a3", {
        date: "2026-07-15",
        servingPattern: "once",
        mealStructure: structure({
          hungerAtReservice: "not_really",
          reserviceReasons: ["habit"],
          items: [confirmedItem("a-item-3")],
        }),
      }),
      meal("a4", { date: "2026-07-16" }),
      meal("a5", { date: "2026-07-17" }),
    ]);

    expect(result.action).toMatchObject({
      reviewAfterDays: 7,
    });
    expect(result.action?.verificationMetric).toContain("semaine suivante");
    expect(result.status).toBe("experiment");
  });
});
