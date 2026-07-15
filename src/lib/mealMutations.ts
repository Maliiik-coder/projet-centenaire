import type { MealEntry } from "@/lib/types";
import { canonicalizeTimestamp } from "@/lib/timestamps";

function canonicalizeMeal(meal: MealEntry): MealEntry {
  return {
    ...meal,
    createdAt: canonicalizeTimestamp(meal.createdAt),
  };
}

export function updateMealEntry(
  meals: MealEntry[],
  mealId: string,
  nextMeal: MealEntry,
): MealEntry[] {
  let updated = false;

  const nextMeals = meals.map((meal) => {
    if (meal.id !== mealId) {
      return meal;
    }

    updated = true;
    return {
      ...canonicalizeMeal(nextMeal),
      id: meal.id,
      createdAt: canonicalizeTimestamp(meal.createdAt),
    };
  });

  return updated ? nextMeals : meals;
}

export function deleteMealEntry(meals: MealEntry[], mealId: string): MealEntry[] {
  return meals.filter((meal) => meal.id !== mealId);
}

export function mergeMealsByCreatedAt(
  currentMeals: MealEntry[],
  incomingMeals: MealEntry[],
): MealEntry[] {
  const mealsByKey = new Map<string, MealEntry>();

  currentMeals.forEach((meal) => {
    const canonicalMeal = canonicalizeMeal(meal);
    mealsByKey.set(canonicalMeal.createdAt, canonicalMeal);
  });

  incomingMeals.forEach((meal) => {
    const canonicalMeal = canonicalizeMeal(meal);
    mealsByKey.set(canonicalMeal.createdAt, canonicalMeal);
  });

  return [...mealsByKey.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}
