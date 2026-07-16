import { getLatestWeight, isSmokingTrackingEnabled } from "@/lib/analytics";
import { daysBetween } from "@/lib/dates";
import { shouldShowActiveMission } from "@/lib/mission";
import {
  fullnessFromAfterMeal,
  fullnessLabels,
  hungerLabels,
  mealSectionQuantity,
  quantitySummary,
  reserviceHungerLabels,
  servingPatternFromQuantity,
  servingPatternLabels,
  snackContextLabels,
  snackTriggerLabels,
} from "@/features/meal/mealDraftModel";
import type {
  AppData,
  FrictionChoice,
  ISODate,
  MealEntry,
  SmokingDayState,
  SmokingEntry,
  WeeklyAnalysis,
} from "@/lib/types";

const smokingDayLabels: Record<SmokingDayState, string> = {
  aucun: "Aucun",
  envie: "Envie forte",
  cigarette: "Cigarette",
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

function initialPriorityText(friction: FrictionChoice): string {
  if (friction === "large-portions") {
    return "Observer les assiettes servies pendant 7 jours.";
  }

  if (friction === "snacking-without-hunger") {
    return "Observer les moments sans faim pendant 7 jours.";
  }

  if (friction === "low-activity") {
    return "Observer la régularité des journées pendant 7 jours.";
  }

  return "Note les repas et les sensations qui reviennent cette semaine.";
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "Données insuffisantes";
  }

  return `${value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })} kg`;
}

export function mealDetailLine(meal: MealEntry): string {
  const details = [];
  const servingPattern =
    meal.servingPattern ?? servingPatternFromQuantity(meal.quantity);
  const fullness = meal.fullnessAfter ?? fullnessFromAfterMeal(meal.afterMeal);
  const starterQuantity = quantitySummary(mealSectionQuantity(meal, "starter"));
  const mainQuantity = quantitySummary(
    mealSectionQuantity(meal, meal.kind === "grignotage" ? "snack" : "main"),
  );
  const dessertQuantity = quantitySummary(mealSectionQuantity(meal, "dessert"));

  if (meal.starterTaken && meal.starterText) {
    details.push(
      starterQuantity
        ? `Entrée · ${meal.starterText} · ${starterQuantity}`
        : `Entrée · ${meal.starterText}`,
    );
  }

  if (meal.dessertTaken && meal.dessertText) {
    details.push(
      dessertQuantity
        ? `Dessert · ${meal.dessertText} · ${dessertQuantity}`
        : `Dessert · ${meal.dessertText}`,
    );
  }

  if (meal.kind === "grignotage") {
    if (mainQuantity) details.push(mainQuantity);
    if (meal.snackTrigger) {
      details.push(snackTriggerLabels[meal.snackTrigger].toLowerCase());
    }
    if (meal.snackContext) {
      details.push(snackContextLabels[meal.snackContext].toLowerCase());
    }
  } else {
    if (mainQuantity) details.push(mainQuantity);
    details.push(servingPatternLabels[servingPattern].toLowerCase());
    details.push(hungerLabels[meal.hungerBefore].toLowerCase());
    if (meal.mealStructure?.behavior.hungerAtReservice) {
      details.push(
        `faim au resservice · ${
          reserviceHungerLabels[meal.mealStructure.behavior.hungerAtReservice]
        }`.toLowerCase(),
      );
    }
  }

  details.push(fullnessLabels[fullness].toLowerCase());
  return details.join(" · ");
}

export function mealTagLabels(): string[] {
  return [];
}

export function buildSmokingDaySummary(entries: SmokingEntry[]): string {
  if (entries.length === 0) {
    return "Non renseigné";
  }

  const cigaretteCount = entries.filter(
    (entry) => entry.state === "cigarette",
  ).length;
  if (cigaretteCount > 0) {
    return countLabel(cigaretteCount, "cigarette", "cigarettes");
  }

  const cravingCount = entries.filter((entry) => entry.state === "envie").length;
  if (cravingCount > 0) {
    return countLabel(cravingCount, "envie forte", "envies fortes");
  }

  return "Aucun";
}

export function smokingEntryLine(entry: SmokingEntry): string {
  return `${smokingDayLabels[entry.state]}${entry.note ? ` · ${entry.note}` : ""}`;
}

export function buildTodayViewModel(
  data: AppData,
  currentDate: ISODate,
  analysis: WeeklyAnalysis,
) {
  const profile = data.profile;
  if (!profile) return null;

  const todayMeals = data.meals.filter((meal) => meal.date === currentDate);
  const todayWeights = data.weights.filter(
    (weight) => weight.date === currentDate,
  );
  const todaySmokingEntries = data.smokingEntries.filter(
    (entry) => entry.date === currentDate,
  );
  const dayNumber = Math.max(1, daysBetween(profile.startDate, currentDate) + 1);
  const activePriorityText =
    analysis.priority.id === "insufficient-data"
      ? initialPriorityText(profile.initialFriction)
      : analysis.priority.action;

  return {
    activePriorityText,
    dayNumber,
    latestKnownWeight: getLatestWeight(data.weights),
    showMissionBlock: shouldShowActiveMission({
      showActiveMission: profile.showActiveMission,
      priority: analysis.priority,
      initialFriction: profile.initialFriction,
    }),
    smokingEnabled: isSmokingTrackingEnabled(data),
    smokingSummary: buildSmokingDaySummary(todaySmokingEntries),
    todayMeals,
    todaySmokingEntries,
    todayWeights,
  };
}
