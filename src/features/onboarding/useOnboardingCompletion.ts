"use client";

import {
  createProfileMutationDraft,
  createWeightMutationDraft,
} from "@/lib/nonMealData";
import type { AppData, Profile, WeightEntry } from "@/lib/types";
import type { SaveAppData } from "@/features/session/useAppDataSession";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentTime(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

type OnboardingCompletionOptions = {
  data: AppData | null;
  saveData: SaveAppData;
};

export function useOnboardingCompletion({
  data,
  saveData,
}: OnboardingCompletionOptions) {
  return (nextProfile: Profile) => {
    if (!data) return;

    const initialWeight: WeightEntry = {
      id: createId("weight"),
      date: nextProfile.startDate,
      time: currentTime(),
      weightKg: nextProfile.startWeightKg,
      createdAt: new Date().toISOString(),
    };

    saveData(
      {
        ...data,
        profile: nextProfile,
        weights: [initialWeight],
      },
      "Carnet ouvert.",
      [
        createProfileMutationDraft(nextProfile),
        createWeightMutationDraft(initialWeight),
      ],
    );
  };
}
