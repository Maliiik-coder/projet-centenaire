"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMealEntry } from "@/lib/mealMutations";
import type { AppData, ISODate, MealEntry } from "@/lib/types";
import {
  createEmptyMealDraft,
  getMealSubmitError,
  mealDraftFromEntry,
} from "@/features/meal/mealDraftModel";
import { commitMealDraft } from "@/features/meal/mealJournalModel";
import type { SaveAppData } from "@/features/session/useAppDataSession";
import {
  createMealDeleteMutation,
  createMealUpsertMutation,
} from "@/services/offlineSyncService";

type MealJournalControllerOptions = {
  cloudUserId: string | null;
  currentDate: ISODate;
  data: AppData | null;
  saveData: SaveAppData;
  setError: (error: string | null) => void;
};

type MealPanelSession =
  | { key: number; mode: "create" }
  | { key: number; mode: "edit"; mealId: string };

export function useMealJournalController({
  cloudUserId,
  currentDate,
  data,
  saveData,
  setError,
}: MealJournalControllerOptions) {
  const [mealDraft, setMealDraft] = useState(() =>
    createEmptyMealDraft(currentDate),
  );
  const [mealSession, setMealSession] = useState<MealPanelSession | null>(null);
  const [mealActionMenuId, setMealActionMenuId] = useState<string | null>(null);
  const dataRef = useRef(data);
  const mealSessionKeyRef = useRef(0);
  const mealLongPressTimeoutRef = useRef<number | null>(null);

  const editingMealId =
    mealSession?.mode === "edit" ? mealSession.mealId : null;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const clearMealLongPress = () => {
    if (mealLongPressTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(mealLongPressTimeoutRef.current);
    mealLongPressTimeoutRef.current = null;
  };

  useEffect(
    () => () => {
      if (mealLongPressTimeoutRef.current !== null) {
        window.clearTimeout(mealLongPressTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!mealActionMenuId) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMealActionMenuId(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mealActionMenuId]);

  const startMealLongPress = (mealId: string) => {
    clearMealLongPress();
    mealLongPressTimeoutRef.current = window.setTimeout(() => {
      setMealActionMenuId(mealId);
      mealLongPressTimeoutRef.current = null;
    }, 1000);
  };

  const openMealPanel = () => {
    mealSessionKeyRef.current += 1;
    setMealActionMenuId(null);
    setMealDraft(createEmptyMealDraft(currentDate));
    setMealSession({ key: mealSessionKeyRef.current, mode: "create" });
  };

  const closeMealPanel = () => {
    setMealSession(null);
    setMealDraft(createEmptyMealDraft(currentDate));
  };

  const openMealEditor = (meal: MealEntry) => {
    mealSessionKeyRef.current += 1;
    setMealActionMenuId(null);
    setMealDraft(mealDraftFromEntry(meal));
    setMealSession({
      key: mealSessionKeyRef.current,
      mealId: meal.id,
      mode: "edit",
    });
  };

  const deleteMealFromJournal = (meal: MealEntry) => {
    setMealActionMenuId(null);

    if (!data || !window.confirm("Supprimer ce repas ?")) {
      return;
    }

    saveData(
      {
        ...data,
        meals: deleteMealEntry(data.meals, meal.id),
      },
      "Repas supprimé.",
      [],
      cloudUserId ? [createMealDeleteMutation(cloudUserId, meal.createdAt)] : [],
    );
  };

  const addMealToJournal = () => {
    const currentData = dataRef.current;
    if (!currentData || !mealSession) {
      return;
    }

    const validationError = getMealSubmitError(mealDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const committed = commitMealDraft(
      currentData.meals,
      mealDraft,
      mealSession.mode === "edit" ? mealSession.mealId : null,
    );
    const nextData = {
      ...currentData,
      meals: committed.meals,
    };

    dataRef.current = nextData;

    saveData(
      nextData,
      committed.wasUpdate ? "Repas mis à jour." : "Repas ajouté au carnet.",
      [],
      cloudUserId
        ? [createMealUpsertMutation(cloudUserId, committed.entry)]
        : [],
    );
    closeMealPanel();
  };

  return {
    addMealToJournal,
    clearMealLongPress,
    closeMealActionMenu: () => setMealActionMenuId(null),
    closeMealPanel,
    deleteMealFromJournal,
    editingMealId,
    mealActionMenuId,
    mealDraft,
    mealOpen: mealSession !== null,
    mealSessionKey: mealSession?.key ?? 0,
    openMealActionMenu: setMealActionMenuId,
    openMealEditor,
    openMealPanel,
    setMealDraft,
    startMealLongPress,
  };
}
