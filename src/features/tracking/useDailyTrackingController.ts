"use client";

import { useState } from "react";
import { getLatestWeight } from "@/lib/analytics";
import {
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
import {
  createSmokingMutationDraft,
  createWeightMutationDraft,
} from "@/lib/nonMealData";
import type { AppData, ISODate, SmokingDayState } from "@/lib/types";
import type { SaveAppData } from "@/features/session/useAppDataSession";
import {
  smokingEntryFromValues,
  weightEntryFromDraft,
} from "@/features/tracking/dailyTrackingModel";

type DailyTrackingControllerOptions = {
  currentDate: ISODate;
  data: AppData | null;
  saveData: SaveAppData;
  setError: (error: string | null) => void;
};

export function useDailyTrackingController({
  currentDate,
  data,
  saveData,
  setError,
}: DailyTrackingControllerOptions) {
  const [smokingOpen, setSmokingOpen] = useState(false);

  const addWeight = (draft: string) => {
    if (!data) return false;

    const result = weightEntryFromDraft(currentDate, draft);
    if (!result.entry) {
      setError(result.error);
      return false;
    }
    const entry = result.entry;
    const latestTodayWeight = getLatestWeight(
      data.weights.filter((weight) => weight.date === currentDate),
    );

    saveData(
      {
        ...data,
        weights: upsertDailyWeightEntry(data.weights, entry),
      },
      latestTodayWeight ? "Mesure mise à jour." : "Mesure ajoutée au carnet.",
      [createWeightMutationDraft(entry)],
    );
    return true;
  };

  const addSmokingEntry = (state: SmokingDayState, note: string) => {
    if (!data) return;

    const entry = smokingEntryFromValues(currentDate, state, note);
    saveData(
      {
        ...data,
        smokingEntries: upsertSmokingEntry(data.smokingEntries, entry),
      },
      "Tabac ajouté au carnet.",
      [createSmokingMutationDraft(entry)],
    );
    setSmokingOpen(false);
  };

  return {
    addSmokingEntry,
    addWeight,
    closeSmokingPanel: () => setSmokingOpen(false),
    openSmokingPanel: () => setSmokingOpen(true),
    smokingOpen,
  };
}
