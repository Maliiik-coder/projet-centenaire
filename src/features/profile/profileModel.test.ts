import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/types";
import {
  applyEditableProfileDraft,
  editableProfileLimits,
  getEditableProfileErrors,
  hasStartWeightChanged,
  isValidEditableProfile,
  normalizeEditableProfile,
  profileNeedsSmokingGoal,
} from "@/features/profile/profileModel";

const validProfile: Profile = {
  firstName: "Camille",
  age: 38,
  heightCm: 175,
  startWeightKg: 110,
  goalWeightKg: 90,
  startDate: "2026-07-16",
  initialFriction: "unknown",
  smokingStatus: "non",
  showActiveMission: true,
  darkMode: false,
  weeklyActivityGoal: 5,
  createdAt: "2026-07-16T08:00:00.000Z",
};

describe("profileModel", () => {
  it("demande un objectif tabac uniquement aux fumeurs actuels", () => {
    expect(profileNeedsSmokingGoal("occasionnellement")).toBe(true);
    expect(profileNeedsSmokingGoal("tous-les-jours")).toBe(true);
    expect(profileNeedsSmokingGoal("non")).toBe(false);
    expect(profileNeedsSmokingGoal("arrete")).toBe(false);
  });

  it("accepte exactement les bornes produit du profil éditable", () => {
    const lowerBounds = {
      ...validProfile,
      age: editableProfileLimits.age.min,
      heightCm: editableProfileLimits.heightCm.min,
      startWeightKg: editableProfileLimits.weightKg.min,
      goalWeightKg: editableProfileLimits.weightKg.min,
    };
    const upperBounds = {
      ...validProfile,
      age: editableProfileLimits.age.max,
      heightCm: editableProfileLimits.heightCm.max,
      startWeightKg: editableProfileLimits.weightKg.max,
      goalWeightKg: editableProfileLimits.weightKg.max,
    };

    expect(isValidEditableProfile(lowerBounds)).toBe(true);
    expect(isValidEditableProfile(upperBounds)).toBe(true);
  });

  it("refuse chaque valeur hors bornes avec un message lié au champ", () => {
    expect(isValidEditableProfile(validProfile)).toBe(true);

    expect(
      getEditableProfileErrors({ ...validProfile, firstName: " " }),
    ).toHaveProperty("firstName");
    expect(
      getEditableProfileErrors({
        ...validProfile,
        firstName: "a".repeat(
          editableProfileLimits.firstNameMaxLength + 1,
        ),
      }),
    ).toHaveProperty("firstName", "60 caractères maximum.");
    expect(
      getEditableProfileErrors({ ...validProfile, age: 17 }),
    ).toHaveProperty("age", "Entre 18 et 100 ans.");
    expect(
      getEditableProfileErrors({ ...validProfile, age: 38.5 }),
    ).toHaveProperty("age");
    expect(
      getEditableProfileErrors({ ...validProfile, heightCm: 221 }),
    ).toHaveProperty("heightCm", "Entre 100 et 220 cm.");
    expect(
      getEditableProfileErrors({ ...validProfile, startWeightKg: 29.9 }),
    ).toHaveProperty("startWeightKg", "Entre 30 et 250 kg.");
    expect(
      getEditableProfileErrors({ ...validProfile, goalWeightKg: 250.1 }),
    ).toHaveProperty("goalWeightKg", "Entre 30 et 250 kg.");
  });

  it("demande une intention tabac lorsqu'elle est nécessaire", () => {
    expect(
      getEditableProfileErrors({
        ...validProfile,
        smokingStatus: "tous-les-jours",
        smokingGoal: undefined,
      }),
    ).toHaveProperty("smokingGoal");
  });

  it("normalise le prénom et les poids avant sauvegarde", () => {
    expect(
      normalizeEditableProfile({
        ...validProfile,
        firstName: "  Camille  ",
        startWeightKg: 110.06,
        goalWeightKg: 89.94,
      }),
    ).toMatchObject({
      firstName: "Camille",
      startWeightKg: 110.1,
      goalWeightKg: 89.9,
    });
  });

  it("applique seulement les champs éditables au profil courant", () => {
    const currentProfile: Profile = {
      ...validProfile,
      darkMode: true,
      showActiveMission: false,
      initialBehaviorAssessment: {
        version: 1,
        completedAt: "2026-07-20T08:00:00.000Z",
        answers: {
          rhythm: 2,
          hunger: 1,
          satietyControl: 2,
          emotional: 0,
          externalCues: 1,
          habitContext: 2,
          restrictionRebound: null,
        },
        contexts: ["work"],
        perceivedFrictions: ["irregularity"],
        hypotheses: [{ axis: "habit_context", level: 2 }],
        evidence: "self-reported",
      },
    };
    const staleDraft: Profile = {
      ...validProfile,
      firstName: "  Mina  ",
      startWeightKg: 91.26,
      goalWeightKg: 82.24,
      smokingStatus: "non",
      smokingGoal: "observer",
      darkMode: false,
      showActiveMission: true,
      initialBehaviorAssessment: undefined,
    };

    expect(applyEditableProfileDraft(currentProfile, staleDraft)).toMatchObject({
      firstName: "Mina",
      startWeightKg: 91.3,
      goalWeightKg: 82.2,
      smokingStatus: "non",
      smokingGoal: undefined,
      darkMode: true,
      showActiveMission: false,
      initialBehaviorAssessment: currentProfile.initialBehaviorAssessment,
    });
  });

  it("détecte uniquement un vrai changement du poids de départ", () => {
    expect(hasStartWeightChanged(validProfile, validProfile)).toBe(false);
    expect(
      hasStartWeightChanged(validProfile, {
        ...validProfile,
        startWeightKg: 111,
      }),
    ).toBe(true);
    expect(
      hasStartWeightChanged(validProfile, {
        ...validProfile,
        startWeightKg: 0,
      }),
    ).toBe(false);
  });
});
