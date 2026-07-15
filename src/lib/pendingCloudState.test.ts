import { describe, expect, it } from "vitest";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import { materializePendingCloudState } from "@/lib/pendingCloudState";
import { createEmptyData } from "@/lib/storage";
import type {
  MealEntry,
  MealMutationPayload,
  NonMealMutationDraft,
  Profile,
  StoredCloudMutation,
} from "@/lib/types";

function profile(firstName: string): Profile {
  return {
    firstName,
    age: 39,
    heightCm: 180,
    startWeightKg: 150,
    goalWeightKg: 100,
    startDate: "2026-07-01",
    initialFriction: "unknown",
    smokingStatus: "non-renseigne",
    showActiveMission: true,
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt: "2026-07-01T08:00:00.000Z",
  };
}

function meal(id: string, createdAt: string): MealEntry {
  return {
    id,
    date: "2026-07-15",
    time: "12:00",
    kind: "dejeuner",
    freeText: id,
    quantity: "reasonable-plate",
    servingPattern: "none",
    hungerBefore: "yes",
    afterMeal: "fine",
    fullnessAfter: "fine",
    stopReason: "rassasie",
    snackingAfter: "non",
    starterTaken: false,
    starterText: null,
    dessertTaken: false,
    dessertText: null,
    snackTrigger: null,
    snackContext: null,
    clarifications: [],
    questionnaireVersion: "v0.7",
    components: { ...EMPTY_COMPONENTS },
    finding: buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "none",
      hungerBefore: "yes",
      fullnessAfter: "fine",
      components: EMPTY_COMPONENTS,
    }),
    createdAt,
  };
}

function storedNonMeal(
  id: string,
  payload: NonMealMutationDraft,
  queuedAt: string,
): StoredCloudMutation {
  return {
    id,
    ownerUserId: "user-a",
    generationId: "generation-a",
    kind: "non-meal",
    queuedAt,
    payload,
  };
}

function storedMeal(
  id: string,
  payload: MealMutationPayload,
  queuedAt: string,
): StoredCloudMutation {
  return {
    id,
    ownerUserId: "user-a",
    generationId: "generation-a",
    kind: "meal",
    queuedAt,
    payload,
  };
}

describe("materializePendingCloudState", () => {
  it("applique uniquement les mutations pending au snapshot cloud", () => {
    const deletedMeal = meal("deleted", "2026-07-15T12:00:00.000Z");
    const keptMeal = meal("kept", "2026-07-15T13:00:00.000Z");
    const addedMeal = meal("added", "2026-07-15T14:00:00.000Z");
    const localWeight = {
      id: "local-weight",
      date: "2026-07-15",
      time: "08:00",
      weightKg: 149,
      createdAt: "2026-07-15T06:00:00.000Z",
    };
    const visible = materializePendingCloudState(
      {
        ...createEmptyData(),
        profile: profile("Cloud"),
        meals: [deletedMeal, keptMeal],
      },
      [
        storedNonMeal(
          "weight",
          {
            entity: "weight",
            action: "upsert",
            entityKey: localWeight.date,
            payload: localWeight,
          },
          "2026-07-15T15:00:00.000Z",
        ),
        storedMeal(
          "delete",
          {
            entity: "meal",
            action: "delete",
            entityKey: deletedMeal.createdAt,
            createdAt: deletedMeal.createdAt,
          },
          "2026-07-15T15:01:00.000Z",
        ),
        storedMeal(
          "upsert",
          {
            entity: "meal",
            action: "upsert",
            entityKey: addedMeal.createdAt,
            createdAt: addedMeal.createdAt,
            payload: addedMeal,
          },
          "2026-07-15T15:02:00.000Z",
        ),
      ],
    );

    expect(visible.profile?.firstName).toBe("Cloud");
    expect(visible.weights).toMatchObject([{ weightKg: 149 }]);
    expect(visible.meals.map((entry) => entry.id)).toEqual(["kept", "added"]);
  });

  it("garde create et patch profil distincts lors de la matérialisation", () => {
    const visible = materializePendingCloudState(
      { ...createEmptyData(), profile: { ...profile("Cloud"), darkMode: true } },
      [
        storedNonMeal(
          "create",
          {
            entity: "profile",
            action: "create",
            entityKey: "profile",
            patch: profile("Local"),
          },
          "2026-07-15T08:00:00.000Z",
        ),
        storedNonMeal(
          "patch",
          {
            entity: "profile",
            action: "patch",
            entityKey: "profile",
            patch: { showActiveMission: false },
          },
          "2026-07-15T08:01:00.000Z",
        ),
      ],
    );

    expect(visible.profile).toMatchObject({
      firstName: "Cloud",
      darkMode: true,
      showActiveMission: false,
    });
  });
});
