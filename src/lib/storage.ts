import type {
  ActivityEntry,
  AppData,
  FrictionChoice,
  FullnessAfter,
  HungerBefore,
  ImmediateFinding,
  MealAfter,
  MealClarification,
  MealComponents,
  MealEntry,
  MealItemRecognitionStatus,
  MealPassageRelation,
  MealQuantityConfidence,
  MealQuantityUnit,
  MealStructureV2,
  ReserviceReason,
  Profile,
  QuestionnaireVersion,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SmokingEntry,
  SmokingGoal,
  SmokingStatus,
  SnackTrigger,
  SnackingAfter,
  StopReason,
  WeightEntry,
} from "@/lib/types";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import { validateImportedPayload } from "@/lib/dataValidation";
import {
  dedupeDailyWeights,
  stabilizeSmokingEntries,
} from "@/lib/dataStabilization";
import { normalizeMealKind } from "@/lib/mealKinds";
import { normalizeInitialBehaviorAssessment } from "@/lib/onboarding";
import { tryCanonicalizeTimestamp } from "@/lib/timestamps";

const LEGACY_STORAGE_KEY = "projet-centenaire-fieldbook-v0";
const STORAGE_KEY_PREFIX = "projet-centenaire-fieldbook-v1";
const LEGACY_QUARANTINE_KEY = `${STORAGE_KEY_PREFIX}:legacy-quarantine`;

export type StorageScope =
  | { kind: "guest" }
  | { kind: "user"; userId: string };

export type LocalDataEnvelope = {
  version: 1;
  ownerUserId: string | null;
  updatedAt: string;
  data: AppData;
};

export const guestStorageScope: StorageScope = { kind: "guest" };

export function userStorageScope(userId: string): StorageScope {
  return { kind: "user", userId };
}

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

function storageKey(scope: StorageScope): string {
  return scope.kind === "guest"
    ? `${STORAGE_KEY_PREFIX}:guest`
    : `${STORAGE_KEY_PREFIX}:user:${encodeURIComponent(scope.userId)}`;
}

function ownerForScope(scope: StorageScope): string | null {
  return scope.kind === "guest" ? null : scope.userId;
}

function createEnvelope(scope: StorageScope, data: AppData): LocalDataEnvelope {
  return {
    version: 1,
    ownerUserId: ownerForScope(scope),
    updatedAt: new Date().toISOString(),
    data: normalizeData(data),
  };
}

function normalizeEnvelope(value: unknown): LocalDataEnvelope | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }

  const ownerUserId =
    value.ownerUserId === null || typeof value.ownerUserId === "string"
      ? value.ownerUserId
      : null;

  return {
    version: 1,
    ownerUserId,
    updatedAt: asString(value.updatedAt, new Date().toISOString()),
    data: normalizeData(value.data),
  };
}

function envelopeMatchesScope(
  envelope: LocalDataEnvelope,
  scope: StorageScope,
): boolean {
  return envelope.ownerUserId === ownerForScope(scope);
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw);
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
    initialBehaviorAssessment: normalizeInitialBehaviorAssessment(
      value.initialBehaviorAssessment,
    ),
    smokingStatus: normalizeSmokingStatus(value.smokingStatus),
    smokingGoal: normalizeSmokingGoal(value.smokingGoal),
    showActiveMission:
      typeof value.showActiveMission === "boolean"
        ? value.showActiveMission
        : true,
    darkMode: typeof value.darkMode === "boolean" ? value.darkMode : false,
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
    value === "tres-faim" ||
    value === "yes" ||
    value === "not_really" ||
    value === "no" ||
    value === "unsure"
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
    value === "inconfortable" ||
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
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

function normalizeServingPattern(
  value: unknown,
  legacyQuantity: ServedQuantity,
): ServingPattern {
  if (
    value === "none" ||
    value === "once" ||
    value === "multiple" ||
    value === "buffet"
  ) {
    return value;
  }

  if (legacyQuantity === "two-plates") {
    return "once";
  }

  if (legacyQuantity === "three-plus-plates") {
    return "multiple";
  }

  return "none";
}

function normalizeFullness(value: unknown, legacyAfter: MealAfter): FullnessAfter {
  if (
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
  ) {
    return value;
  }

  if (legacyAfter === "encore-faim") {
    return "still_hungry";
  }

  if (legacyAfter === "trop-plein") {
    return "too_full";
  }

  if (legacyAfter === "inconfortable") {
    return "uncomfortable";
  }

  return "fine";
}

function normalizeSnackTrigger(value: unknown): SnackTrigger | null {
  return value === "hunger" ||
    value === "boredom" ||
    value === "stress" ||
    value === "habit" ||
    value === "craving" ||
    value === "unsure"
    ? value
    : null;
}

function normalizeSnackContext(value: unknown): SnackContext | null {
  return value === "hotel" ||
    value === "car" ||
    value === "home" ||
    value === "work" ||
    value === "other"
    ? value
    : null;
}

function normalizeQuestionnaireVersion(value: unknown): QuestionnaireVersion {
  if (value === "v2" || value === "v0.7") {
    return value;
  }

  return "legacy";
}

function normalizeClarifications(value: unknown): MealClarification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((item) => ({
    key: asString(item.key, "clarification"),
    question: asString(item.question, ""),
    value: typeof item.value === "string" ? item.value : null,
    customText: typeof item.customText === "string" ? item.customText : null,
  }));
}

function normalizeMealQuantityUnit(value: unknown): MealQuantityUnit {
  return value === "piece" ||
    value === "portion" ||
    value === "plate" ||
    value === "bowl" ||
    value === "glass" ||
    value === "slice" ||
    value === "spoon" ||
    value === "handful" ||
    value === "other" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeMealQuantityConfidence(value: unknown): MealQuantityConfidence {
  return value === "not_estimated" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
    ? value
    : "not_estimated";
}

function normalizeMealQuantity(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const amount = asNumber(value.amount, Number.NaN);

  return {
    amount: Number.isFinite(amount) ? amount : null,
    unit: normalizeMealQuantityUnit(value.unit),
    text: asString(value.text, "") || null,
    confidence: normalizeMealQuantityConfidence(value.confidence),
  };
}

function normalizeMealItemStatus(value: unknown): MealItemRecognitionStatus {
  return value === "recognized" ||
    value === "confirmed" ||
    value === "ambiguous" ||
    value === "unrecognized" ||
    value === "from_recipe_snapshot"
    ? value
    : "unprocessed";
}

function normalizeMealPassageRelation(value: unknown): MealPassageRelation | null {
  return value === "same" ||
    value === "partial" ||
    value === "side_only" ||
    value === "smaller" ||
    value === "other"
    ? value
    : null;
}

function normalizeReserviceReasons(value: unknown): ReserviceReason[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ReserviceReason =>
    item === "pleasure" ||
    item === "habit" ||
    item === "stress_emotion" ||
    item === "food_available" ||
    item === "avoid_waste" ||
    item === "others" ||
    item === "unsure",
  );
}

function normalizeMealStructure(value: unknown): MealStructureV2 | null {
  if (!isRecord(value) || value.version !== 2) {
    return null;
  }

  const sections = Array.isArray(value.sections) ? value.sections : [];
  const behavior = isRecord(value.behavior) ? value.behavior : {};

  return {
    version: 2,
    source:
      value.source === "legacy_adapter" ? "legacy_adapter" : "meal_tunnel_v2",
    sections: sections.filter(isRecord).map((section, sectionIndex) => ({
      id: asString(section.id, `section-${sectionIndex + 1}`),
      kind:
        section.kind === "starter" ||
        section.kind === "main" ||
        section.kind === "dessert" ||
        section.kind === "snack"
          ? section.kind
          : "main",
      rawText: asString(section.rawText),
      quantity: normalizeMealQuantity(section.quantity),
      passages: (Array.isArray(section.passages) ? section.passages : [])
        .filter(isRecord)
        .map((passage, passageIndex) => ({
          id: asString(passage.id, `passage-${sectionIndex + 1}-${passageIndex + 1}`),
          index: asNumber(passage.index, passageIndex + 1),
          relationToPrevious: normalizeMealPassageRelation(
            passage.relationToPrevious,
          ),
          relationText: asString(passage.relationText, "") || null,
          items: (Array.isArray(passage.items) ? passage.items : [])
            .filter(isRecord)
            .map((item, itemIndex) => ({
              id: asString(
                item.id,
                `item-${sectionIndex + 1}-${passageIndex + 1}-${itemIndex + 1}`,
              ),
              rawText: asString(item.rawText),
              recognitionStatus: normalizeMealItemStatus(item.recognitionStatus),
              canonicalName: asString(item.canonicalName, "") || null,
              ciqualCode: asString(item.ciqualCode, "") || null,
              confidence: Number.isFinite(item.confidence)
                ? (item.confidence as number)
                : null,
              quantity: normalizeMealQuantity(item.quantity),
            })),
        })),
    })),
    behavior: {
      hungerBefore: normalizeHunger(behavior.hungerBefore),
      fullnessAfter: normalizeFullness(
        behavior.fullnessAfter,
        normalizeAfter(behavior.fullnessAfter),
      ),
      hungerAtReservice:
        behavior.hungerAtReservice === "yes" ||
        behavior.hungerAtReservice === "not_really" ||
        behavior.hungerAtReservice === "no" ||
        behavior.hungerAtReservice === "unsure"
          ? behavior.hungerAtReservice
          : null,
      reserviceReasons: normalizeReserviceReasons(behavior.reserviceReasons),
    },
  };
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
  const createdAt = tryCanonicalizeTimestamp(asString(value.createdAt, ""));

  if (!date || !freeText || !createdAt) {
    return null;
  }

  const quantity = normalizeQuantity(value.quantity, value.plateCount);
  const hungerBefore = normalizeHunger(value.hungerBefore);
  const afterMeal = normalizeAfter(value.afterMeal);
  const servingPattern = normalizeServingPattern(value.servingPattern, quantity);
  const fullnessAfter = normalizeFullness(value.fullnessAfter, afterMeal);
  const snackingAfter = normalizeSnacking(value.snackingAfter);
  const components = isRecord(value.components)
    ? normalizeComponents(value.components)
    : { ...EMPTY_COMPONENTS };
  const mealStructure = normalizeMealStructure(value.mealStructure);
  const finding =
    normalizeFinding(value.finding) ??
    buildImmediateFinding({
      kind: normalizeMealKind(value.kind),
      servingPattern,
      hungerBefore,
      fullnessAfter,
      starterTaken: value.starterTaken === true,
      dessertTaken: value.dessertTaken === true,
      snackTrigger: normalizeSnackTrigger(value.snackTrigger),
      snackContext: normalizeSnackContext(value.snackContext),
      components,
    });

  return {
    id: asString(value.id, `meal-${Date.now()}`),
    date,
    time: asString(value.time, "12:30"),
    kind: normalizeMealKind(value.kind),
    freeText,
    quantity,
    servingPattern,
    hungerBefore,
    afterMeal,
    fullnessAfter,
    stopReason: normalizeStopReason(value.stopReason),
    snackingAfter,
    starterTaken: value.starterTaken === true,
    starterText: asString(value.starterText, "") || null,
    dessertTaken: value.dessertTaken === true,
    dessertText: asString(value.dessertText, "") || null,
    snackTrigger: normalizeSnackTrigger(value.snackTrigger),
    snackContext: normalizeSnackContext(value.snackContext),
    clarifications: normalizeClarifications(value.clarifications),
    questionnaireVersion: normalizeQuestionnaireVersion(value.questionnaireVersion),
    ...(mealStructure ? { mealStructure } : {}),
    components,
    finding,
    createdAt,
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

export function unwrapImportedPayload(value: unknown): unknown {
  if (isRecord(value) && value.version === 1 && "data" in value) {
    return value.data;
  }

  return value;
}

export function normalizeImportedData(value: unknown): AppData {
  const candidate = unwrapImportedPayload(value);
  validateImportedPayload(candidate);

  return normalizeData(candidate);
}

export const localDataStore = {
  quarantineLegacyData(): AppData | null {
    if (!isBrowser()) {
      return null;
    }

    let raw: string | null = null;

    try {
      raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      return null;
    }

    if (!raw) {
      return this.getLegacyQuarantine();
    }

    let data = createEmptyData();

    try {
      data = normalizeData(parseJson(raw));
      const envelope: LocalDataEnvelope = {
        version: 1,
        ownerUserId: null,
        updatedAt: new Date().toISOString(),
        data,
      };
      window.localStorage.setItem(LEGACY_QUARANTINE_KEY, JSON.stringify(envelope));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      return null;
    }

    return data;
  },

  getLegacyQuarantine(): AppData | null {
    if (!isBrowser()) {
      return null;
    }

    let raw: string | null = null;

    try {
      raw = window.localStorage.getItem(LEGACY_QUARANTINE_KEY);
    } catch {
      return null;
    }

    if (!raw) {
      return null;
    }

    try {
      const envelope = normalizeEnvelope(parseJson(raw));
      return envelope?.ownerUserId === null ? envelope.data : null;
    } catch {
      return null;
    }
  },

  clearLegacyQuarantine(): void {
    if (!isBrowser()) {
      return;
    }

    try {
      window.localStorage.removeItem(LEGACY_QUARANTINE_KEY);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  },

  load(scope: StorageScope): AppData {
    this.quarantineLegacyData();

    if (!isBrowser()) {
      return createEmptyData();
    }

    let raw: string | null = null;

    try {
      raw = window.localStorage.getItem(storageKey(scope));
    } catch {
      return createEmptyData();
    }

    if (!raw) {
      return createEmptyData();
    }

    try {
      const envelope = normalizeEnvelope(parseJson(raw));

      if (!envelope || !envelopeMatchesScope(envelope, scope)) {
        return createEmptyData();
      }

      return envelope.data;
    } catch {
      return createEmptyData();
    }
  },

  save(scope: StorageScope, data: AppData): void {
    if (!isBrowser()) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey(scope),
        JSON.stringify(createEnvelope(scope, data)),
      );
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  },

  import(scope: StorageScope, raw: string): AppData {
    const parsed = parseJson(raw);
    const imported = normalizeImportedData(parsed);

    this.save(scope, imported);
    return imported;
  },

  reset(scope: StorageScope): AppData {
    const data = createEmptyData();

    if (isBrowser()) {
      try {
        window.localStorage.removeItem(storageKey(scope));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }

    return data;
  },
};
