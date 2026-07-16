import { describe, expect, it } from "vitest";
import {
  capabilitiesFromDraft,
  createDefaultSportOnboardingDraft,
  createSportDataFromDraft,
  createSportProfile,
  limitationsFromDraft,
  updateSportProfile,
  upsertCapability,
  upsertEquipment,
} from "@/services/sport/sportProfileService";

const NOW = "2026-07-15T10:00:00.000Z";
const USER_ID = "user-profile";

describe("sportProfileService", () => {
  it("cree un profil sportif complet depuis le questionnaire", () => {
    const profile = createSportProfile(
      {
        ...createDefaultSportOnboardingDraft(),
        goals: ["restart_activity", "build_strength"],
        preferredActivities: ["strength", "walk_run", "swim"],
        availableLocations: ["home", "pool"],
        usualDurationMinutes: 20,
        desiredFrequency: "twice_weekly",
      },
      NOW,
      USER_ID,
    );

    expect(profile.userId).toBe(USER_ID);
    expect(profile.goals).toEqual(["restart_activity", "build_strength"]);
    expect(profile.questionnaireCompleted).toBe(true);
    expect(profile.walkRunReadiness).toMatchObject({
      canRunShortBursts: false,
    });
    expect(profile.swimReadiness).toMatchObject({ hasPoolAccess: true });
  });

  it("ne preselectionne aucun choix visible dans le questionnaire", () => {
    const draft = createDefaultSportOnboardingDraft();

    expect(draft.goals).toEqual([]);
    expect(draft.preferredActivities).toEqual([]);
    expect(draft.usualDurationMinutes).toBeNull();
    expect(draft.desiredFrequency).toBeNull();
  });

  it("met a jour le profil sans recréer l'identifiant", () => {
    const profile = createSportProfile(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );
    const updated = updateSportProfile(
      profile,
      { usualDurationMinutes: 30, desiredFrequency: "three_weekly" },
      "2026-07-15T11:00:00.000Z",
    );

    expect(updated.id).toBe(profile.id);
    expect(updated.usualDurationMinutes).toBe(30);
    expect(updated.updatedAt).not.toBe(profile.updatedAt);
  });

  it("enregistre le materiel disponible par utilisateur", () => {
    const next = upsertEquipment([], USER_ID, "resistance_band", true, NOW);
    const replaced = upsertEquipment(
      next,
      USER_ID,
      "resistance_band",
      false,
      "2026-07-15T11:00:00.000Z",
    );

    expect(replaced).toHaveLength(1);
    expect(replaced[0]).toMatchObject({
      userId: USER_ID,
      type: "resistance_band",
      available: false,
    });
  });

  it("convertit une limitation en donnee active sans diagnostic", () => {
    const limitations = limitationsFromDraft(
      {
        ...createDefaultSportOnboardingDraft(),
        limitationKind: "pain",
        limitationZone: "knees",
        limitationDescription: "Sensation a surveiller",
      },
      NOW,
      USER_ID,
    );

    expect(limitations).toHaveLength(1);
    expect(limitations[0]).toMatchObject({
      kind: "pain",
      zone: "knees",
      active: true,
    });
    expect(limitations[0]?.description).toBe("Sensation a surveiller");
  });

  it("stocke les capacites sur plusieurs dimensions independantes", () => {
    const capabilities = capabilitiesFromDraft(
      {
        ...createDefaultSportOnboardingDraft(),
        pushCapability: 0,
        legsCapability: 3,
        coreCapability: 1,
      },
      NOW,
      USER_ID,
    );

    expect(capabilities.find((item) => item.dimension === "upper_push")?.level)
      .toBe(0);
    expect(capabilities.find((item) => item.dimension === "legs")?.level).toBe(
      3,
    );
    expect(capabilities.find((item) => item.dimension === "core")?.level).toBe(
      1,
    );
  });

  it("met a jour une seule capacite sans niveau global", () => {
    const capabilities = capabilitiesFromDraft(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );
    const next = upsertCapability(
      capabilities,
      USER_ID,
      "upper_push",
      2,
      "2026-07-15T11:00:00.000Z",
      "calibration",
    );

    expect(next.find((item) => item.dimension === "upper_push")).toMatchObject({
      level: 2,
      source: "calibration",
    });
    expect(next.find((item) => item.dimension === "legs")?.level).toBe(1);
  });

  it("cree un jeu local complet pour la tranche isolee", () => {
    const data = createSportDataFromDraft(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );

    expect(data.profile?.userId).toBe(USER_ID);
    expect(data.equipment.length).toBeGreaterThan(5);
    expect(data.capabilities.length).toBeGreaterThan(4);
    expect(data.sessions).toEqual([]);
  });
});
