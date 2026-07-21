"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMealEntry, updateMealEntry } from "@/lib/mealMutations";
import type { AppData, ISODate, MealEntry } from "@/lib/types";
import {
  createEmptyMealDraft,
  getMealSubmitError,
  mealDraftFromEntry,
  mealEntryFromDraft,
} from "@/features/meal/mealDraftModel";
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

export function useMealJournalController({
  cloudUserId,
  currentDate,
  data,
  saveData,
  setError,
}: MealJournalControllerOptions) {
  const [mealOpen, setMealOpen] = useState(false);
  const [mealDraft, setMealDraft] = useState(() =>
    createEmptyMealDraft(currentDate),
  );
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealSessionKey, setMealSessionKey] = useState(0);
  const [mealActionMenuId, setMealActionMenuId] = useState<string | null>(null);
  const editingMealIdRef = useRef<string | null>(null);
  const mealLongPressTimeoutRef = useRef<number | null>(null);

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
    editingMealIdRef.current = null;
    setEditingMealId(null);
    setMealActionMenuId(null);
    setMealDraft(createEmptyMealDraft(currentDate));
    setMealSessionKey((current) => current + 1);
    setMealOpen(true);
  };

  const closeMealPanel = () => {
    editingMealIdRef.current = null;
    setMealOpen(false);
    setEditingMealId(null);
    setMealDraft(createEmptyMealDraft(currentDate));
  };

  const openMealEditor = (meal: MealEntry) => {
    editingMealIdRef.current = meal.id;
    setMealActionMenuId(null);
    setEditingMealId(meal.id);
    setMealDraft(mealDraftFromEntry(meal));
    setMealSessionKey((current) => current + 1);
    setMealOpen(true);
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
    if (!data) {
      return;
    }

    const validationError = getMealSubmitError(mealDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const activeEditingMealId = editingMealIdRef.current;
    const editedMeal = activeEditingMealId
      ? data.meals.find((meal) => meal.id === activeEditingMealId)
      : null;
    const entry = mealEntryFromDraft(mealDraft, editedMeal ?? null);

    saveData(
      {
        ...data,
        meals: editedMeal
          ? updateMealEntry(data.meals, editedMeal.id, entry)
          : [...data.meals, entry],
      },
      editedMeal ? "Repas mis à jour." : "Repas ajouté au carnet.",
      [],
      cloudUserId ? [createMealUpsertMutation(cloudUserId, entry)] : [],
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
    mealOpen,
    mealSessionKey,
    openMealActionMenu: setMealActionMenuId,
    openMealEditor,
    openMealPanel,
    setMealDraft,
    startMealLongPress,
  };
}
