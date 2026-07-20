import { daysBetween, isWithinInclusive } from "@/lib/dates";
import type { MealItemNutritionContext } from "@/lib/nutrition/mealNutritionContext";
import type {
  FullnessAfter,
  HungerAtReservice,
  HungerBefore,
  ISODate,
  MealEntry,
  MealItemV2,
  ReserviceReason,
  ServingPattern,
} from "@/lib/types";

export const MEAL_ANALYSIS_CONTRACT_VERSION = 1;

export type MealAnalysisScope = "meal" | "day" | "week";
export type MealAnalysisStatus =
  | "insufficient_data"
  | "descriptive"
  | "hypothesis"
  | "experiment";
export type MealAnalysisConfidence = "low" | "medium" | "high";
export type MealAnalysisAxis =
  | "rhythm"
  | "meal_frequency"
  | "quantity_reservice"
  | "hunger_satiety"
  | "context"
  | "nutrition_context"
  | "data_quality";

export interface MealAnalysisFact {
  id: string;
  axis: MealAnalysisAxis;
  label: string;
  count?: number;
  denominator?: number;
  mealIds: string[];
  dates: ISODate[];
  value?: string | number | boolean | null;
}

export interface MealAnalysisEvidence {
  id: string;
  axis: MealAnalysisAxis;
  label: string;
  count: number;
  denominator: number;
  observationIds: string[];
  dates: ISODate[];
}

export interface MealAnalysisSignal {
  id: string;
  axis: MealAnalysisAxis;
  label: string;
  description: string;
}

export interface MealAnalysisHypothesis {
  id: string;
  axis: MealAnalysisAxis;
  statement: string;
  isHypothesis: true;
}

export interface MealAnalysisAction {
  id: string;
  title: string;
  description: string;
  verificationMetric: string;
  reviewAfterDays: number;
}

export interface MealAnalysisCompleteness {
  missingFields: string[];
  unknownFields: string[];
  unresolvedFoodItems: number;
  unestimatedFoodItems: number;
}

export interface MealAnalysisResult {
  version: typeof MEAL_ANALYSIS_CONTRACT_VERSION;
  scope: MealAnalysisScope;
  status: MealAnalysisStatus;
  period: {
    startDate: ISODate;
    endDate: ISODate;
  };
  mealIds: string[];
  facts: MealAnalysisFact[];
  mainSignal: MealAnalysisSignal | null;
  hypothesis: MealAnalysisHypothesis | null;
  evidence: MealAnalysisEvidence[];
  confidence: MealAnalysisConfidence;
  action: MealAnalysisAction | null;
  absenceReasons: string[];
  completeness: MealAnalysisCompleteness;
  nutritionDisplayPolicy: "internal_only";
}

export interface MealAnalysisOptions {
  profileStartDate?: ISODate | null;
  referenceDate?: ISODate;
  observationDays?: number;
  nutritionContexts?: MealItemNutritionContext[];
}

export interface DayMealAnalysisInput extends MealAnalysisOptions {
  date: ISODate;
  meals: MealEntry[];
}

export interface WeekMealAnalysisInput extends MealAnalysisOptions {
  weekStart: ISODate;
  weekEnd: ISODate;
  meals: MealEntry[];
  minimumMealCount?: number;
}

interface MealAnalysisCandidate {
  signal: MealAnalysisSignal;
  hypothesis: MealAnalysisHypothesis;
  evidence: MealAnalysisEvidence[];
  confidence: MealAnalysisConfidence;
  action: MealAnalysisAction;
}

const DEFAULT_OBSERVATION_DAYS = 7;
const DEFAULT_MINIMUM_WEEKLY_MEALS = 5;

export function analyzeMeal(
  meal: MealEntry,
  options: MealAnalysisOptions = {},
): MealAnalysisResult {
  const completeness = summarizeCompleteness([meal], options.nutritionContexts);
  const facts = buildFacts([meal], options.nutritionContexts);
  const absenceReasons = mealAbsenceReasons(meal, completeness);
  const isIncomplete =
    completeness.missingFields.includes("food_text") ||
    (absenceReasons.includes("missing_behavior_data") &&
      completeness.missingFields.includes("meal_structure") &&
      completeness.unknownFields.includes("hunger_before"));

  return {
    version: MEAL_ANALYSIS_CONTRACT_VERSION,
    scope: "meal",
    status: isIncomplete ? "insufficient_data" : "descriptive",
    period: { startDate: meal.date, endDate: meal.date },
    mealIds: [meal.id],
    facts,
    mainSignal: null,
    hypothesis: null,
    evidence: [],
    confidence: isIncomplete ? "low" : "medium",
    action: null,
    absenceReasons,
    completeness,
    nutritionDisplayPolicy: "internal_only",
  };
}

export function analyzeMealDay(
  input: DayMealAnalysisInput,
): MealAnalysisResult {
  const meals = input.meals.filter((meal) => meal.date === input.date);
  const completeness = summarizeCompleteness(meals, input.nutritionContexts);
  const facts = buildFacts(meals, input.nutritionContexts);
  const signal = buildDaySignal(meals);
  const absenceReasons =
    meals.length === 0
      ? ["no_meal_recorded"]
      : descriptiveAbsenceReasons(input, completeness);

  return {
    version: MEAL_ANALYSIS_CONTRACT_VERSION,
    scope: "day",
    status: meals.length === 0 ? "insufficient_data" : "descriptive",
    period: { startDate: input.date, endDate: input.date },
    mealIds: meals.map((meal) => meal.id),
    facts,
    mainSignal: signal,
    hypothesis: null,
    evidence: signal ? [buildDaySignalEvidence(signal.id, meals)] : [],
    confidence: meals.length >= 2 ? "medium" : "low",
    action: null,
    absenceReasons,
    completeness,
    nutritionDisplayPolicy: "internal_only",
  };
}

export function analyzeMealWeek(
  input: WeekMealAnalysisInput,
): MealAnalysisResult {
  const meals = input.meals.filter((meal) =>
    isWithinInclusive(meal.date, input.weekStart, input.weekEnd),
  );
  const completeness = summarizeCompleteness(meals, input.nutritionContexts);
  const facts = buildFacts(meals, input.nutritionContexts);
  const minimumMealCount = input.minimumMealCount ?? DEFAULT_MINIMUM_WEEKLY_MEALS;
  const observationPhase = isInObservationPhase(input);
  const absenceReasons = weeklyAbsenceReasons({
    mealCount: meals.length,
    minimumMealCount,
    observationPhase,
    completeness,
  });

  if (meals.length < minimumMealCount) {
    return baseWeekResult({
      input,
      meals,
      facts,
      completeness,
      status: "insufficient_data",
      confidence: "low",
      absenceReasons,
    });
  }

  const candidate = observationPhase ? null : selectWeeklyCandidate(meals);
  if (!candidate) {
    return baseWeekResult({
      input,
      meals,
      facts,
      completeness,
      status: "descriptive",
      confidence: observationPhase ? "medium" : "low",
      absenceReasons,
    });
  }

  return {
    version: MEAL_ANALYSIS_CONTRACT_VERSION,
    scope: "week",
    status: "experiment",
    period: { startDate: input.weekStart, endDate: input.weekEnd },
    mealIds: meals.map((meal) => meal.id),
    facts,
    mainSignal: candidate.signal,
    hypothesis: candidate.hypothesis,
    evidence: candidate.evidence,
    confidence: candidate.confidence,
    action: candidate.action,
    absenceReasons,
    completeness,
    nutritionDisplayPolicy: "internal_only",
  };
}

function baseWeekResult({
  input,
  meals,
  facts,
  completeness,
  status,
  confidence,
  absenceReasons,
}: {
  input: WeekMealAnalysisInput;
  meals: MealEntry[];
  facts: MealAnalysisFact[];
  completeness: MealAnalysisCompleteness;
  status: MealAnalysisStatus;
  confidence: MealAnalysisConfidence;
  absenceReasons: string[];
}): MealAnalysisResult {
  return {
    version: MEAL_ANALYSIS_CONTRACT_VERSION,
    scope: "week",
    status,
    period: { startDate: input.weekStart, endDate: input.weekEnd },
    mealIds: meals.map((meal) => meal.id),
    facts,
    mainSignal: null,
    hypothesis: null,
    evidence: [],
    confidence,
    action: null,
    absenceReasons,
    completeness,
    nutritionDisplayPolicy: "internal_only",
  };
}

function buildFacts(
  meals: MealEntry[],
  nutritionContexts?: MealItemNutritionContext[],
): MealAnalysisFact[] {
  if (meals.length === 0) return [];

  const reserviceMeals = meals.filter((meal) =>
    hasReservice(meal.servingPattern),
  );
  const lowReserviceHungerMeals = reserviceMeals.filter((meal) =>
    hasLowReserviceHunger(getMealReserviceHunger(meal)),
  );
  const startedWithoutHunger = meals.filter((meal) =>
    hasLowMealHunger(meal.hungerBefore),
  );
  const endedTooFull = meals.filter((meal) =>
    hasUncomfortableFullness(meal.fullnessAfter),
  );
  const recognizedItems = getMealItems(meals).filter(
    (item) => item.recognitionStatus === "confirmed" && item.ciqualCode,
  );
  const unresolvedItems = getUnresolvedFoodItems(meals);
  const estimatedItems = (nutritionContexts ?? []).filter(
    (context) => context.status === "estimated",
  );
  const facts: MealAnalysisFact[] = [
    {
      id: "meal_count",
      axis: "meal_frequency",
      label: `${meals.length} repas enregistrés`,
      count: meals.length,
      denominator: meals.length,
      mealIds: meals.map((meal) => meal.id),
      dates: uniqueDates(meals),
    },
    {
      id: "reservice_count",
      axis: "quantity_reservice",
      label: `${reserviceMeals.length} repas avec resservice ou plusieurs passages`,
      count: reserviceMeals.length,
      denominator: meals.length,
      mealIds: reserviceMeals.map((meal) => meal.id),
      dates: uniqueDates(reserviceMeals),
    },
    {
      id: "low_reservice_hunger_count",
      axis: "hunger_satiety",
      label: `${lowReserviceHungerMeals.length} resservice avec peu ou pas de faim déclarée`,
      count: lowReserviceHungerMeals.length,
      denominator: reserviceMeals.length,
      mealIds: lowReserviceHungerMeals.map((meal) => meal.id),
      dates: uniqueDates(lowReserviceHungerMeals),
    },
    {
      id: "low_start_hunger_count",
      axis: "hunger_satiety",
      label: `${startedWithoutHunger.length} repas commencés avec peu ou pas de faim`,
      count: startedWithoutHunger.length,
      denominator: meals.length,
      mealIds: startedWithoutHunger.map((meal) => meal.id),
      dates: uniqueDates(startedWithoutHunger),
    },
    {
      id: "too_full_count",
      axis: "hunger_satiety",
      label: `${endedTooFull.length} repas terminés trop plein ou inconfortables`,
      count: endedTooFull.length,
      denominator: meals.length,
      mealIds: endedTooFull.map((meal) => meal.id),
      dates: uniqueDates(endedTooFull),
    },
  ];

  if (recognizedItems.length > 0 || unresolvedItems.length > 0) {
    facts.push({
      id: "food_recognition_context",
      axis: "nutrition_context",
      label: `${recognizedItems.length} aliment(s) confirmé(s), ${unresolvedItems.length} non reconnu(s) ou non traité(s)`,
      count: recognizedItems.length,
      denominator: recognizedItems.length + unresolvedItems.length,
      mealIds: mealsWithItems(meals, [...recognizedItems, ...unresolvedItems]),
      dates: uniqueDates(meals),
    });
  }

  if (estimatedItems.length > 0) {
    facts.push({
      id: "internal_nutrition_estimate_context",
      axis: "nutrition_context",
      label: `${estimatedItems.length} aliment(s) avec contexte nutritionnel interne estimé`,
      count: estimatedItems.length,
      denominator: getMealItems(meals).length,
      mealIds: mealsWithItemIds(
        meals,
        estimatedItems.map((context) => context.itemId),
      ),
      dates: uniqueDates(meals),
    });
  }

  return facts;
}

function summarizeCompleteness(
  meals: MealEntry[],
  nutritionContexts?: MealItemNutritionContext[],
): MealAnalysisCompleteness {
  const missingFields = new Set<string>();
  const unknownFields = new Set<string>();

  meals.forEach((meal) => {
    if (!meal.mealStructure) missingFields.add("meal_structure");
    if (!meal.freeText.trim() && getMealItems([meal]).length === 0) {
      missingFields.add("food_text");
    }
    if (meal.hungerBefore === "unsure") unknownFields.add("hunger_before");
    if (
      hasReservice(meal.servingPattern) &&
      (!getMealReserviceHunger(meal) ||
        getMealReserviceHunger(meal) === "unsure")
    ) {
      unknownFields.add("hunger_at_reservice");
    }
  });

  const items = getMealItems(meals);
  const unresolvedFoodItems = getUnresolvedFoodItems(meals).length;
  const estimatedItemIds = new Set(
    (nutritionContexts ?? [])
      .filter((context) => context.status === "estimated")
      .map((context) => context.itemId),
  );
  const unestimatedFoodItems = nutritionContexts
    ? items.filter(
        (item) =>
          item.recognitionStatus === "confirmed" &&
          Boolean(item.ciqualCode) &&
          !estimatedItemIds.has(item.id),
      ).length
    : 0;

  return {
    missingFields: [...missingFields],
    unknownFields: [...unknownFields],
    unresolvedFoodItems,
    unestimatedFoodItems,
  };
}

function mealAbsenceReasons(
  meal: MealEntry,
  completeness: MealAnalysisCompleteness,
): string[] {
  const reasons = ["single_meal_no_trend"];
  if (
    completeness.missingFields.length > 0 ||
    completeness.unknownFields.length > 0
  ) {
    reasons.push("missing_behavior_data");
  }
  if (completeness.unresolvedFoodItems > 0) {
    reasons.push("food_text_not_recognized");
  }
  if (completeness.unestimatedFoodItems > 0) {
    reasons.push("nutrition_not_estimated");
  }
  if (isRichContext(meal) && isStableMeal(meal)) {
    reasons.push("composition_context_without_behavior_signal");
  }
  return reasons;
}

function descriptiveAbsenceReasons(
  input: MealAnalysisOptions,
  completeness: MealAnalysisCompleteness,
): string[] {
  const reasons: string[] = [];
  if (isInObservationPhase(input)) reasons.push("observation_phase");
  if (completeness.unresolvedFoodItems > 0) {
    reasons.push("food_text_not_recognized");
  }
  if (completeness.unestimatedFoodItems > 0) {
    reasons.push("nutrition_not_estimated");
  }
  if (completeness.missingFields.length || completeness.unknownFields.length) {
    reasons.push("incomplete_data");
  }
  return reasons;
}

function weeklyAbsenceReasons({
  mealCount,
  minimumMealCount,
  observationPhase,
  completeness,
}: {
  mealCount: number;
  minimumMealCount: number;
  observationPhase: boolean;
  completeness: MealAnalysisCompleteness;
}): string[] {
  const reasons: string[] = [];
  if (mealCount < minimumMealCount) reasons.push("not_enough_meals");
  if (observationPhase) reasons.push("observation_phase");
  if (completeness.unresolvedFoodItems > 0) {
    reasons.push("food_text_not_recognized");
  }
  if (completeness.unestimatedFoodItems > 0) {
    reasons.push("nutrition_not_estimated");
  }
  if (completeness.missingFields.length || completeness.unknownFields.length) {
    reasons.push("incomplete_data");
  }
  if (reasons.length === 0) reasons.push("no_repeated_signal");
  return reasons;
}

function buildDaySignal(meals: MealEntry[]): MealAnalysisSignal | null {
  const lowHungerReserviceMeals = meals.filter(
    (meal) =>
      hasReservice(meal.servingPattern) &&
      hasLowReserviceHunger(getMealReserviceHunger(meal)),
  );

  if (lowHungerReserviceMeals.length >= 2) {
    return {
      id: "day_reservice_without_hunger",
      axis: "quantity_reservice",
      label: "Resservice répété dans la journée",
      description:
        "Plusieurs repas de la journée comportent une reprise avec peu ou pas de faim déclarée.",
    };
  }

  return null;
}

function buildDaySignalEvidence(
  signalId: string,
  meals: MealEntry[],
): MealAnalysisEvidence {
  const matchingMeals = meals.filter(
    (meal) =>
      hasReservice(meal.servingPattern) &&
      hasLowReserviceHunger(getMealReserviceHunger(meal)),
  );

  return {
    id: `${signalId}_evidence`,
    axis: "quantity_reservice",
    label: `${matchingMeals.length} repas concernés sur ${meals.length}`,
    count: matchingMeals.length,
    denominator: meals.length,
    observationIds: matchingMeals.map((meal) => meal.id),
    dates: uniqueDates(matchingMeals),
  };
}

function selectWeeklyCandidate(
  meals: MealEntry[],
): MealAnalysisCandidate | null {
  return (
    reserviceWithoutHungerCandidate(meals) ??
    irregularRhythmCandidate(meals) ??
    repeatedDiscomfortCandidate(meals)
  );
}

function reserviceWithoutHungerCandidate(
  meals: MealEntry[],
): MealAnalysisCandidate | null {
  const reserviceMeals = meals.filter((meal) =>
    hasReservice(meal.servingPattern),
  );
  const matchingMeals = reserviceMeals.filter((meal) =>
    hasLowReserviceHunger(getMealReserviceHunger(meal)),
  );
  const foodAvailableMeals = matchingMeals.filter((meal) =>
    getMealReserviceReasons(meal).includes("food_available"),
  );

  if (matchingMeals.length < 3 || reserviceMeals.length < 3) return null;

  const ratio = matchingMeals.length / reserviceMeals.length;
  if (ratio < 0.5) return null;

  const contextLabel =
    foodAvailableMeals.length >= 2
      ? "et le plat restait disponible dans plusieurs cas"
      : "dans plusieurs repas comparables";

  return {
    signal: {
      id: "repeated_reservice_without_hunger",
      axis: "quantity_reservice",
      label: "Resservice répété sans faim nette",
      description: `${matchingMeals.length} resservices sur ${reserviceMeals.length} arrivent avec peu ou pas de faim, ${contextLabel}.`,
    },
    hypothesis: {
      id: "available_food_or_automatic_reservice",
      axis: "context",
      statement:
        "Hypothèse : la reprise dépend peut-être autant du contexte disponible que de la faim réelle.",
      isHypothesis: true,
    },
    evidence: [
      {
        id: "reservice_without_hunger_count",
        axis: "quantity_reservice",
        label: `${matchingMeals.length} resservices avec peu ou pas de faim sur ${reserviceMeals.length}`,
        count: matchingMeals.length,
        denominator: reserviceMeals.length,
        observationIds: matchingMeals.map((meal) => meal.id),
        dates: uniqueDates(matchingMeals),
      },
      {
        id: "food_available_count",
        axis: "context",
        label: `${foodAvailableMeals.length} repas mentionnent un plat encore disponible`,
        count: foodAvailableMeals.length,
        denominator: matchingMeals.length,
        observationIds: foodAvailableMeals.map((meal) => meal.id),
        dates: uniqueDates(foodAvailableMeals),
      },
    ],
    confidence: ratio >= 0.75 && matchingMeals.length >= 4 ? "high" : "medium",
    action: {
      id: "move_serving_dish_before_second_plate",
      title: "Tester une pause avant reprise",
      description:
        "Sur les prochains repas comparables, éloigner le plat ou attendre quelques minutes avant de décider de reprendre.",
      verificationMetric:
        "Comparer la part de repas avec reprise sans faim sur la semaine suivante.",
      reviewAfterDays: 7,
    },
  };
}

function irregularRhythmCandidate(
  meals: MealEntry[],
): MealAnalysisCandidate | null {
  const groups = groupComparableTimedMeals(meals);
  const variableGroup = groups.find(
    (group) =>
      group.meals.length >= 4 &&
      uniqueDates(group.meals).length >= 3 &&
      group.rangeMinutes >= 180,
  );

  if (!variableGroup) return null;

  return {
    signal: {
      id: "variable_meal_time",
      axis: "rhythm",
      label: "Horaires très variables",
      description: `${variableGroup.meals.length} repas ${variableGroup.kind} varient sur ${variableGroup.rangeMinutes} minutes.`,
    },
    hypothesis: {
      id: "rhythm_variability",
      axis: "rhythm",
      statement:
        "Hypothèse : l’horaire du repas varie assez pour mériter une observation dédiée.",
      isHypothesis: true,
    },
    evidence: [
      {
        id: "meal_time_range",
        axis: "rhythm",
        label: `${variableGroup.rangeMinutes} minutes d’écart observées`,
        count: variableGroup.rangeMinutes,
        denominator: variableGroup.meals.length,
        observationIds: variableGroup.meals.map((meal) => meal.id),
        dates: uniqueDates(variableGroup.meals),
      },
    ],
    confidence: variableGroup.meals.length >= 5 ? "medium" : "low",
    action: {
      id: "track_next_week_meal_anchor",
      title: "Tester un repère horaire",
      description:
        "Choisir un repas comparable et noter si un repère horaire plus stable change la faim ou la sensation après.",
      verificationMetric:
        "Comparer l’écart horaire et la sensation après sur les repas comparables de la semaine suivante.",
      reviewAfterDays: 7,
    },
  };
}

function repeatedDiscomfortCandidate(
  meals: MealEntry[],
): MealAnalysisCandidate | null {
  const matchingMeals = meals.filter(
    (meal) =>
      hasUncomfortableFullness(meal.fullnessAfter) &&
      hasReservice(meal.servingPattern),
  );

  if (matchingMeals.length < 3) return null;

  return {
    signal: {
      id: "repeated_reservice_discomfort",
      axis: "hunger_satiety",
      label: "Reprises suivies d’inconfort",
      description: `${matchingMeals.length} repas associent reprise et sensation de trop plein ou d’inconfort.`,
    },
    hypothesis: {
      id: "reservice_volume_discomfort",
      axis: "hunger_satiety",
      statement:
        "Hypothèse : le volume de la reprise contribue peut-être à la sensation finale, indépendamment du type d’aliment.",
      isHypothesis: true,
    },
    evidence: [
      {
        id: "reservice_discomfort_count",
        axis: "hunger_satiety",
        label: `${matchingMeals.length} repas concernés sur ${meals.length}`,
        count: matchingMeals.length,
        denominator: meals.length,
        observationIds: matchingMeals.map((meal) => meal.id),
        dates: uniqueDates(matchingMeals),
      },
    ],
    confidence: matchingMeals.length >= 4 ? "medium" : "low",
    action: {
      id: "reduce_second_serving_size",
      title: "Tester une reprise plus petite",
      description:
        "Sur le prochain repas comparable, garder le même plat mais réduire seulement la reprise ou attendre avant de la prendre.",
      verificationMetric:
        "Comparer la sensation finale après les repas avec reprise plus petite ou différée.",
      reviewAfterDays: 7,
    },
  };
}

function isInObservationPhase(input: MealAnalysisOptions): boolean {
  if (!input.profileStartDate) return false;

  const referenceDate = input.referenceDate ?? input.profileStartDate;
  const dayIndex = daysBetween(input.profileStartDate, referenceDate) + 1;
  const observationDays = input.observationDays ?? DEFAULT_OBSERVATION_DAYS;

  return dayIndex >= 1 && dayIndex <= observationDays;
}

function getMealItems(meals: MealEntry[]): MealItemV2[] {
  return meals.flatMap((meal) =>
    (meal.mealStructure?.sections ?? []).flatMap((section) =>
      section.passages.flatMap((passage) => passage.items),
    ),
  );
}

function getUnresolvedFoodItems(meals: MealEntry[]): MealItemV2[] {
  return getMealItems(meals).filter(
    (item) =>
      item.recognitionStatus === "unprocessed" ||
      item.recognitionStatus === "unrecognized" ||
      item.recognitionStatus === "ambiguous" ||
      !item.ciqualCode,
  );
}

function mealsWithItems(meals: MealEntry[], items: MealItemV2[]): string[] {
  return mealsWithItemIds(
    meals,
    items.map((item) => item.id),
  );
}

function mealsWithItemIds(meals: MealEntry[], itemIds: string[]): string[] {
  const idSet = new Set(itemIds);
  return meals
    .filter((meal) =>
      (meal.mealStructure?.sections ?? []).some((section) =>
        section.passages.some((passage) =>
          passage.items.some((item) => idSet.has(item.id)),
        ),
      ),
    )
    .map((meal) => meal.id);
}

function hasReservice(value: ServingPattern): boolean {
  return value === "once" || value === "multiple" || value === "buffet";
}

function hasLowMealHunger(value: HungerBefore): boolean {
  return value === "no" || value === "not_really" || value === "pas-faim";
}

function hasLowReserviceHunger(value: HungerAtReservice | null): boolean {
  return value === "no" || value === "not_really";
}

function hasUncomfortableFullness(value: FullnessAfter): boolean {
  return value === "too_full" || value === "uncomfortable";
}

function getMealReserviceHunger(meal: MealEntry): HungerAtReservice | null {
  return meal.mealStructure?.behavior.hungerAtReservice ?? null;
}

function getMealReserviceReasons(meal: MealEntry): ReserviceReason[] {
  return meal.mealStructure?.behavior.reserviceReasons ?? [];
}

function isStableMeal(meal: MealEntry): boolean {
  return (
    !hasReservice(meal.servingPattern) &&
    !hasLowMealHunger(meal.hungerBefore) &&
    meal.fullnessAfter === "fine"
  );
}

function isRichContext(meal: MealEntry): boolean {
  return Boolean(
    meal.components.fried ||
      meal.components.richSauce ||
      meal.components.ultraProcessed ||
      meal.components.dessert ||
      meal.components.sugaryDrink,
  );
}

function groupComparableTimedMeals(meals: MealEntry[]): {
  kind: string;
  meals: MealEntry[];
  rangeMinutes: number;
}[] {
  const groups = new Map<string, MealEntry[]>();
  meals
    .filter((meal) => meal.kind !== "grignotage")
    .forEach((meal) => {
      const current = groups.get(meal.kind) ?? [];
      groups.set(meal.kind, [...current, meal]);
    });

  return [...groups.entries()]
    .map(([kind, groupMeals]) => {
      const minutes = groupMeals
        .map((meal) => minutesFromTime(meal.time))
        .filter((value): value is number => value !== null);
      const rangeMinutes =
        minutes.length > 1 ? Math.max(...minutes) - Math.min(...minutes) : 0;

      return { kind, meals: groupMeals, rangeMinutes };
    })
    .sort((a, b) => b.rangeMinutes - a.rangeMinutes);
}

function minutesFromTime(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function uniqueDates(meals: MealEntry[]): ISODate[] {
  return [...new Set(meals.map((meal) => meal.date))].sort();
}
