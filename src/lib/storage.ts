import type {
  ActivityEntry,
  AppData,
  FrictionChoice,
  HungerBefore,
  ImmediateFinding,
  MealAfter,
  MealComponents,
  MealEntry,
  MealKind,
  Profile,
  ServedQuantity,
  SmokingEntry,
  SmokingGoal,
  SmokingStatus,
  SnackingAfter,
  StopReason,
  WeightEntry,
} from "@/lib/types";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import {
  dedupeDailyWeights,
  stabilizeSmokingEntries,
} from "@/lib/dataStabilization";

const STORAGE_KEY = "projet-centenaire-fieldbook-v0";

export function createEmptyData(): AppData {
  return {
    profile: null,
    weights: [],
    meals: [],
    activities: [],
    smokingEntries: [],
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeFriction(value: unknown): FrictionChoice {
  return value === "large-portions" ||
    value === "snacking-without-hunger" ||
    value === "habit-meals" ||
    value === "low-activity" ||
    value === "irregularity" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeSmokingStatus(value: unknown): SmokingStatus {
  return value === "non-renseigne" ||
    value === "non" ||
    value === "occasionnellement" ||
    value === "tous-les-jours" ||
    value === "arrete"
    ? value
    : "non-renseigne";
}

function normalizeSmokingGoal(value: unknown): SmokingGoal | undefined {
  return value === "arreter" ||
    value === "reduire" ||
    value === "observer" ||
    value === "pas-maintenant"
    ? value
    : undefined;
}

function normalizeProfile(value: unknown): Profile | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    firstName: asString(value.firstName, ""),
    age: Math.max(0, Math.round(asNumber(value.age, 0))),
    heightCm: Math.max(0, Math.round(asNumber(value.heightCm, 0))),
    startWeightKg: asNumber(value.startWeightKg, 0),
    goalWeightKg: asNumber(value.goalWeightKg, 0),
    startDate: asString(value.startDate, ""),
    initialFriction: normalizeFriction(value.initialFriction),
    smokingStatus: normalizeSmokingStatus(value.smokingStatus),
    smokingGoal: normalizeSmokingGoal(value.smokingGoal),
    weeklyActivityGoal: Math.min(
      7,
      Math.max(1, Math.round(asNumber(value.weeklyActivityGoal, 5))),
    ),
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

function normalizeArray<T>(
  value: unknown,
  normalizer: (item: unknown) => T | null,
): T[] {
  return Array.isArray(value)
    ? value.map(normalizer).filter((item): item is T => item !== null)
    : [];
}

function normalizeWeight(value: unknown): WeightEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const weightKg = asNumber(value.weightKg, Number.NaN);

  if (!Number.isFinite(weightKg)) {
    return null;
  }

  return {
    id: asString(value.id, `weight-${Date.now()}`),
    date: asString(value.date, ""),
    time: asString(value.time, "08:00"),
    weightKg,
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

function normalizeMealKind(value: unknown): MealKind {
  if (
    value === "dejeuner" ||
    value === "diner" ||
    value === "collation" ||
    value === "autre"
  ) {
    return value;
  }

  return "autre";
}

function normalizeQuantity(value: unknown, legacyPlateCount: unknown): ServedQuantity {
  if (
    value === "reasonable-plate" ||
    value === "loaded-plate" ||
    value === "two-plates" ||
    value === "three-plus-plates"
  ) {
    return value;
  }

  if (legacyPlateCount === "2") {
    return "two-plates";
  }

  if (legacyPlateCount === "3+") {
    return "three-plus-plates";
  }

  return "reasonable-plate";
}

function normalizeHunger(value: unknown): HungerBefore {
  if (
    value === "pas-faim" ||
    value === "petite-faim" ||
    value === "vraie-faim" ||
    value === "tres-faim"
  ) {
    return value;
  }

  if (value === "un-peu") {
    return "petite-faim";
  }

  if (value === "faim") {
    return "vraie-faim";
  }

  return "vraie-faim";
}

function normalizeAfter(value: unknown): MealAfter {
  if (
    value === "encore-faim" ||
    value === "satisfait" ||
    value === "trop-plein" ||
    value === "inconfortable"
  ) {
    return value;
  }

  if (value === "bien") {
    return "satisfait";
  }

  if (value === "tres-inconfortable") {
    return "inconfortable";
  }

  return "satisfait";
}

function normalizeStopReason(value: unknown): StopReason {
  if (
    value === "rassasie" ||
    value === "assiette-vide" ||
    value === "arret-volontaire" ||
    value === "contrainte-exterieure"
  ) {
    return value;
  }

  if (value === "plus-faim") {
    return "rassasie";
  }

  return "rassasie";
}

function normalizeSnacking(value: unknown): SnackingAfter {
  if (value === "non" || value === "oui-leger" || value === "oui-important") {
    return value;
  }

  if (value === "un-peu") {
    return "oui-leger";
  }

  if (value === "beaucoup") {
    return "oui-important";
  }

  return "non";
}

function normalizeComponents(value: unknown): MealComponents {
  const record = isRecord(value) ? value : {};

  return {
    proteins: record.proteins === true,
    vegetables: record.vegetables === true,
    starches: record.starches === true,
    fried: record.fried === true,
    dessert: record.dessert === true,
    richSauce: record.richSauce === true,
    ultraProcessed: record.ultraProcessed === true,
    sugaryDrink: record.sugaryDrink === true,
    zeroDrink: record.zeroDrink === true,
    alcohol: record.alcohol === true,
  };
}

function normalizeFinding(value: unknown): ImmediateFinding | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    fact: asString(value.fact, ""),
    reading: asString(value.reading, ""),
    nextAction: asString(value.nextAction, ""),
    frictionPoint: asString(value.frictionPoint, "observation"),
    evidenceLevel: "observation unique",
  };
}

function normalizeMeal(value: unknown): MealEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const date = asString(value.date, "");
  const freeText = asString(value.freeText, "");

  if (!date || !freeText) {
    return null;
  }

  const quantity = normalizeQuantity(value.quantity, value.plateCount);
  const hungerBefore = normalizeHunger(value.hungerBefore);
  const afterMeal = normalizeAfter(value.afterMeal);
  const snackingAfter = normalizeSnacking(value.snackingAfter);
  const finding =
    normalizeFinding(value.finding) ??
    buildImmediateFinding(
      quantity,
      hungerBefore,
      afterMeal,
      snackingAfter,
      normalizeStopReason(value.stopReason),
    );

  return {
    id: asString(value.id, `meal-${Date.now()}`),
    date,
    time: asString(value.time, "12:30"),
    kind: normalizeMealKind(value.kind),
    freeText,
    quantity,
    hungerBefore,
    afterMeal,
    stopReason: normalizeStopReason(value.stopReason),
    snackingAfter,
    components: isRecord(value.components)
      ? normalizeComponents(value.components)
      : { ...EMPTY_COMPONENTS },
    finding,
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

function normalizeActivity(value: unknown): ActivityEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const completedExerciseIds = Array.isArray(value.completedExerciseIds)
    ? value.completedExerciseIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  return {
    id: asString(value.id, `activity-${Date.now()}`),
    date: asString(value.date, ""),
    time: asString(value.time, "18:00"),
    title: asString(value.title, "Activité"),
    completedExerciseIds,
    sessionCompleted: value.sessionCompleted === true,
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

function normalizeSmoking(value: unknown): SmokingEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const state =
    value.state === "aucun" || value.state === "envie" || value.state === "cigarette"
      ? value.state
      : "aucun";

  return {
    id: asString(value.id, `smoking-${Date.now()}`),
    date: asString(value.date, ""),
    time: asString(value.time, "20:00"),
    state,
    note: typeof value.note === "string" ? value.note : undefined,
    createdAt: asString(value.createdAt, new Date().toISOString()),
  };
}

export function normalizeData(value: unknown): AppData {
  if (!isRecord(value)) {
    return createEmptyData();
  }

  return {
    profile: normalizeProfile(value.profile),
    weights: dedupeDailyWeights(normalizeArray(value.weights, normalizeWeight)),
    meals: normalizeArray(value.meals, normalizeMeal).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
    activities: normalizeArray(value.activities, normalizeActivity).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
    smokingEntries: stabilizeSmokingEntries(
      normalizeArray(value.smokingEntries, normalizeSmoking),
    ),
  };
}

export const localDataStore = {
  load(): AppData {
    if (!isBrowser()) {
      return createEmptyData();
    }

    let raw: string | null = null;

    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return createEmptyData();
    }

    if (!raw) {
      return createEmptyData();
    }

    try {
      return normalizeData(JSON.parse(raw));
    } catch {
      return createEmptyData();
    }
  },

  save(data: AppData): void {
    if (!isBrowser()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  },

  import(raw: string): AppData {
    const data = normalizeData(JSON.parse(raw) as unknown);
    this.save(data);
    return data;
  },

  reset(): AppData {
    const data = createEmptyData();

    if (isBrowser()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }

    return data;
  },
};
