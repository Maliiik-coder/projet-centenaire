import { addDays, isWithinInclusive, startOfWeek } from "@/lib/dates";
import type {
  ActivityEntry,
  AppData,
  EvidenceLevel,
  HungerBefore,
  MealAfter,
  MealComponents,
  Priority,
  ServedQuantity,
  SnackingAfter,
  StopReason,
  WeeklyAnalysis,
  WeightEntry,
} from "@/lib/types";
import { dedupeDailyWeights } from "@/lib/dataStabilization";

export const EMPTY_COMPONENTS: MealComponents = {
  proteins: false,
  vegetables: false,
  starches: false,
  fried: false,
  dessert: false,
  richSauce: false,
  ultraProcessed: false,
  sugaryDrink: false,
  zeroDrink: false,
  alcohol: false,
};

const componentKeywords: Array<{
  key: keyof MealComponents;
  words: string[];
}> = [
  {
    key: "proteins",
    words: ["steak", "poulet", "oeuf", "œuf", "thon", "poisson", "viande", "jambon"],
  },
  {
    key: "vegetables",
    words: ["salade", "haricot", "courgette", "tomate", "legume", "légume"],
  },
  {
    key: "starches",
    words: ["pate", "pâtes", "riz", "pain", "frites", "pomme de terre", "semoule"],
  },
  { key: "fried", words: ["frit", "frites", "beignet", "nuggets"] },
  { key: "dessert", words: ["dessert", "gateau", "gâteau", "glace", "tarte"] },
  {
    key: "richSauce",
    words: ["sauce", "mayonnaise", "fromage", "creme", "crème"],
  },
  {
    key: "ultraProcessed",
    words: ["burger", "pizza", "kebab", "chips", "nuggets", "sandwich industriel"],
  },
  {
    key: "sugaryDrink",
    words: ["coca", "soda", "jus", "ice tea", "limonade"],
  },
  { key: "zeroDrink", words: ["zero", "zéro", "light"] },
  { key: "alcohol", words: ["vin", "biere", "bière", "alcool", "whisky"] },
];

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function detectMealComponents(text: string): MealComponents {
  const normalized = text.toLowerCase();

  return componentKeywords.reduce<MealComponents>(
    (components, item) => ({
      ...components,
      [item.key]: item.words.some((word) => normalized.includes(word)),
    }),
    { ...EMPTY_COMPONENTS },
  );
}

export function buildImmediateFinding(
  quantity: ServedQuantity,
  hungerBefore: HungerBefore,
  afterMeal: MealAfter,
  snackingAfter: SnackingAfter,
  stopReason: StopReason = "rassasie",
) {
  const importantQuantity =
    quantity === "loaded-plate" ||
    quantity === "two-plates" ||
    quantity === "three-plus-plates";
  const multiPlate =
    quantity === "two-plates" || quantity === "three-plus-plates";
  const tooFull = afterMeal === "trop-plein" || afterMeal === "inconfortable";
  const importantSnacking = snackingAfter === "oui-important";
  const addSnackingSignal = (reading: string) =>
    importantSnacking
      ? `${reading} Le grignotage important après le repas ajoute aussi un signal à surveiller.`
      : reading;
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
    reading: addSnackingSignal(reading),
    nextAction,
    frictionPoint,
    evidenceLevel: "observation unique" as const,
  });

  if (
    quantity === "reasonable-plate" &&
    (hungerBefore === "vraie-faim" || hungerBefore === "tres-faim") &&
    afterMeal === "satisfait" &&
    (stopReason === "rassasie" || stopReason === "arret-volontaire") &&
    snackingAfter === "non"
  ) {
    return finding({
      fact: "Repas cohérent.",
      reading:
        "Rien dans cette observation ne signale un excès clair. Tu avais faim, tu termines satisfait, et tu n’as pas ajouté de grignotage.",
      nextAction: "Même structure au prochain repas comparable.",
      frictionPoint: "aucun signal fort",
    });
  }

  if (quantity === "loaded-plate" && tooFull) {
    return finding({
      fact: "Une seule assiette, mais poussée trop loin.",
      reading:
        "Le problème n’est pas le resservice. Le signal fort est le volume initial et la sensation après le repas.",
      nextAction:
        "Au prochain repas similaire : réduire légèrement la portion de départ.",
      frictionPoint: "portion initiale",
    });
  }

  if (hungerBefore === "pas-faim" && importantQuantity) {
    return finding({
      fact: "Repas peu guidé par la faim.",
      reading:
        "Le signal principal n’est pas l’aliment. C’est le fait de manger une quantité importante sans faim réelle.",
      nextAction:
        "Au prochain repas sans faim : réduire la portion de départ ou attendre 10 minutes avant de commencer.",
      frictionPoint: "faim réelle",
    });
  }

  if (multiPlate) {
    return finding({
      fact: "Resservice observé.",
      reading:
        "C’est exactement le type de comportement que l’application doit surveiller. Ce n’est pas dramatique, mais répété plusieurs fois par semaine, cela devient un frein probable.",
      nextAction:
        "Prochain repas comparable : une seule assiette, puis 15 minutes d’attente.",
      frictionPoint: "resservice",
    });
  }

  if (quantity === "loaded-plate" && afterMeal === "satisfait" && snackingAfter === "non") {
    return finding({
      fact: "Une assiette chargée, mais un repas cohérent.",
      reading:
        "Tu termines satisfait. Le volume initial est à surveiller, mais cette observation ne suffit pas à conclure à un excès problématique.",
      nextAction:
        "Ne corrige rien brutalement. Observe si ce type de portion revient souvent.",
      frictionPoint: "portion initiale",
    });
  }

  if (importantSnacking) {
    return finding({
      fact: "Grignotage sans faim ajouté.",
      reading:
        "Le contenu du repas compte moins ici que l’automatisme après le repas.",
      nextAction:
        "Identifier le déclencheur : ennui, stress, hôtel, voiture ou habitude.",
      frictionPoint: "contexte",
    });
  }

  if (tooFull) {
    return finding({
      fact: "Sensation de trop-plein observée.",
      reading:
        "Cette observation montre un signal de volume ou de rythme à surveiller, sans conclure à partir d’un seul repas.",
      nextAction:
        "Au prochain repas similaire : ralentir et réduire légèrement le volume de départ.",
      frictionPoint: "sensation après repas",
    });
  }

  return finding({
    fact: "Observation ajoutée.",
    reading:
      "Cette observation seule ne suffit pas à conclure. Elle devient utile si le même signal se répète.",
    nextAction: "Continue d'observer jusqu'à la fin de semaine.",
    frictionPoint: "observation",
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
      "Priorité quantité",
      getEvidenceLevel(multiPlateRatio),
      `${multiPlateMeals} repas sur ${mealCount} comportent deux assiettes ou plus.`,
      "Prochain repas comparable : une seule assiette, puis 15 minutes d’attente.",
      "alimentation",
    );
  }

  const loadedPlateRatio = loadedPlateMeals / mealCount;
  if (loadedPlateRatio >= 0.3) {
    return priority(
      "initial-portion",
      "Priorité portion initiale",
      getEvidenceLevel(loadedPlateRatio),
      `${loadedPlateMeals} repas sur ${mealCount} comportent une assiette très chargée.`,
      "Réduire légèrement la portion de départ au repas similaire suivant.",
      "alimentation",
    );
  }

  const noHungerRatio = mealsStartedWithoutHunger / mealCount;
  if (noHungerRatio >= 0.3) {
    return priority(
      "real-hunger",
      "Priorité faim réelle",
      getEvidenceLevel(noHungerRatio),
      `${mealsStartedWithoutHunger} repas sur ${mealCount} commencent sans faim.`,
      "Avant le prochain repas, noter le niveau de faim avant de servir.",
      "alimentation",
    );
  }

  const tooFullRatio = mealsEndedTooFull / mealCount;
  if (tooFullRatio >= 0.3) {
    return priority(
      "initial-portion",
      "Priorité portion initiale",
      getEvidenceLevel(tooFullRatio),
      `${mealsEndedTooFull} repas sur ${mealCount} se terminent trop plein.`,
      "Réduire légèrement le volume de départ au repas similaire suivant.",
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

function isTooFull(value: MealAfter): boolean {
  return value === "trop-plein" || value === "inconfortable";
}

function hasSnackingAfter(value: SnackingAfter): boolean {
  return value === "oui-leger" || value === "oui-important";
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
    (meal) =>
      meal.quantity === "reasonable-plate" || meal.quantity === "loaded-plate",
  ).length;
  const loadedPlateMeals = meals.filter(
    (meal) => meal.quantity === "loaded-plate",
  ).length;
  const multiPlateMeals = meals.filter(
    (meal) =>
      meal.quantity === "two-plates" || meal.quantity === "three-plus-plates",
  ).length;
  const mealsStartedWithoutHunger = meals.filter(
    (meal) => meal.hungerBefore === "pas-faim",
  ).length;
  const mealsEndedTooFull = meals.filter((meal) => isTooFull(meal.afterMeal)).length;
  const snackingWithoutHunger = meals.filter((meal) =>
    hasSnackingAfter(meal.snackingAfter),
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
    `${onePlateMeals} repas à une assiette`,
    `${loadedPlateMeals} assiette(s) très chargée(s)`,
    `${multiPlateMeals} repas à deux assiettes ou plus`,
    `${mealsStartedWithoutHunger} repas commencés sans faim`,
    `${mealsEndedTooFull} repas terminés trop plein`,
    `${snackingWithoutHunger} grignotage(s) sans faim`,
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
