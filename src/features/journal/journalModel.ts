import { calculateWeeklyAnalysis } from "@/lib/analytics";
import type {
  AppData,
  ISODate,
  MealEntry,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";

export type JournalViewMode = "days" | "weeks";

export type JournalDayEvent =
  | {
      createdAt: string;
      id: string;
      kind: "meal";
      meal: MealEntry;
      time: string;
    }
  | {
      createdAt: string;
      id: string;
      kind: "weight";
      time: string;
      weight: WeightEntry;
    }
  | {
      createdAt: string;
      id: string;
      kind: "smoking";
      smoking: SmokingEntry;
      time: string;
    };

type WeeklyAnalysis = ReturnType<typeof calculateWeeklyAnalysis>;

const snackTriggerLabels: Record<NonNullable<MealEntry["snackTrigger"]>, string> = {
  hunger: "Faim",
  boredom: "Ennui",
  stress: "Stress",
  habit: "Habitude",
  craving: "Envie",
  unsure: "Je ne sais pas",
};

const snackContextLabels: Record<NonNullable<MealEntry["snackContext"]>, string> = {
  hotel: "Hôtel",
  car: "Voiture",
  home: "Maison",
  work: "Travail",
  other: "Autre",
};

export function countJournalItems(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

export function buildJournalDayEvents(
  data: AppData,
  date: ISODate,
): JournalDayEvent[] {
  return [
    ...data.meals
      .filter((meal) => meal.date === date)
      .map((meal) => ({
        createdAt: meal.createdAt,
        id: meal.id,
        kind: "meal" as const,
        meal,
        time: meal.time,
      })),
    ...data.weights
      .filter((weight) => weight.date === date)
      .map((weight) => ({
        createdAt: weight.createdAt,
        id: weight.id,
        kind: "weight" as const,
        time: weight.time,
        weight,
      })),
    ...data.smokingEntries
      .filter((smoking) => smoking.date === date)
      .map((smoking) => ({
        createdAt: smoking.createdAt,
        id: smoking.id,
        kind: "smoking" as const,
        smoking,
        time: smoking.time,
      })),
  ].sort(
    (a, b) =>
      a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt),
  );
}

export function journalMealDetailLines(meal: MealEntry): string[] {
  const details = [];

  if (meal.starterTaken && meal.starterText) {
    details.push(`Entrée · ${meal.starterText}`);
  }

  if (meal.dessertTaken && meal.dessertText) {
    details.push(`Dessert · ${meal.dessertText}`);
  }

  if (meal.kind === "grignotage") {
    if (meal.snackTrigger) {
      details.push(snackTriggerLabels[meal.snackTrigger]);
    }
    if (meal.snackContext) {
      details.push(snackContextLabels[meal.snackContext]);
    }
  }

  return details;
}

function mealHasReservice(meal: MealEntry): boolean {
  if (
    meal.servingPattern === "once" ||
    meal.servingPattern === "multiple" ||
    meal.servingPattern === "buffet"
  ) {
    return true;
  }

  return meal.quantity === "two-plates" || meal.quantity === "three-plus-plates";
}

function mealStartedLowHunger(meal: MealEntry): boolean {
  return (
    meal.hungerBefore === "no" ||
    meal.hungerBefore === "not_really" ||
    meal.hungerBefore === "pas-faim"
  );
}

function mealEndedTooFull(meal: MealEntry): boolean {
  return (
    meal.fullnessAfter === "too_full" ||
    meal.fullnessAfter === "uncomfortable" ||
    meal.afterMeal === "trop-plein" ||
    meal.afterMeal === "inconfortable"
  );
}

export function buildJournalDayReflection(events: JournalDayEvent[]): {
  facts: string[];
  reading: string;
} {
  const meals = events
    .filter((event): event is Extract<JournalDayEvent, { kind: "meal" }> =>
      event.kind === "meal",
    )
    .map((event) => event.meal);
  const weights = events.filter((event) => event.kind === "weight");
  const smokingEvents = events.filter((event) => event.kind === "smoking");
  const reserviceMeals = meals.filter(mealHasReservice).length;
  const lowHungerMeals = meals.filter(mealStartedLowHunger).length;
  const tooFullMeals = meals.filter(mealEndedTooFull).length;
  const facts = [
    meals.length > 0
      ? countJournalItems(meals.length, "repas noté", "repas notés")
      : null,
    weights.length > 0 ? "poids renseigné" : null,
    smokingEvents.length > 0
      ? countJournalItems(
          smokingEvents.length,
          "événement tabac",
          "événements tabac",
        )
      : null,
  ].filter((fact): fact is string => fact !== null);

  if (meals.length === 0) {
    return {
      facts,
      reading:
        weights.length > 0
          ? "La journée contient surtout un repère de poids. Haru attend les repas pour relier ce chiffre au contexte."
          : "Haru a peu de matière pour lire cette journée.",
    };
  }

  if (reserviceMeals > 0 && tooFullMeals > 0) {
    return {
      facts,
      reading:
        "Le signal le plus utile à relire aujourd’hui est le lien entre resservice et sensation de trop plein.",
    };
  }

  if (reserviceMeals > 0) {
    return {
      facts,
      reading:
        "Le resservice apparaît dans la journée. Ce n’est pas un problème en soi, mais c’est un fait à suivre s’il revient.",
    };
  }

  if (lowHungerMeals > 0) {
    return {
      facts,
      reading:
        "Au moins un repas commence avec peu de faim réelle. Haru le garde comme point d’observation, pas comme conclusion.",
    };
  }

  if (tooFullMeals > 0) {
    return {
      facts,
      reading:
        "Au moins un repas se termine trop plein. La journée aide à repérer le volume ou le rythme du repas.",
    };
  }

  return {
    facts,
    reading:
      "La journée est renseignée sans signal dominant évident. Elle sert surtout de base de comparaison pour la suite.",
  };
}

export function buildWeeklyRhythms(
  analysis: WeeklyAnalysis,
  smokingEnabled: boolean,
): string[] {
  const rhythms = [];

  if (analysis.multiPlateMeals > 0) {
    rhythms.push(
      `${analysis.multiPlateMeals} repas avec resservice ou plusieurs passages.`,
    );
  }

  if (analysis.mealsStartedWithoutHunger > 0) {
    rhythms.push(
      `${analysis.mealsStartedWithoutHunger} repas avec peu de faim réelle au départ.`,
    );
  }

  if (analysis.mealsEndedTooFull > 0) {
    rhythms.push(`${analysis.mealsEndedTooFull} repas finissent trop plein.`);
  }

  if (analysis.snackingWithoutHunger > 0) {
    rhythms.push(
      countJournalItems(
        analysis.snackingWithoutHunger,
        "grignotage de contexte noté.",
        "grignotages de contexte notés.",
      ),
    );
  }

  if (smokingEnabled && analysis.smokingEntries > 0) {
    rhythms.push(
      countJournalItems(
        analysis.smokingEntries,
        "événement tabac noté.",
        "événements tabac notés.",
      ),
    );
  }

  return rhythms;
}

export function weeklyHypothesisText(
  analysis: WeeklyAnalysis,
  hasEnoughMealData: boolean,
): string {
  if (!hasEnoughMealData) {
    return "Haru attend encore quelques faits avant de proposer une hypothèse.";
  }

  if (analysis.priority.id === "maintenance") {
    return "Haru ne voit pas encore de signal principal à isoler cette semaine.";
  }

  const hypothesisLabel = analysis.priority.label
    .replace(/^Priorité\s+/i, "")
    .toLowerCase();

  return `Haru regarderait d’abord ${hypothesisLabel}, parce que ${analysis.priority.rationale.toLowerCase()}`;
}
