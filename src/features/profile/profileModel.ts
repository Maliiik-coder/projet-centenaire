import type { Profile, SmokingGoal, SmokingStatus } from "@/lib/types";

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

export function isValidEditableProfile(profile: Profile): boolean {
  return (
    profile.firstName.trim().length > 0 &&
    profile.age >= 18 &&
    profile.heightCm >= 120 &&
    profile.startWeightKg >= 40 &&
    profile.goalWeightKg >= 40
  );
}
