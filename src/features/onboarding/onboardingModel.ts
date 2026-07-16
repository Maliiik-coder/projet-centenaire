import { roundOne } from "@/lib/analytics";
import { calculateAgeOnDate, todayISO } from "@/lib/dates";
import {
  buildInitialBehaviorAssessment,
  calculateReferenceGoalWeight,
  legacyFrictionFromAssessment,
} from "@/lib/onboarding";
import type {
  BehaviorContext,
  BehaviorFrequency,
  InitialBehaviorAnswers,
  InitialBehaviorAssessment,
  PerceivedFriction,
  ProfessionalSupportStatus,
  Profile,
  SmokingGoal,
  SmokingStatus,
} from "@/lib/types";

export interface OnboardingDraft {
  firstName: string;
  birthDate: string;
  heightCm: string;
  startWeightKg: string;
  goalWeightKg: string;
  goalWeightIsCustom: boolean;
  startDate: string;
  behaviorAnswers: {
    [Key in keyof InitialBehaviorAnswers]: BehaviorFrequency | undefined;
  };
  contexts: BehaviorContext[];
  perceivedFrictions: PerceivedFriction[];
  professionalSupport?: ProfessionalSupportStatus;
  smokingStatus: SmokingStatus;
  smokingGoal?: SmokingGoal;
}

export type BehaviorAssessmentDraft = Pick<
  OnboardingDraft,
  | "behaviorAnswers"
  | "contexts"
  | "perceivedFrictions"
  | "professionalSupport"
>;

export const onboardingWelcomeStep = 0;
export const onboardingNameStep = 1;
export const onboardingBirthDateStep = 2;
export const onboardingHeightStep = 3;
export const onboardingWeightStep = 4;
export const onboardingBmiStep = 5;
export const onboardingGoalStep = 6;
export const onboardingBehaviorStartStep = 7;
export const onboardingContextsStep = 14;
export const onboardingPerceivedFrictionsStep = 15;
export const onboardingProfessionalSupportStep = 16;
export const onboardingSmokingStep = 17;
export const onboardingSmokingGoalStep = 18;
export const onboardingFinalStep = 19;

export const onboardingSmokingLabels: Partial<Record<SmokingStatus, string>> = {
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d’arrêter",
};

export const onboardingSmokingGoalLabels: Partial<
  Record<SmokingGoal, string>
> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer d’abord",
  "pas-maintenant": "Pas maintenant",
};

export const behaviorFrequencyChoices: Array<{
  label: string;
  value: BehaviorFrequency;
}> = [
  { label: "Jamais", value: 0 },
  { label: "Parfois", value: 2 },
  { label: "Souvent", value: 3 },
  { label: "Je ne sais pas encore", value: null },
];

export const behaviorContextLabels: Record<BehaviorContext, string> = {
  "evening-night": "Le soir ou la nuit",
  screen: "Devant un écran",
  work: "Au travail",
  "car-travel": "En voiture ou en déplacement",
  hotel: "À l’hôtel",
  "restaurant-social": "Au restaurant ou avec d’autres personnes",
  "alone-home": "Seul à la maison",
  "no-specific-context": "Aucune situation précise",
  unknown: "Je ne sais pas encore",
};

export const perceivedFrictionLabels: Record<PerceivedFriction, string> = {
  "large-portions": "Des portions trop importantes",
  "snacking-without-hunger": "Manger ou grignoter sans faim",
  "habit-meals": "Des repas pris par habitude",
  irregularity: "Un rythme irrégulier",
  emotional: "Le stress ou les émotions",
  stopping: "La difficulté à m’arrêter",
  unknown: "Je ne sais pas encore",
};

export const professionalSupportLabels: Record<
  ProfessionalSupportStatus,
  string
> = {
  yes: "Oui",
  no: "Non",
  "prefer-not-to-say": "Je préfère ne pas répondre",
};

export const behaviorQuestions: Record<
  number,
  { key: keyof InitialBehaviorAnswers; title: string }
> = {
  7: {
    key: "rhythm",
    title:
      "Sur une semaine habituelle, t’arrive-t-il de sauter un repas ou de manger beaucoup plus tard que prévu ?",
  },
  8: {
    key: "hunger",
    title:
      "T’arrive-t-il de commencer un repas avec une faim difficile à calmer ?",
  },
  9: {
    key: "satietyControl",
    title:
      "T’arrive-t-il de continuer à manger alors que tu n’as plus vraiment faim ?",
  },
  10: {
    key: "emotional",
    title:
      "Le stress, la fatigue, l’ennui ou une contrariété te donnent-ils envie de manger ?",
  },
  11: {
    key: "externalCues",
    title:
      "La vue, l’odeur ou la présence d’un aliment te donnent-elles envie de manger sans faim ?",
  },
  12: {
    key: "habitContext",
    title:
      "T’arrive-t-il de manger uniquement parce que c’est l’heure ou parce que les autres mangent ?",
  },
  13: {
    key: "restrictionRebound",
    title:
      "Après t’être beaucoup privé, t’arrive-t-il de manger nettement plus ensuite ?",
  },
};

const behaviorAnswerStepKeys: Partial<
  Record<number, keyof InitialBehaviorAnswers>
> = {
  7: "rhythm",
  8: "hunger",
  9: "satietyControl",
  10: "emotional",
  11: "externalCues",
  12: "habitContext",
  13: "restrictionRebound",
};

export function createInitialOnboardingDraft(
  startDate = todayISO(),
): OnboardingDraft {
  return {
    firstName: "",
    birthDate: "",
    heightCm: "",
    startWeightKg: "",
    goalWeightKg: "",
    goalWeightIsCustom: false,
    startDate,
    behaviorAnswers: emptyBehaviorAnswers(),
    contexts: [],
    perceivedFrictions: [],
    professionalSupport: undefined,
    smokingStatus: "non-renseigne",
    smokingGoal: undefined,
  };
}

export function createBehaviorAssessmentDraft(
  initialAssessment?: InitialBehaviorAssessment,
): BehaviorAssessmentDraft {
  return {
    behaviorAnswers: initialAssessment
      ? { ...initialAssessment.answers }
      : emptyBehaviorAnswers(),
    contexts: initialAssessment?.contexts ?? [],
    perceivedFrictions: initialAssessment?.perceivedFrictions ?? [],
    professionalSupport: initialAssessment?.professionalSupport,
  };
}

export function needsSmokingGoal(status: SmokingStatus): boolean {
  return status !== "non" && status !== "non-renseigne";
}

export function completeBehaviorAnswers(
  answers: OnboardingDraft["behaviorAnswers"],
): InitialBehaviorAnswers {
  return {
    rhythm: answers.rhythm ?? null,
    hunger: answers.hunger ?? null,
    satietyControl: answers.satietyControl ?? null,
    emotional: answers.emotional ?? null,
    externalCues: answers.externalCues ?? null,
    habitContext: answers.habitContext ?? null,
    restrictionRebound: answers.restrictionRebound ?? null,
  };
}

export function hasCompleteBehaviorAnswers(
  answers: OnboardingDraft["behaviorAnswers"],
): boolean {
  return Object.values(answers).every((answer) => answer !== undefined);
}

export function buildBehaviorAssessmentFromDraft(
  draft: BehaviorAssessmentDraft,
  completedAt: string,
): InitialBehaviorAssessment {
  return buildInitialBehaviorAssessment({
    answers: completeBehaviorAnswers(draft.behaviorAnswers),
    completedAt,
    contexts: draft.contexts,
    perceivedFrictions: draft.perceivedFrictions,
    professionalSupport: draft.professionalSupport,
  });
}

export function buildProfileFromOnboarding(draft: OnboardingDraft): Profile {
  const createdAt = new Date().toISOString();
  const initialBehaviorAssessment = buildBehaviorAssessmentFromDraft(
    draft,
    createdAt,
  );

  return {
    firstName: draft.firstName.trim(),
    age: calculateAgeOnDate(draft.birthDate, draft.startDate),
    heightCm: Number(draft.heightCm),
    startWeightKg: roundOne(Number(draft.startWeightKg)),
    goalWeightKg: roundOne(Number(draft.goalWeightKg)),
    startDate: draft.startDate,
    initialFriction: legacyFrictionFromAssessment(initialBehaviorAssessment),
    initialBehaviorAssessment,
    smokingStatus: draft.smokingStatus,
    smokingGoal: needsSmokingGoal(draft.smokingStatus)
      ? draft.smokingGoal
      : undefined,
    showActiveMission: true,
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt,
  };
}

export function applyReferenceGoalWeight(draft: OnboardingDraft): OnboardingDraft {
  if (draft.goalWeightIsCustom) return draft;

  const referenceGoalWeight = calculateReferenceGoalWeight(
    Number(draft.startWeightKg),
    Number(draft.heightCm),
  );
  if (referenceGoalWeight === null) return draft;

  return { ...draft, goalWeightKg: String(referenceGoalWeight) };
}

export function getNextOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === onboardingSmokingStep && !needsSmokingGoal(draft.smokingStatus)) {
    return onboardingFinalStep;
  }
  return Math.min(onboardingFinalStep, step + 1);
}

export function getPreviousOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === onboardingFinalStep && !needsSmokingGoal(draft.smokingStatus)) {
    return onboardingSmokingStep;
  }
  return Math.max(0, step - 1);
}

export function getOnboardingStepError(
  draft: OnboardingDraft,
  step: number,
): string | null {
  if (step === onboardingNameStep && draft.firstName.trim().length === 0) {
    return "Indique ton prénom pour ouvrir le carnet.";
  }
  if (
    step === onboardingBirthDateStep &&
    !hasValidOnboardingBirthDate(draft.birthDate, draft.startDate)
  ) {
    return "Choisis ta date de naissance.";
  }
  if (
    step === onboardingHeightStep &&
    !hasNumberInRange(draft.heightCm, 100, 220)
  ) {
    return "Choisis ta taille.";
  }
  if (
    step === onboardingWeightStep &&
    !hasNumberInRange(draft.startWeightKg, 30, 250)
  ) {
    return "Choisis ton poids actuel.";
  }
  if (
    step === onboardingGoalStep &&
    !hasNumberInRange(draft.goalWeightKg, 30, 250)
  ) {
    return "Choisis ton objectif.";
  }

  const behaviorAnswerKey = behaviorAnswerStepKeys[step];
  if (
    step >= onboardingBehaviorStartStep &&
    behaviorAnswerKey &&
    draft.behaviorAnswers[behaviorAnswerKey] === undefined
  ) {
    return "Choisis la réponse qui se rapproche le plus de ton quotidien.";
  }
  if (step === onboardingContextsStep && draft.contexts.length === 0) {
    return "Choisis au moins une situation, ou indique que tu ne sais pas encore.";
  }
  if (
    step === onboardingPerceivedFrictionsStep &&
    draft.perceivedFrictions.length === 0
  ) {
    return "Choisis au moins un point, ou indique que tu ne sais pas encore.";
  }
  if (step === onboardingSmokingStep && draft.smokingStatus === "non-renseigne") {
    return "Réponds à la question tabac pour continuer.";
  }
  if (
    step === onboardingSmokingGoalStep &&
    needsSmokingGoal(draft.smokingStatus) &&
    draft.smokingGoal === undefined
  ) {
    return "Choisis ce que tu souhaites faire concernant le tabac.";
  }
  if (step === onboardingFinalStep && !isValidProfileDraft(draft)) {
    return "Complète les réponses précédentes pour ouvrir le carnet.";
  }

  return null;
}

function emptyBehaviorAnswers(): OnboardingDraft["behaviorAnswers"] {
  return {
    rhythm: undefined,
    hunger: undefined,
    satietyControl: undefined,
    emotional: undefined,
    externalCues: undefined,
    habitContext: undefined,
    restrictionRebound: undefined,
  };
}

function isValidProfileDraft(draft: OnboardingDraft): boolean {
  return (
    draft.firstName.trim().length > 0 &&
    hasValidOnboardingBirthDate(draft.birthDate, draft.startDate) &&
    hasNumberInRange(draft.heightCm, 100, 220) &&
    hasNumberInRange(draft.startWeightKg, 30, 250) &&
    hasNumberInRange(draft.goalWeightKg, 30, 250) &&
    draft.startDate.length > 0 &&
    hasCompleteBehaviorAnswers(draft.behaviorAnswers) &&
    draft.contexts.length > 0 &&
    draft.perceivedFrictions.length > 0 &&
    draft.smokingStatus !== "non-renseigne" &&
    (!needsSmokingGoal(draft.smokingStatus) || draft.smokingGoal !== undefined)
  );
}

function hasNumberInRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return value.trim().length > 0 && number >= min && number <= max;
}

function hasValidOnboardingBirthDate(
  birthDate: string,
  referenceDate: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const age = calculateAgeOnDate(birthDate, referenceDate);
  return age >= 18 && age <= 100;
}
