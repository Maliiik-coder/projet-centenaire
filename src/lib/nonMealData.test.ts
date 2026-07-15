import { describe, expect, it } from "vitest";
import {
  buildProfilePatch,
  createProfilePatchMutationDraft,
  createSmokingMutationDraft,
  createWeightMutationDraft,
  normalizeDirtyDomains,
} from "@/lib/nonMealData";
import type { Profile } from "@/lib/types";

function profile(): Profile {
  return {
    firstName: "Olaf",
    age: 39,
    heightCm: 180,
    startWeightKg: 150,
    goalWeightKg: 100,
    startDate: "2026-07-01",
    initialFriction: "unknown",
    smokingStatus: "non-renseigne",
    showActiveMission: true,
    darkMode: true,
    weeklyActivityGoal: 5,
    createdAt: "2026-07-01T08:00:00.000Z",
  };
}

describe("mutations hors repas", () => {
  it("compare un profil sans renvoyer les champs inchangés", () => {
    const current = profile();
    const patch = buildProfilePatch(current, {
      ...current,
      showActiveMission: false,
    });

    expect(patch).toEqual({ showActiveMission: false });
    expect(createProfilePatchMutationDraft(patch)).toEqual({
      entity: "profile",
      action: "patch",
      entityKey: "profile",
      patch: { showActiveMission: false },
    });
  });

  it("cible un poids par date", () => {
    expect(
      createWeightMutationDraft({
        id: "weight-15",
        date: "2026-07-15",
        time: "08:00",
        weightKg: 149,
        createdAt: "2026-07-15T06:00:00.000Z",
      }),
    ).toMatchObject({ entity: "weight", entityKey: "2026-07-15" });
  });

  it("canonicalise la clé stable d'un événement tabac", () => {
    expect(
      createSmokingMutationDraft({
        id: "smoking-1",
        date: "2026-07-15",
        time: "10:00",
        state: "envie",
        createdAt: "2026-07-15T10:00:00.000+02:00",
      }),
    ).toMatchObject({ entityKey: "2026-07-15T08:00:00.000Z" });
  });

  it("lit encore les dirtyDomains d'une enveloppe V3 legacy", () => {
    expect(
      normalizeDirtyDomains({
        profile: true,
        weights: false,
        smokingEntries: true,
      }),
    ).toEqual({ profile: true, weights: false, smokingEntries: true });
  });
});
