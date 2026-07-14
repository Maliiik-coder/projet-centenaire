import type { MealEntry } from "@/lib/types";

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
    return { ...nextMeal, id: meal.id, createdAt: meal.createdAt };
  });

  return updated ? nextMeals : meals;
}

export function deleteMealEntry(meals: MealEntry[], mealId: string): MealEntry[] {
  return meals.filter((meal) => meal.id !== mealId);
}
