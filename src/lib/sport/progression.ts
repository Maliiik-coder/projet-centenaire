import {
  NO_PROGRESSION_ADJUSTMENT,
  STRENGTH_WORKOUT_CONFIG,
} from "@/lib/sport/config";
import type {
  CapabilityDimension,
  GeneratedWorkoutSession,
  ProgressionAdjustment,
  WorkoutFeedback,
} from "@/lib/sport/types";

function lastItems<T>(items: T[], count: number): T[] {
  return items.slice(Math.max(0, items.length - count));
}

function firstEffortDimension(
  session: GeneratedWorkoutSession | null,
): CapabilityDimension | undefined {
  const effortStep = session?.steps.find((step) => step.type === "effort");
  const snapshot = session?.generationInputSnapshot.capabilities;

  if (!effortStep || !snapshot) {
    return undefined;
  }

  const dimensions = Object.keys(snapshot) as CapabilityDimension[];
  return dimensions[0];
}

export function deriveProgressionAdjustment(
  sessions: GeneratedWorkoutSession[],
  feedback: WorkoutFeedback[],
): ProgressionAdjustment {
  const lastFeedback = feedback.at(-1);
  const lastSession = sessions.at(-1) ?? null;

  if (!lastFeedback) {
    return NO_PROGRESSION_ADJUSTMENT;
  }

  if (lastFeedback.bodySignal === "unusual_pain") {
    return {
      variable: "variant_difficulty",
      direction: "decrease",
      reason:
        "Retour avec douleur anormale : aucune progression, variante plus prudente si possible.",
      value: 1,
      dimension: firstEffortDimension(lastSession),
    };
  }

  if (
    lastFeedback.difficulty === "too_hard" ||
    lastFeedback.completion === "partial" ||
    lastFeedback.completion === "stopped"
  ) {
    return {
      variable: "variant_difficulty",
      direction: "decrease",
      reason:
        "Dernier retour difficile ou partiel : une seule variable est reduite, la variante.",
      value: 1,
      dimension: firstEffortDimension(lastSession),
    };
  }

  const coherentFeedbackCount =
    STRENGTH_WORKOUT_CONFIG.progression.coherentFeedbackCount;
  const recent = lastItems(feedback, coherentFeedbackCount);

  if (
    recent.length === coherentFeedbackCount &&
    recent.every(
      (item) =>
        item.difficulty === "too_easy" &&
        item.completion === "completed" &&
        item.bodySignal === "none",
    )
  ) {
    return {
      variable: "effort_duration",
      direction: "increase",
      reason:
        "Deux retours faciles et termines : seule la duree d'effort augmente legerement.",
      value: STRENGTH_WORKOUT_CONFIG.progression.effortStepSeconds,
      dimension: firstEffortDimension(lastSession),
    };
  }

  if (
    recent.length === coherentFeedbackCount &&
    recent.every(
      (item) =>
        item.difficulty === "right" &&
        item.completion === "completed" &&
        item.bodySignal === "none",
    )
  ) {
    return {
      variable: "recovery_duration",
      direction: "decrease",
      reason:
        "Deux retours adaptes et termines : seule la recuperation est legerement reduite.",
      value: STRENGTH_WORKOUT_CONFIG.progression.recoveryStepSeconds,
      dimension: firstEffortDimension(lastSession),
    };
  }

  return {
    ...NO_PROGRESSION_ADJUSTMENT,
    reason:
      "Ajustement differe : un retour isole ne suffit pas pour augmenter la difficulte.",
  };
}
