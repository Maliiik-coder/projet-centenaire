import type { Profile, SmokingGoal, SmokingStatus } from "@/lib/types";

export const editableProfileLimits = {
  firstNameMaxLength: 60,
  age: { min: 18, max: 100 },
  heightCm: { min: 100, max: 220 },
  weightKg: { min: 30, max: 250 },
} as const;

export type EditableProfileField =
  | "firstName"
  | "age"
  | "heightCm"
  | "startWeightKg"
  | "goalWeightKg"
  | "smokingGoal";

export type EditableProfileErrors = Partial<
  Record<EditableProfileField, string>
>;

export const profileSmokingStatusLabels: Record<SmokingStatus, string> = {
  "non-renseigne": "Non renseigné",
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d'arrêter",
};

export const profileSmokingGoalLabels: Record<SmokingGoal, string> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer seulement",
  "pas-maintenant": "Pas maintenant",
};

export function profileNeedsSmokingGoal(status: SmokingStatus): boolean {
  return status === "occasionnellement" || status === "tous-les-jours";
}

export function getEditableProfileErrors(
  profile: Profile,
): EditableProfileErrors {
  const errors: EditableProfileErrors = {};
  const firstName = profile.firstName.trim();

  if (firstName.length === 0) {
    errors.firstName = "Indique ton prénom.";
  } else if (firstName.length > editableProfileLimits.firstNameMaxLength) {
    errors.firstName = `${editableProfileLimits.firstNameMaxLength} caractères maximum.`;
  }

  if (
    !Number.isInteger(profile.age) ||
    !isNumberInRange(
      profile.age,
      editableProfileLimits.age.min,
      editableProfileLimits.age.max,
    )
  ) {
    errors.age = `Entre ${editableProfileLimits.age.min} et ${editableProfileLimits.age.max} ans.`;
  }

  if (
    !Number.isInteger(profile.heightCm) ||
    !isNumberInRange(
      profile.heightCm,
      editableProfileLimits.heightCm.min,
      editableProfileLimits.heightCm.max,
    )
  ) {
    errors.heightCm = `Entre ${editableProfileLimits.heightCm.min} et ${editableProfileLimits.heightCm.max} cm.`;
  }

  if (
    !isNumberInRange(
      profile.startWeightKg,
      editableProfileLimits.weightKg.min,
      editableProfileLimits.weightKg.max,
    )
  ) {
    errors.startWeightKg = `Entre ${editableProfileLimits.weightKg.min} et ${editableProfileLimits.weightKg.max} kg.`;
  }

  if (
    !isNumberInRange(
      profile.goalWeightKg,
      editableProfileLimits.weightKg.min,
      editableProfileLimits.weightKg.max,
    )
  ) {
    errors.goalWeightKg = `Entre ${editableProfileLimits.weightKg.min} et ${editableProfileLimits.weightKg.max} kg.`;
  }

  if (profileNeedsSmokingGoal(profile.smokingStatus) && !profile.smokingGoal) {
    errors.smokingGoal = "Choisis ce que tu souhaites faire concernant le tabac.";
  }

  return errors;
}

export function isValidEditableProfile(profile: Profile): boolean {
  return Object.keys(getEditableProfileErrors(profile)).length === 0;
}

export function normalizeEditableProfile(profile: Profile): Profile {
  return {
    ...profile,
    firstName: profile.firstName.trim(),
    startWeightKg: roundOne(profile.startWeightKg),
    goalWeightKg: roundOne(profile.goalWeightKg),
  };
}

export function applyEditableProfileDraft(
  profile: Profile,
  draft: Profile,
): Profile {
  const normalizedDraft = normalizeEditableProfile(draft);

  return {
    ...profile,
    firstName: normalizedDraft.firstName,
    age: normalizedDraft.age,
    heightCm: normalizedDraft.heightCm,
    startWeightKg: normalizedDraft.startWeightKg,
    goalWeightKg: normalizedDraft.goalWeightKg,
    smokingStatus: normalizedDraft.smokingStatus,
    smokingGoal: profileNeedsSmokingGoal(normalizedDraft.smokingStatus)
      ? normalizedDraft.smokingGoal
      : undefined,
  };
}

export function hasStartWeightChanged(
  profile: Profile,
  draft: Profile,
): boolean {
  return (
    isNumberInRange(
      draft.startWeightKg,
      editableProfileLimits.weightKg.min,
      editableProfileLimits.weightKg.max,
    ) && roundOne(profile.startWeightKg) !== roundOne(draft.startWeightKg)
  );
}

function isNumberInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
