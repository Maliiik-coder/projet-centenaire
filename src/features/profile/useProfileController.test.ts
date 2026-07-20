import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveAppData } from "@/features/session/useAppDataSession";
import type {
  AppData,
  BehavioralAxis,
  InitialBehaviorAssessment,
  Profile,
} from "@/lib/types";

const reactHookState = vi.hoisted(() => {
  const store = {
    cursor: 0,
    values: [] as unknown[],
  };

  return {
    store,
    useState: vi.fn((initialValue: unknown) => {
      const index = store.cursor;
      store.cursor += 1;

      if (store.values.length <= index) {
        store.values[index] =
          typeof initialValue === "function"
            ? (initialValue as () => unknown)()
            : initialValue;
      }

      const setState = (nextValue: unknown) => {
        store.values[index] =
          typeof nextValue === "function"
            ? (nextValue as (current: unknown) => unknown)(store.values[index])
            : nextValue;
      };

      return [store.values[index], setState];
    }),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState: reactHookState.useState,
  };
});

import { useProfileController } from "@/features/profile/useProfileController";

const baseProfile: Profile = {
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

function renderController({
  data,
  saveData,
  cloudUserId = "user-1",
  setError = vi.fn(),
}: {
  cloudUserId?: string | null;
  data: AppData;
  saveData: SaveAppData;
  setError?: (error: string | null) => void;
}) {
  reactHookState.store.cursor = 0;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useProfileController({
    cloudUserId,
    data,
    saveData,
    setError,
  });
}

function appData(profile: Profile): AppData {
  return {
    profile,
    meals: [],
    weights: [],
    smokingEntries: [],
    activities: [],
  };
}

function behaviorAssessment(axis: BehavioralAxis): InitialBehaviorAssessment {
  return {
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
    hypotheses: [{ axis, level: 2 }],
    evidence: "self-reported",
  };
}

describe("useProfileController", () => {
  beforeEach(() => {
    reactHookState.store.cursor = 0;
    reactHookState.store.values = [];
    reactHookState.useState.mockClear();
  });

  it("ne laisse pas un brouillon ouvert écraser une préférence modifiée", () => {
    const saveData = vi.fn<SaveAppData>();
    let data = appData(baseProfile);
    let controller = renderController({ data, saveData });

    controller.changeProfileEditorOpen(true);
    controller = renderController({ data, saveData });
    controller.updateProfilePreferences({ darkMode: true });

    data = saveData.mock.calls[0][0];
    controller = renderController({ data, saveData });
    controller.saveProfileChanges({
      ...controller.profileDraft!,
      firstName: "Mina",
    });

    const [nextData, , mutations] = saveData.mock.calls[1];
    expect(nextData.profile).toMatchObject({
      firstName: "Mina",
      darkMode: true,
    });
    expect(mutations).toEqual([
      {
        entity: "profile",
        action: "patch",
        entityKey: "profile",
        patch: { firstName: "Mina" },
      },
    ]);
    const profileMutation = mutations?.[0];
    if (!profileMutation || profileMutation.entity !== "profile") {
      throw new Error("Mutation profil attendue");
    }
    expect(profileMutation.patch).not.toHaveProperty("darkMode");
    expect(profileMutation.patch).not.toHaveProperty("showActiveMission");
  });

  it("ne laisse pas un brouillon ouvert écraser le portrait comportemental modifié", () => {
    const saveData = vi.fn<SaveAppData>();
    const firstAssessment = behaviorAssessment("habit_context");
    const nextAssessment = behaviorAssessment("satiety_control");
    let data = appData({
      ...baseProfile,
      initialBehaviorAssessment: firstAssessment,
    });
    let controller = renderController({ data, saveData });

    controller.changeProfileEditorOpen(true);
    controller = renderController({ data, saveData });
    controller.saveBehaviorAssessment(nextAssessment);

    data = saveData.mock.calls[0][0];
    controller = renderController({ data, saveData });
    controller.saveProfileChanges({
      ...controller.profileDraft!,
      age: 39,
    });

    const [nextData, , mutations] = saveData.mock.calls[1];
    expect(nextData.profile).toMatchObject({
      age: 39,
      initialBehaviorAssessment: nextAssessment,
    });
    expect(mutations).toEqual([
      {
        entity: "profile",
        action: "patch",
        entityKey: "profile",
        patch: { age: 39 },
      },
    ]);
    const profileMutation = mutations?.[0];
    if (!profileMutation || profileMutation.entity !== "profile") {
      throw new Error("Mutation profil attendue");
    }
    expect(profileMutation.patch).not.toHaveProperty(
      "initialBehaviorAssessment",
    );
    expect(profileMutation.patch).not.toHaveProperty("initialFriction");
  });

  it("ferme une sauvegarde sans changement sans appeler saveData", () => {
    const saveData = vi.fn<SaveAppData>();
    const data = appData(baseProfile);
    let controller = renderController({ data, saveData });

    controller.changeProfileEditorOpen(true);
    controller = renderController({ data, saveData });
    controller.saveProfileChanges(controller.profileDraft!);

    expect(saveData).not.toHaveBeenCalled();
  });

  it("produit une mutation limitée aux champs éditables modifiés", () => {
    const saveData = vi.fn<SaveAppData>();
    const currentAssessment = behaviorAssessment("external_cues");
    const staleAssessment = behaviorAssessment("rhythm_hunger");
    const data = appData({
      ...baseProfile,
      darkMode: true,
      showActiveMission: false,
      initialBehaviorAssessment: currentAssessment,
    });
    const controller = renderController({ data, saveData });

    controller.saveProfileChanges({
      ...baseProfile,
      firstName: "Mina",
      darkMode: false,
      showActiveMission: true,
      initialBehaviorAssessment: staleAssessment,
    });

    expect(saveData).toHaveBeenCalledTimes(1);
    expect(saveData.mock.calls[0][0].profile).toMatchObject({
      firstName: "Mina",
      darkMode: true,
      showActiveMission: false,
      initialBehaviorAssessment: currentAssessment,
    });
    expect(saveData.mock.calls[0][2]).toEqual([
      {
        entity: "profile",
        action: "patch",
        entityKey: "profile",
        patch: { firstName: "Mina" },
      },
    ]);
  });
});
