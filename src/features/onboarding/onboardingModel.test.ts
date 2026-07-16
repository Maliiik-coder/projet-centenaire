import { describe, expect, it } from "vitest";
import {
  applyReferenceGoalWeight,
  buildProfileFromOnboarding,
  createInitialOnboardingDraft,
  getNextOnboardingStep,
  getOnboardingStepError,
  getPreviousOnboardingStep,
  onboardingBehaviorStartStep,
  onboardingFinalStep,
  onboardingSmokingGoalStep,
  onboardingSmokingStep,
} from "@/features/onboarding/onboardingModel";

function completeDraft() {
  return {
    ...createInitialOnboardingDraft("2026-07-16"),
    firstName: " Camille ",
    birthDate: "1988-07-16",
    heightCm: "180",
    startWeightKg: "100.4",
    goalWeightKg: "80.2",
    behaviorAnswers: {
      rhythm: 0 as const,
      hunger: 0 as const,
      satietyControl: 0 as const,
      emotional: 0 as const,
      externalCues: 0 as const,
      habitContext: 0 as const,
      restrictionRebound: 0 as const,
    },
    contexts: ["unknown" as const],
    perceivedFrictions: ["unknown" as const],
    smokingStatus: "non" as const,
  };
}

describe("onboardingModel", () => {
  it("crée un brouillon réellement vide pour un nouvel utilisateur", () => {
    const draft = createInitialOnboardingDraft("2026-07-16");

    expect(draft.firstName).toBe("");
    expect(draft.birthDate).toBe("");
    expect(draft.startWeightKg).toBe("");
    expect(draft.smokingStatus).toBe("non-renseigne");
    expect(draft.startDate).toBe("2026-07-16");
  });

  it("saute l’objectif tabac pour un non-fumeur", () => {
    const nonSmoker = { ...completeDraft(), smokingStatus: "non" as const };
    const smoker = {
      ...completeDraft(),
      smokingStatus: "tous-les-jours" as const,
    };

    expect(getNextOnboardingStep(onboardingSmokingStep, nonSmoker)).toBe(
      onboardingFinalStep,
    );
    expect(getPreviousOnboardingStep(onboardingFinalStep, nonSmoker)).toBe(
      onboardingSmokingStep,
    );
    expect(getNextOnboardingStep(onboardingSmokingStep, smoker)).toBe(
      onboardingSmokingGoalStep,
    );
  });

  it("propose le repère de poids sans écraser un choix personnalisé", () => {
    const draft = completeDraft();
    const suggested = applyReferenceGoalWeight({
      ...draft,
      goalWeightKg: "",
      goalWeightIsCustom: false,
    });
    const custom = applyReferenceGoalWeight({
      ...draft,
      goalWeightKg: "92",
      goalWeightIsCustom: true,
    });

    expect(Number(suggested.goalWeightKg)).toBeGreaterThan(0);
    expect(custom.goalWeightKg).toBe("92");
  });

  it("conserve les validations progressives du questionnaire", () => {
    const empty = createInitialOnboardingDraft("2026-07-16");

    expect(getOnboardingStepError(empty, 1)).toBe(
      "Indique ton prénom pour ouvrir le carnet.",
    );
    expect(getOnboardingStepError(completeDraft(), onboardingBehaviorStartStep)).toBeNull();
  });

  it("construit le profil final sans conserver l’objectif tabac inutile", () => {
    const profile = buildProfileFromOnboarding(completeDraft());

    expect(profile.firstName).toBe("Camille");
    expect(profile.age).toBe(38);
    expect(profile.startWeightKg).toBe(100.4);
    expect(profile.goalWeightKg).toBe(80.2);
    expect(profile.smokingStatus).toBe("non");
    expect(profile.smokingGoal).toBeUndefined();
  });
});
