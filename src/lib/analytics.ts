import { addDays, isWithinInclusive, startOfWeek } from "@/lib/dates";
import type {
  ActivityEntry,
  AppData,
  EvidenceLevel,
  FullnessAfter,
  HungerBefore,
  MealAfter,
  MealComponents,
  MealKind,
  Priority,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SnackingAfter,
  SnackTrigger,
  StopReason,
  WeeklyAnalysis,
  WeightEntry,
} from "@/lib/types";
import { dedupeDailyWeights } from "@/lib/dataStabilization";
import { EMPTY_COMPONENTS, detectMealComponents } from "@/lib/foodDetection";

export { EMPTY_COMPONENTS, detectMealComponents };

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface ImmediateFindingInput {
  kind: MealKind;
  servingPattern: ServingPattern;
  hungerBefore: HungerBefore;
  fullnessAfter: FullnessAfter;
  starterTaken?: boolean;
  dessertTaken?: boolean;
  snackTrigger?: SnackTrigger | null;
  snackContext?: SnackContext | null;
  components?: MealComponents;
}

function servingPatternFromQuantity(quantity: ServedQuantity): ServingPattern {
  if (quantity === "two-plates") {
    return "once";
  }

  if (quantity === "three-plus-plates") {
    return "multiple";
  }

  return "none";
}

function fullnessFromMealAfter(value: MealAfter): FullnessAfter {
  if (value === "still_hungry" || value === "fine" || value === "too_full" || value === "uncomfortable") {
    return value;
  }

  if (value === "encore-faim") {
    return "still_hungry";
  }

  if (value === "trop-plein") {
    return "too_full";
  }

  if (value === "inconfortable") {
    return "uncomfortable";
  }

  return "fine";
}

function hasLowHunger(value: HungerBefore): boolean {
  return value === "no" || value === "not_really" || value === "pas-faim";
}

function hasNoHunger(value: HungerBefore): boolean {
  return value === "no" || value === "pas-faim";
}

function isTooFull(value: FullnessAfter | MealAfter): boolean {
  return (
    value === "too_full" ||
    value === "uncomfortable" ||
    value === "trop-plein" ||
    value === "inconfortable"
  );
}

function hasReservice(value: ServingPattern): boolean {
  return value === "once" || value === "multiple" || value === "buffet";
}

function hasMultiplePassages(value: ServingPattern): boolean {
  return value === "multiple" || value === "buffet";
}

function isRichMeal(components?: MealComponents): boolean {
  return Boolean(
    components?.fried ||
      components?.richSauce ||
      components?.ultraProcessed ||
      components?.dessert,
  );
}

export function buildImmediateFinding(
  input: ImmediateFindingInput,
): {
  fact: string;
  reading: string;
  nextAction: string;
  frictionPoint: string;
  evidenceLevel: "observation unique";
};
export function buildImmediateFinding(
  quantity: ServedQuantity,
  hungerBefore: HungerBefore,
  afterMeal: MealAfter,
  snackingAfter: SnackingAfter,
  stopReason?: StopReason,
): {
  fact: string;
  reading: string;
  nextAction: string;
  frictionPoint: string;
  evidenceLevel: "observation unique";
};
export function buildImmediateFinding(
  inputOrQuantity: ImmediateFindingInput | ServedQuantity,
  legacyHungerBefore?: HungerBefore,
  legacyAfterMeal?: MealAfter,
) {
  const input =
    typeof inputOrQuantity === "string"
      ? {
          kind: "dejeuner" as const,
          servingPattern: servingPatternFromQuantity(inputOrQuantity),
          hungerBefore: legacyHungerBefore ?? "yes",
          fullnessAfter: fullnessFromMealAfter(legacyAfterMeal ?? "fine"),
          components: { ...EMPTY_COMPONENTS },
        }
      : inputOrQuantity;
  const tooFull = isTooFull(input.fullnessAfter);
  const lowHunger = hasLowHunger(input.hungerBefore);
  const noHunger = hasNoHunger(input.hungerBefore);
  const reservice = hasReservice(input.servingPattern);
  const multiplePassages = hasMultiplePassages(input.servingPattern);
  const richMeal = isRichMeal(input.components);
  const finding = ({
    fact,
    reading,
    nextAction,
    frictionPoint,
  }: {
    fact: string;
    reading: string;
    nextAction: string;
    frictionPoint: string;
  }) => ({
    fact,
    reading,
    nextAction,
    frictionPoint,
    evidenceLevel: "observation unique" as const,
  });

  if (input.kind === "grignotage") {
    if (
      input.snackContext === "hotel" &&
      (input.snackTrigger === "boredom" || input.snackTrigger === "habit")
    ) {
      return finding({
        fact: "Ce grignotage semble surtout lié au contexte.",
        reading: "Hôtel + ennui peut devenir une routine automatique.",
        nextAction:
          "Prévoir autre chose à faire avant de sortir la nourriture.",
        frictionPoint: "contexte",
      });
    }

    if (
      input.snackTrigger === "boredom" ||
      input.snackTrigger === "stress" ||
      input.snackTrigger === "habit"
    ) {
      return finding({
        fact: "Ce grignotage semble plus lié au contexte qu’à une vraie faim.",
        reading:
          "Le signal utile ici est le déclencheur, pas seulement ce qui a été mangé.",
        nextAction:
          "La prochaine fois, noter le lieu ou l’état juste avant de manger.",
        frictionPoint: "contexte",
      });
    }

    return finding({
      fact: "Grignotage noté.",
      reading: "Une observation seule ne suffit pas à conclure.",
      nextAction: "Regarder si le même déclencheur revient dans la semaine.",
      frictionPoint: "grignotage",
    });
  }

  if (lowHunger && input.dessertTaken && tooFull) {
    return finding({
      fact: "Tu n’avais pas vraiment faim et tu termines trop plein.",
      reading:
        "Le signal n’est pas seulement le dessert. C’est l’écart entre la faim de départ et le volume final.",
      nextAction:
        "Avant de commencer, attendre quelques minutes ou réduire ce qui accompagne le plat.",
      frictionPoint: "faim et volume",
    });
  }

  if (reservice && tooFull) {
    return finding({
      fact: "Tu t’es resservi et tu termines trop plein.",
      reading:
        "C’est un comportement important à observer. Répété plusieurs fois, il peut devenir un vrai frein.",
      nextAction: "Une portion, puis 10 à 15 minutes d’attente.",
      frictionPoint: "resservice",
    });
  }

  if (multiplePassages) {
    return finding({
      fact: "Plusieurs passages sont notés.",
      reading:
        "Le signal principal est le volume final, plus que le détail exact du plat.",
      nextAction:
        "La prochaine fois, choisir une première portion puis attendre avant de reprendre.",
      frictionPoint: "resservice",
    });
  }

  if (reservice) {
    return finding({
      fact: "Resservice noté.",
      reading:
        "Ce n’est pas un problème en soi. C’est un signal à suivre s’il revient souvent.",
      nextAction: "Au prochain repas comparable, attendre 10 à 15 minutes avant de reprendre.",
      frictionPoint: "resservice",
    });
  }

  if (lowHunger && richMeal) {
    return finding({
      fact: "Le repas commence avec peu de faim réelle.",
      reading:
        "Le plat n’est pas forcément le sujet. Le signal ici, c’est le départ avec peu de faim.",
      nextAction:
        "La prochaine fois, attendre quelques minutes avant de servir ou réduire l’accompagnement.",
      frictionPoint: "faim réelle",
    });
  }

  if (noHunger) {
    return finding({
      fact: "Repas noté sans vraie faim au départ.",
      reading:
        "Cette observation ne suffit pas à conclure, mais c’est un signal à suivre.",
      nextAction: "Au prochain cas similaire, attendre 10 minutes avant de commencer.",
      frictionPoint: "faim réelle",
    });
  }

  if (input.starterTaken && input.dessertTaken && richMeal && tooFull) {
    return finding({
      fact: "Entrée, dessert et repas riche finissent trop plein.",
      reading:
        "Le signal utile est l’accumulation, pas un aliment isolé.",
      nextAction: "La prochaine fois, choisir l’entrée ou le dessert, pas forcément les deux.",
      frictionPoint: "volume final",
    });
  }

  if (tooFull) {
    return finding({
      fact: "Tu termines trop plein.",
      reading:
        "Cette observation montre un signal de volume ou de rythme à surveiller, sans conclure à partir d’un seul repas.",
      nextAction: "Au prochain repas comparable, ralentir et réduire légèrement le départ.",
      frictionPoint: "sensation après repas",
    });
  }

  if (input.fullnessAfter === "still_hungry") {
    return finding({
      fact: "Tu termines avec encore faim.",
      reading:
        "Le signal n’est pas un excès ici. C’est plutôt un repas qui n’a peut-être pas assez couvert la faim du moment.",
      nextAction:
        "Regarder si une faim revient vite après ce type de repas.",
      frictionPoint: "satiété",
    });
  }

  if (!lowHunger && !reservice && input.fullnessAfter === "fine") {
    return finding({
      fact: "Repas stable noté.",
      reading:
        "Faim présente, pas de resservice, sensation correcte après : rien d’évident à corriger sur cette observation.",
      nextAction:
        "Garder ce repas comme repère et regarder ce qui change sur les prochains repas comparables.",
      frictionPoint: "repère",
    });
  }

  return finding({
    fact: "Repas noté.",
    reading:
      "Je ne vois pas de signal fort sur ce repas isolé. C’est utile comme point de comparaison, pas comme conclusion.",
    nextAction:
      "Continuer à noter les repas comparables pour faire ressortir les répétitions.",
    frictionPoint: "repère",
  });
}

function getEvidenceLevel(ratio: number): EvidenceLevel {
  if (ratio >= 0.5) {
    return "tendance confirmée";
  }

  if (ratio >= 0.3) {
    return "tendance";
  }

  return "signal faible";
}

function priority(
  id: Priority["id"],
  label: string,
  evidenceLevel: EvidenceLevel,
  rationale: string,
  action: string,
  domain: Priority["domain"],
): Priority {
  return { id, label, evidenceLevel, rationale, action, domain };
}

export function calculatePriority({
  mealCount,
  multiPlateMeals,
  loadedPlateMeals,
  mealsStartedWithoutHunger,
  mealsEndedTooFull,
  snackingWithoutHunger,
}: {
  mealCount: number;
  multiPlateMeals: number;
  loadedPlateMeals: number;
  mealsStartedWithoutHunger: number;
  mealsEndedTooFull: number;
  snackingWithoutHunger: number;
}): Priority {
  if (mealCount < 5) {
    return priority(
      "insufficient-data",
      "Données insuffisantes",
      "données insuffisantes",
      "Moins de cinq repas sont disponibles cette semaine.",
      "Ajouter les prochains repas au carnet sans corriger brutalement.",
      "observation",
    );
  }

  const multiPlateRatio = multiPlateMeals / mealCount;
  if (multiPlateRatio >= 0.3) {
    return priority(
      "quantity",
      "Priorité resservice",
      getEvidenceLevel(multiPlateRatio),
      `${multiPlateMeals} repas sur ${mealCount} comportent un resservice ou plusieurs passages.`,
      "Prochain repas comparable : une portion, puis 10 à 15 minutes d’attente.",
      "alimentation",
    );
  }

  const loadedPlateRatio = loadedPlateMeals / mealCount;
  if (loadedPlateRatio >= 0.3) {
    return priority(
      "initial-portion",
      "Priorité volume final",
      getEvidenceLevel(loadedPlateRatio),
      `${loadedPlateMeals} repas sur ${mealCount} comportent plusieurs passages ou un volume marqué.`,
      "Réduire le départ ou attendre avant de reprendre au repas similaire suivant.",
      "alimentation",
    );
  }

  if (snackingWithoutHunger >= 2) {
    return priority(
      "context",
      "Priorité contexte",
      snackingWithoutHunger >= 3 ? "tendance confirmée" : "tendance",
      `${snackingWithoutHunger} épisodes de grignotage sans faim sont notés.`,
      "Noter le lieu et l’heure du prochain épisode avant toute correction.",
      "alimentation",
    );
  }

  const noHungerRatio = mealsStartedWithoutHunger / mealCount;
  if (noHungerRatio >= 0.3) {
    return priority(
      "real-hunger",
      "Priorité faim réelle",
      getEvidenceLevel(noHungerRatio),
      `${mealsStartedWithoutHunger} repas sur ${mealCount} commencent sans vraie faim.`,
      "Avant le prochain repas, noter le niveau de faim avant de servir.",
      "alimentation",
    );
  }

  const tooFullRatio = mealsEndedTooFull / mealCount;
  if (tooFullRatio >= 0.3) {
    return priority(
      "initial-portion",
      "Priorité volume final",
      getEvidenceLevel(tooFullRatio),
      `${mealsEndedTooFull} repas sur ${mealCount} se terminent trop plein.`,
      "Réduire légèrement le volume de départ au repas similaire suivant.",
      "alimentation",
    );
  }

  return priority(
    "maintenance",
    "Priorité maintien",
    "signal faible",
    "Aucun signal principal ne dépasse les seuils de la V0.",
    "Continuer le carnet jusqu'au prochain bilan de semaine.",
    "observation",
  );
}

function getAverageWeight(weights: WeightEntry[]): number | null {
  if (weights.length < 2) {
    return null;
  }

  return roundOne(
    weights.reduce((sum, entry) => sum + entry.weightKg, 0) / weights.length,
  );
}

export function calculateWeeklyAnalysis(
  data: AppData,
  today: string,
): WeeklyAnalysis {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const meals = data.meals.filter((meal) =>
    isWithinInclusive(meal.date, weekStart, weekEnd),
  );
  const weights = dedupeDailyWeights(data.weights).filter((weight) =>
    isWithinInclusive(weight.date, weekStart, weekEnd),
  );
  const smokingEntries = data.smokingEntries.filter((entry) =>
    isWithinInclusive(entry.date, weekStart, weekEnd),
  );

  const mealCount = meals.length;
  const onePlateMeals = meals.filter(
    (meal) => !hasReservice(meal.servingPattern ?? servingPatternFromQuantity(meal.quantity)),
  ).length;
  const loadedPlateMeals = meals.filter(
    (meal) =>
      hasMultiplePassages(meal.servingPattern ?? servingPatternFromQuantity(meal.quantity)) ||
      meal.quantity === "loaded-plate",
  ).length;
  const multiPlateMeals = meals.filter(
    (meal) =>
      hasReservice(meal.servingPattern ?? servingPatternFromQuantity(meal.quantity)) ||
      meal.quantity === "two-plates" ||
      meal.quantity === "three-plus-plates",
  ).length;
  const mealsStartedWithoutHunger = meals.filter(
    (meal) => hasLowHunger(meal.hungerBefore),
  ).length;
  const mealsEndedTooFull = meals.filter((meal) =>
    isTooFull(meal.fullnessAfter ?? meal.afterMeal),
  ).length;
  const snackingWithoutHunger = meals.filter((meal) =>
    meal.kind === "grignotage" &&
    (meal.snackTrigger === "boredom" ||
      meal.snackTrigger === "stress" ||
      meal.snackTrigger === "habit" ||
      hasLowHunger(meal.hungerBefore)),
  ).length;
  const activityGoal = data.profile?.weeklyActivityGoal ?? 5;
  const smokeFreeDates = new Set(
    smokingEntries
      .filter((entry) => entry.state === "aucun")
      .map((entry) => entry.date),
  );
  const currentPriority = calculatePriority({
    mealCount,
    multiPlateMeals,
    loadedPlateMeals,
    mealsStartedWithoutHunger,
    mealsEndedTooFull,
    snackingWithoutHunger,
  });
  const facts = [
    `${mealCount} repas enregistrés`,
    `${onePlateMeals} repas sans resservice`,
    `${loadedPlateMeals} repas à plusieurs passages`,
    `${multiPlateMeals} repas avec resservice`,
    `${mealsStartedWithoutHunger} repas commencés sans vraie faim`,
    `${mealsEndedTooFull} repas terminés trop plein`,
    `${snackingWithoutHunger} grignotage(s) de contexte`,
  ];

  return {
    weekStart,
    weekEnd,
    mealCount,
    onePlateMeals,
    multiPlateMeals,
    mealsStartedWithoutHunger,
    mealsEndedTooFull,
    snackingWithoutHunger,
    activitiesCompleted: 0,
    activityGoal,
    weightAverageKg: getAverageWeight(weights),
    smokingEntries: smokingEntries.length,
    smokeFreeDays: smokeFreeDates.size,
    facts,
    frictionPoint:
      currentPriority.id === "insufficient-data"
        ? "Données insuffisantes"
        : currentPriority.label,
    priority: currentPriority,
  };
}

export function isActivityCompleted(activity?: ActivityEntry | null): boolean {
  if (!activity) {
    return false;
  }

  return activity.sessionCompleted;
}

export function isSmokingTrackingEnabled(data: AppData): boolean {
  return (
    data.profile?.smokingStatus !== undefined &&
    data.profile.smokingStatus !== "non-renseigne" &&
    data.profile.smokingStatus !== "non" &&
    data.profile.smokingGoal !== undefined &&
    data.profile.smokingGoal !== "pas-maintenant"
  );
}

export function getLatestWeight(weights: WeightEntry[]): WeightEntry | null {
  return [...weights].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
