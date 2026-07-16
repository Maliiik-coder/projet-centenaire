import { describe, expect, it } from "vitest";
import {
  buildInitialBehaviorAssessment,
  buildBehaviorHypotheses,
  calculateBmi,
  calculateReferenceGoalWeight,
  classifyAdultBmi,
  getPrimaryFriction,
  legacyFrictionFromAssessment,
  normalizeInitialBehaviorAssessment,
  toggleFrictionSelection,
  toggleExclusiveSelection,
} from "@/lib/onboarding";
import type { InitialBehaviorAnswers } from "@/lib/types";

const quietAnswers: InitialBehaviorAnswers = {
  rhythm: 0,
  hunger: 0,
  satietyControl: 0,
  emotional: 0,
  externalCues: 0,
  habitContext: 0,
  restrictionRebound: 0,
};

describe("sélection des freins pendant l’onboarding", () => {
  it("conserve plusieurs freins concrets", () => {
    const first = toggleFrictionSelection([], "large-portions", true);
    const second = toggleFrictionSelection(
      first,
      "snacking-without-hunger",
      true,
    );

    expect(second).toEqual(["large-portions", "snacking-without-hunger"]);
    expect(getPrimaryFriction(second)).toBe("large-portions");
  });

  it("rend le choix inconnu exclusif", () => {
    expect(
      toggleFrictionSelection(["large-portions"], "unknown", true),
    ).toEqual(["unknown"]);
    expect(
      toggleFrictionSelection(["unknown"], "habit-meals", true),
    ).toEqual(["habit-meals"]);
  });
});

describe("état des lieux IMC", () => {
  it("calcule et arrondit l'IMC à une décimale", () => {
    expect(calculateBmi(150, 180)).toBe(46.3);
    expect(calculateBmi(0, 180)).toBeNull();
  });

  it.each([
    [18.4, "under-reference"],
    [18.5, "reference"],
    [25, "overweight"],
    [30, "obesity-1"],
    [35, "obesity-2"],
    [40, "obesity-3"],
  ] as const)("classe correctement la frontière %s", (bmi, expected) => {
    expect(classifyAdultBmi(bmi)?.id).toBe(expected);
  });

  it("propose le poids le plus proche de la zone de référence", () => {
    expect(calculateReferenceGoalWeight(150, 180)).toBe(80);
    expect(calculateReferenceGoalWeight(50, 180)).toBe(60);
    expect(calculateReferenceGoalWeight(72, 180)).toBe(72);
    expect(calculateReferenceGoalWeight(0, 180)).toBeNull();
  });
});

describe("hypothèses comportementales", () => {
  it("retient au maximum les deux signaux les plus élevés", () => {
    const hypotheses = buildBehaviorHypotheses({
      ...quietAnswers,
      rhythm: 3,
      hunger: 3,
      emotional: 3,
      satietyControl: 2,
    });

    expect(hypotheses).toEqual([
      { axis: "rhythm_hunger", level: 3 },
      { axis: "emotional", level: 3 },
    ]);
  });

  it("ne conclut pas lorsque quatre réponses sont inconnues", () => {
    expect(
      buildBehaviorHypotheses({
        ...quietAnswers,
        rhythm: null,
        hunger: null,
        emotional: null,
        externalCues: null,
        satietyControl: 3,
      }),
    ).toEqual([]);
  });

  it("normalise une ancienne charge utile sans lui inventer de signal", () => {
    const normalized = normalizeInitialBehaviorAssessment({
      version: 1,
      completedAt: "2026-07-16T08:00:00.000Z",
      answers: quietAnswers,
      contexts: ["screen", "invalid"],
      perceivedFrictions: ["unknown"],
    });

    expect(normalized).toMatchObject({
      contexts: ["screen"],
      hypotheses: [],
    });
  });

  it("conserve l’accompagnement professionnel sans modifier les hypothèses", () => {
    const assessment = buildInitialBehaviorAssessment({
      answers: { ...quietAnswers, emotional: 3 },
      completedAt: "2026-07-16T08:00:00.000Z",
      contexts: ["work"],
      perceivedFrictions: ["emotional"],
      professionalSupport: "yes",
    });

    expect(assessment.professionalSupport).toBe("yes");
    expect(assessment.hypotheses).toEqual([
      { axis: "emotional", level: 3 },
    ]);
  });

  it("conserve les choix multiples et rend les réponses neutres exclusives", () => {
    expect(
      toggleExclusiveSelection(
        ["screen"],
        "work",
        true,
        ["unknown", "no-specific-context"],
      ),
    ).toEqual(["screen", "work"]);
    expect(
      toggleExclusiveSelection(
        ["screen", "work"],
        "unknown",
        true,
        ["unknown", "no-specific-context"],
      ),
    ).toEqual(["unknown"]);
  });

  it("maintient la mission historique à partir de l'hypothèse principale", () => {
    expect(
      legacyFrictionFromAssessment({
        version: 1,
        completedAt: "2026-07-16T08:00:00.000Z",
        answers: { ...quietAnswers, emotional: 3 },
        contexts: [],
        perceivedFrictions: [],
        hypotheses: [{ axis: "emotional", level: 3 }],
        evidence: "self-reported",
      }),
    ).toBe("snacking-without-hunger");
  });
});
