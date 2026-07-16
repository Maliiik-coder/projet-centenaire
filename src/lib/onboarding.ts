import type {
  BehaviorContext,
  BehavioralAxis,
  BehaviorFrequency,
  BehaviorHypothesis,
  FrictionChoice,
  InitialBehaviorAnswers,
  InitialBehaviorAssessment,
  PerceivedFriction,
  ProfessionalSupportStatus,
} from "@/lib/types";

export type BmiClassificationId =
  | "under-reference"
  | "reference"
  | "overweight"
  | "obesity-1"
  | "obesity-2"
  | "obesity-3";

export type BmiClassification = {
  id: BmiClassificationId;
  medicalLabel: string;
  visibleLabel: string;
};

const BEHAVIOR_AXIS_PRIORITY: BehavioralAxis[] = [
  "rhythm_hunger",
  "satiety_control",
  "habit_context",
  "external_cues",
  "emotional",
  "restriction_rebound",
];

const BEHAVIOR_CONTEXTS: BehaviorContext[] = [
  "evening-night",
  "screen",
  "work",
  "car-travel",
  "hotel",
  "restaurant-social",
  "alone-home",
  "no-specific-context",
  "unknown",
];

const PERCEIVED_FRICTIONS: PerceivedFriction[] = [
  "large-portions",
  "snacking-without-hunger",
  "habit-meals",
  "irregularity",
  "emotional",
  "stopping",
  "unknown",
];

const PROFESSIONAL_SUPPORT_STATUSES: ProfessionalSupportStatus[] = [
  "yes",
  "no",
  "prefer-not-to-say",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBehaviorFrequency(value: unknown): BehaviorFrequency {
  return value === 0 || value === 1 || value === 2 || value === 3
    ? value
    : null;
}

function normalizeStringUnion<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is T =>
        typeof item === "string" && allowed.includes(item as T),
      ))]
    : [];
}

export function calculateBmi(
  weightKg: number,
  heightCm: number,
): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) {
    return null;
  }
  if (weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  return Math.round((weightKg / heightMeters ** 2) * 10) / 10;
}

export function classifyAdultBmi(bmi: number): BmiClassification | null {
  if (!Number.isFinite(bmi) || bmi <= 0) {
    return null;
  }
  if (bmi < 18.5) {
    return {
      id: "under-reference",
      medicalLabel: "Insuffisance pondérale",
      visibleLabel: "en dessous de la zone de référence",
    };
  }
  if (bmi < 25) {
    return {
      id: "reference",
      medicalLabel: "Corpulence de référence",
      visibleLabel: "dans la zone de référence",
    };
  }
  if (bmi < 30) {
    return {
      id: "overweight",
      medicalLabel: "Surpoids",
      visibleLabel: "dans la zone du surpoids",
    };
  }
  if (bmi < 35) {
    return {
      id: "obesity-1",
      medicalLabel: "Obésité de classe I",
      visibleLabel: "dans la zone de l'obésité",
    };
  }
  if (bmi < 40) {
    return {
      id: "obesity-2",
      medicalLabel: "Obésité de classe II",
      visibleLabel: "dans la zone de l'obésité",
    };
  }
  return {
    id: "obesity-3",
    medicalLabel: "Obésité de classe III",
    visibleLabel: "dans la zone de l'obésité",
  };
}

function hypothesisLevel(score: number): 2 | 3 {
  return score >= 2.5 ? 3 : 2;
}

export function buildBehaviorHypotheses(
  answers: InitialBehaviorAnswers,
): BehaviorHypothesis[] {
  const answerValues = Object.values(answers);
  if (answerValues.filter((value) => value === null).length >= 4) {
    return [];
  }

  const rhythmValues = [answers.rhythm, answers.hunger].filter(
    (value): value is Exclude<BehaviorFrequency, null> => value !== null,
  );
  const scores = new Map<BehavioralAxis, number>();

  if (rhythmValues.length > 0) {
    scores.set(
      "rhythm_hunger",
      rhythmValues.reduce<number>((sum, value) => sum + value, 0) /
        rhythmValues.length,
    );
  }
  if (answers.satietyControl !== null) {
    scores.set("satiety_control", answers.satietyControl);
  }
  if (answers.emotional !== null) {
    scores.set("emotional", answers.emotional);
  }
  if (answers.externalCues !== null) {
    scores.set("external_cues", answers.externalCues);
  }
  if (answers.habitContext !== null) {
    scores.set("habit_context", answers.habitContext);
  }
  if (answers.restrictionRebound !== null) {
    scores.set("restriction_rebound", answers.restrictionRebound);
  }

  return [...scores.entries()]
    .filter(([, score]) => score >= 2)
    .sort(([axisA, scoreA], [axisB, scoreB]) => {
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (
        BEHAVIOR_AXIS_PRIORITY.indexOf(axisA) -
        BEHAVIOR_AXIS_PRIORITY.indexOf(axisB)
      );
    })
    .slice(0, 2)
    .map(([axis, score]) => ({ axis, level: hypothesisLevel(score) }));
}

export function buildInitialBehaviorAssessment({
  answers,
  completedAt,
  contexts,
  perceivedFrictions,
  professionalSupport,
}: {
  answers: InitialBehaviorAnswers;
  completedAt: string;
  contexts: BehaviorContext[];
  perceivedFrictions: PerceivedFriction[];
  professionalSupport?: ProfessionalSupportStatus;
}): InitialBehaviorAssessment {
  return {
    version: 1,
    completedAt,
    answers,
    contexts,
    perceivedFrictions,
    ...(professionalSupport ? { professionalSupport } : {}),
    hypotheses: buildBehaviorHypotheses(answers),
    evidence: "self-reported",
  };
}

export function normalizeInitialBehaviorAssessment(
  value: unknown,
): InitialBehaviorAssessment | undefined {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.answers)) {
    return undefined;
  }

  const answers: InitialBehaviorAnswers = {
    rhythm: normalizeBehaviorFrequency(value.answers.rhythm),
    hunger: normalizeBehaviorFrequency(value.answers.hunger),
    satietyControl: normalizeBehaviorFrequency(value.answers.satietyControl),
    emotional: normalizeBehaviorFrequency(value.answers.emotional),
    externalCues: normalizeBehaviorFrequency(value.answers.externalCues),
    habitContext: normalizeBehaviorFrequency(value.answers.habitContext),
    restrictionRebound: normalizeBehaviorFrequency(
      value.answers.restrictionRebound,
    ),
  };

  return buildInitialBehaviorAssessment({
    answers,
    completedAt:
      typeof value.completedAt === "string"
        ? value.completedAt
        : new Date(0).toISOString(),
    contexts: normalizeStringUnion(value.contexts, BEHAVIOR_CONTEXTS),
    perceivedFrictions: normalizeStringUnion(
      value.perceivedFrictions,
      PERCEIVED_FRICTIONS,
    ),
    professionalSupport:
      typeof value.professionalSupport === "string" &&
      PROFESSIONAL_SUPPORT_STATUSES.includes(
        value.professionalSupport as ProfessionalSupportStatus,
      )
        ? (value.professionalSupport as ProfessionalSupportStatus)
        : undefined,
  });
}

export function toggleExclusiveSelection<T extends string>(
  current: T[],
  value: T,
  selected: boolean,
  exclusiveValues: readonly T[],
): T[] {
  if (exclusiveValues.includes(value)) {
    return selected ? [value] : [];
  }

  const concreteValues = current.filter(
    (item) => !exclusiveValues.includes(item),
  );
  if (!selected) {
    return concreteValues.filter((item) => item !== value);
  }

  return concreteValues.includes(value)
    ? concreteValues
    : [...concreteValues, value];
}

export function legacyFrictionFromAssessment(
  assessment: InitialBehaviorAssessment,
): FrictionChoice {
  const primaryAxis = assessment.hypotheses[0]?.axis;
  if (primaryAxis === "rhythm_hunger") return "irregularity";
  if (primaryAxis === "satiety_control") return "large-portions";
  if (primaryAxis === "habit_context") return "habit-meals";
  if (primaryAxis === "emotional" || primaryAxis === "external_cues") {
    return "snacking-without-hunger";
  }

  const perceived = assessment.perceivedFrictions.find(
    (friction) => friction !== "unknown",
  );
  if (
    perceived === "large-portions" ||
    perceived === "snacking-without-hunger" ||
    perceived === "habit-meals" ||
    perceived === "irregularity"
  ) {
    return perceived;
  }
  return "unknown";
}

export function behaviorHypothesisText(axis: BehavioralAxis): string {
  if (axis === "rhythm_hunger") {
    return "Tu sembles parfois arriver aux repas avec une faim difficile à calmer.";
  }
  if (axis === "satiety_control") {
    return "Le moment où tu t'arrêtes de manger mérite d'être observé.";
  }
  if (axis === "emotional") {
    return "Le stress ou la fatigue pourraient déclencher certaines envies.";
  }
  if (axis === "external_cues") {
    return "La présence d'aliments semble parfois déclencher l'envie de manger.";
  }
  if (axis === "habit_context") {
    return "Certaines prises alimentaires semblent liées aux habitudes ou au contexte.";
  }
  return "Les périodes de contrôle très strict pourraient être suivies d'un effet rebond.";
}

export function toggleFrictionSelection(
  current: FrictionChoice[],
  friction: FrictionChoice,
  selected: boolean,
): FrictionChoice[] {
  if (friction === "unknown") {
    return selected ? [friction] : [];
  }

  const concreteChoices = current.filter((choice) => choice !== "unknown");
  if (!selected) {
    return concreteChoices.filter((choice) => choice !== friction);
  }

  return concreteChoices.includes(friction)
    ? concreteChoices
    : [...concreteChoices, friction];
}

export function getPrimaryFriction(
  frictions: FrictionChoice[],
): FrictionChoice {
  return frictions.find((choice) => choice !== "unknown") ?? "unknown";
}
