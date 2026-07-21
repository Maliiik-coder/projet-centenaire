import { updateMealEntry } from "@/lib/mealMutations";
import type { MealEntry } from "@/lib/types";
import {
  mealEntryFromDraft,
  type MealDraft,
} from "@/features/meal/mealDraftModel";

export type MealJournalCommit = {
  entry: MealEntry;
  meals: MealEntry[];
  wasUpdate: boolean;
};

export function commitMealDraft(
  meals: MealEntry[],
  draft: MealDraft,
  editingMealId: string | null,
): MealJournalCommit {
  const editedMeal = editingMealId
    ? meals.find((meal) => meal.id === editingMealId) ?? null
    : null;
  const entry = mealEntryFromDraft(draft, editedMeal);

  return {
    entry,
    meals: editedMeal
      ? updateMealEntry(meals, editedMeal.id, entry)
      : [...meals, entry],
    wasUpdate: editedMeal !== null,
  };
}
