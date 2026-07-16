"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cigarette,
  Download,
  Dumbbell,
  LineChart,
  PenLine,
  RefreshCw,
  Scale,
  Settings2,
  Upload,
} from "lucide-react";
import {
  EMPTY_COMPONENTS,
  buildImmediateFinding,
  calculateWeeklyAnalysis,
  getLatestWeight,
  isSmokingTrackingEnabled,
  roundOne,
} from "@/lib/analytics";
import {
  addDays,
  calculateAgeOnDate,
  daysBetween,
  formatLongDate,
  formatShortDate,
  shouldUpdateCurrentDate,
  startOfWeek,
  todayISO,
} from "@/lib/dates";
import {
  dedupeDailyWeights,
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
import { isCurrentCloudAttempt } from "@/lib/cloudAttempt";
import {
  CLOUD_RECOVERY_DELAY_MS,
  withCloudReadTimeout,
} from "@/lib/cloudRead";
import { activeMealKindLabels, mealKindLabels } from "@/lib/mealKinds";
import {
  deleteMealEntry,
  updateMealEntry,
} from "@/lib/mealMutations";
import {
  getMealTunnelStepIds,
  type MealTunnelStepId,
} from "@/lib/mealTunnel";
import {
  detectMealComponents,
  getClarificationChoices,
  mergeDetectedClarifications,
} from "@/lib/foodDetection";
import { shouldShowActiveMission } from "@/lib/mission";
import {
  INITIAL_OBSERVATION_MEAL_MESSAGE,
  isInitialObservationDay,
} from "@/lib/observationPhase";
import {
  APP_RESUME_PARAM,
  APP_RESUME_TAB_PARAM,
  appResumePath,
  clearLocalEntryMode,
  isLocalEntryModeSelected,
  onboardingEntryPath,
  ONBOARDING_START_PARAM,
} from "@/lib/entryMode";
import {
  behaviorHypothesisText,
  buildInitialBehaviorAssessment,
  calculateBmi,
  calculateReferenceGoalWeight,
  classifyAdultBmi,
  legacyFrictionFromAssessment,
  toggleExclusiveSelection,
} from "@/lib/onboarding";
import {
  buildProfilePatch,
  createProfileMutationDraft,
  createProfilePatchMutationDraft,
  createSmokingMutationDraft,
  createWeightMutationDraft,
} from "@/lib/nonMealData";
import { mergeImportedData } from "@/lib/importData";
import { ImportValidationError } from "@/lib/dataValidation";
import { materializePendingCloudState } from "@/lib/pendingCloudState";
import {
  createEmptyData,
  guestStorageScope,
  localDataStore,
  normalizeData,
  userStorageScope,
} from "@/lib/storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WeightTrendChart } from "@/components/WeightTrendChart";
import { AppHeader } from "@/components/centenaire/AppHeader";
import { BottomNav } from "@/components/centenaire/BottomNav";
import {
  LAUNCH_LOADING_DURATION_MS,
  LAUNCH_READY_DELAY_MS,
  LaunchScreen,
  type LaunchStage,
} from "@/components/centenaire/LaunchScreen";
import {
  OnboardingLayout,
  OnboardingQuestion,
} from "@/components/centenaire/OnboardingLayout";
import {
  ONBOARDING_PREPARATION_DURATION_MS,
  OnboardingPreparationScreen,
} from "@/components/centenaire/OnboardingPreparationScreen";
import { StartupStateLayout } from "@/components/centenaire/StartupStateLayout";
import { TodayScreen } from "@/components/centenaire/TodayScreen";
import {
  Button as UIButton,
  ChoiceCard,
  DateWheelPicker,
  ErrorState,
  FormField,
  holdChoiceInstanceKey,
  HoldChoiceCard,
  IconButton as UIIconButton,
  Surface,
  TextInput as UITextInput,
  WheelPicker,
} from "@/components/ui";
import { loadCloudData } from "@/services/cloudDataService";
import { resetConnectedLocalData } from "@/services/connectedResetService";
import {
  canAttemptAutomaticCloudWrite,
  completeMigrationOperation,
  createLocalMigrationSources,
  discardPreparedMigrationOperation,
  executeMigrationOperation,
  getLocalMigrationCandidate,
  getMigrationOperation,
  isMigrationDecisionRequired,
  isMigrationOperationStarted,
  keepOnlyCloudData,
  mergeLocalAndCloudData,
  prepareMigrationOperation,
  reconcilePendingAfterCloudLoad,
  type CloudStatus,
  type LocalMigrationSources,
  type MigrationOperation,
} from "@/services/localMigrationService";
import {
  clearLegacyPendingSyncQuarantine,
  clearRecoverableLegacySnapshots,
  createMealDeleteMutation,
  createMealUpsertMutation,
  getPendingCloudSnapshot,
  getRecoverableLegacySnapshot,
  hasPendingCloudWork,
  processPendingCloudWork,
  quarantineLegacyPendingSyncData,
  queueCloudMutations,
} from "@/services/offlineSyncService";
import type {
  AppData,
  ActiveMealKind,
  BehaviorContext,
  BehaviorFrequency,
  FrictionChoice,
  FullnessAfter,
  HungerAtReservice,
  HungerBefore,
  InitialBehaviorAnswers,
  InitialBehaviorAssessment,
  ISODate,
  MealAfter,
  MealClarification,
  MealComponents,
  MealEntry,
  MealPassageRelation,
  MealMutation,
  MealKind,
  MealQuantityEstimate,
  MealQuantityUnit,
  MealStructureV2,
  NonMealMutationDraft,
  Profile,
  PerceivedFriction,
  ProfessionalSupportStatus,
  QuestionnaireVersion,
  ReserviceReason,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SnackTrigger,
  SmokingEntry,
  SmokingDayState,
  SmokingGoal,
  SmokingStatus,
  SnackingAfter,
  StopReason,
  WeightEntry,
} from "@/lib/types";

type TabId = "today" | "journal" | "insights" | "profile";
type NavigationTabId = TabId | "sport";
type JournalViewMode = "days" | "weeks";

type JournalDayEvent =
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

interface TabDefinition {
  accessibleLabel?: string;
  id: NavigationTabId;
  label: string;
  icon: LucideIcon;
}

interface OnboardingDraft {
  firstName: string;
  birthDate: string;
  heightCm: string;
  startWeightKg: string;
  goalWeightKg: string;
  goalWeightIsCustom: boolean;
  startDate: string;
  behaviorAnswers: {
    [Key in keyof InitialBehaviorAnswers]: BehaviorFrequency | undefined;
  };
  contexts: BehaviorContext[];
  perceivedFrictions: PerceivedFriction[];
  professionalSupport?: ProfessionalSupportStatus;
  smokingStatus: SmokingStatus;
  smokingGoal?: SmokingGoal;
}

interface MealQuantityDraft {
  amount: string;
  unit: MealQuantityUnit;
  note: string;
}

interface MealDraft {
  kind: ActiveMealKind;
  date: ISODate;
  time: string;
  freeText: string;
  quantity: ServedQuantity;
  servingPattern: ServingPattern;
  mainQuantity: MealQuantityDraft;
  hungerBefore: HungerBefore;
  hungerAtReservice: HungerAtReservice | null;
  afterMeal: MealAfter;
  fullnessAfter: FullnessAfter;
  stopReason: StopReason;
  snackingAfter: SnackingAfter;
  starterTaken: boolean;
  starterText: string;
  starterQuantity: MealQuantityDraft;
  dessertTaken: boolean;
  dessertText: string;
  dessertQuantity: MealQuantityDraft;
  snackQuantity: MealQuantityDraft;
  snackTrigger: SnackTrigger | null;
  snackContext: SnackContext | null;
  reserviceRelation: MealPassageRelation | null;
  reserviceText: string;
  reserviceReasons: ReserviceReason[];
  clarifications: MealClarification[];
  questionnaireVersion: QuestionnaireVersion;
  components: MealComponents;
}

const tabs: TabDefinition[] = [
  { id: "today", label: "Jour", accessibleLabel: "Page du jour", icon: PenLine },
  { id: "journal", label: "Carnet", icon: BookOpen },
  { id: "insights", label: "Constats", icon: LineChart },
  { id: "sport", label: "Sport", icon: Dumbbell },
  { id: "profile", label: "Profil", icon: Settings2 },
];

const smokingStatusLabels: Record<SmokingStatus, string> = {
  "non-renseigne": "Non renseigné",
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d'arrêter",
};

const onboardingSmokingLabels: Partial<Record<SmokingStatus, string>> = {
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d’arrêter",
};

const smokingGoalLabels: Record<SmokingGoal, string> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer seulement",
  "pas-maintenant": "Pas maintenant",
};

const onboardingSmokingGoalLabels: Partial<Record<SmokingGoal, string>> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer d’abord",
  "pas-maintenant": "Pas maintenant",
};

const behaviorFrequencyChoices: Array<{
  label: string;
  value: BehaviorFrequency;
}> = [
  { label: "Jamais", value: 0 },
  { label: "Parfois", value: 2 },
  { label: "Souvent", value: 3 },
  { label: "Je ne sais pas encore", value: null },
];

const behaviorContextLabels: Record<BehaviorContext, string> = {
  "evening-night": "Le soir ou la nuit",
  screen: "Devant un écran",
  work: "Au travail",
  "car-travel": "En voiture ou en déplacement",
  hotel: "À l’hôtel",
  "restaurant-social": "Au restaurant ou avec d’autres personnes",
  "alone-home": "Seul à la maison",
  "no-specific-context": "Aucune situation précise",
  unknown: "Je ne sais pas encore",
};

const perceivedFrictionLabels: Record<PerceivedFriction, string> = {
  "large-portions": "Des portions trop importantes",
  "snacking-without-hunger": "Manger ou grignoter sans faim",
  "habit-meals": "Des repas pris par habitude",
  irregularity: "Un rythme irrégulier",
  emotional: "Le stress ou les émotions",
  stopping: "La difficulté à m’arrêter",
  unknown: "Je ne sais pas encore",
};

const professionalSupportLabels: Record<ProfessionalSupportStatus, string> = {
  yes: "Oui",
  no: "Non",
  "prefer-not-to-say": "Je préfère ne pas répondre",
};

const servingPatternLabels: Record<ServingPattern, string> = {
  none: "Une portion",
  once: "Une reprise",
  multiple: "Plusieurs reprises",
  buffet: "Buffet / plusieurs passages",
};

const hungerLabels: Record<HungerBefore, string> = {
  "pas-faim": "Pas faim",
  "petite-faim": "Petite faim",
  "vraie-faim": "Vraie faim",
  "tres-faim": "Très faim",
  yes: "Oui",
  not_really: "Pas vraiment",
  no: "Non",
  unsure: "Je ne sais pas",
};

const fullnessLabels: Record<FullnessAfter, string> = {
  still_hungry: "Encore faim",
  fine: "Bien",
  too_full: "Trop plein",
  uncomfortable: "Inconfortable",
};

const quantityUnitLabels: Record<MealQuantityUnit, string> = {
  piece: "pièce",
  portion: "portion",
  plate: "assiette",
  bowl: "bol",
  glass: "verre",
  slice: "part",
  spoon: "cuillère",
  handful: "poignée",
  other: "autre",
  unknown: "je ne sais pas",
};

const quickQuantityUnits: MealQuantityUnit[] = [
  "portion",
  "plate",
  "bowl",
  "piece",
  "glass",
  "slice",
  "other",
  "unknown",
];

const reserviceRelationLabels: Record<MealPassageRelation, string> = {
  same: "La même chose",
  partial: "Seulement certains éléments",
  side_only: "Surtout l’accompagnement",
  smaller: "Une plus petite quantité",
  other: "Autre",
};

const reserviceHungerLabels: Record<HungerAtReservice, string> = {
  yes: "Oui",
  not_really: "Pas vraiment",
  no: "Non",
  unsure: "Je ne sais pas",
};

const reserviceReasonLabels: Record<ReserviceReason, string> = {
  pleasure: "Plaisir / goût",
  habit: "Habitude",
  stress_emotion: "Stress ou émotion",
  food_available: "Le plat était devant moi",
  avoid_waste: "Ne pas gaspiller",
  others: "Les autres se resservaient",
  unsure: "Je ne sais pas",
};

const smokingDayLabels: Record<SmokingDayState, string> = {
  aucun: "Aucun",
  envie: "Envie forte",
  cigarette: "Cigarette",
};

const smokingTriggerOptions = [
  "voiture",
  "stress",
  "après-repas",
  "hôtel",
  "ennui",
  "autre",
];

const snackTriggerLabels: Record<SnackTrigger, string> = {
  hunger: "Faim",
  boredom: "Ennui",
  stress: "Stress",
  habit: "Habitude",
  craving: "Envie",
  unsure: "Je ne sais pas",
};

const snackContextLabels: Record<SnackContext, string> = {
  hotel: "Hôtel",
  car: "Voiture",
  home: "Maison",
  work: "Travail",
  other: "Autre",
};

function emptyQuantityDraft(unit: MealQuantityUnit = "portion"): MealQuantityDraft {
  return {
    amount: "1",
    unit,
    note: "",
  };
}

function createEmptyMealDraft(date: ISODate = todayISO()): MealDraft {
  return {
    kind: "dejeuner",
    date,
    time: currentTime(),
    freeText: "",
    quantity: "reasonable-plate",
    servingPattern: "none",
    mainQuantity: emptyQuantityDraft("plate"),
    hungerBefore: "yes",
    hungerAtReservice: null,
    afterMeal: "fine",
    fullnessAfter: "fine",
    stopReason: "rassasie",
    snackingAfter: "non",
    starterTaken: false,
    starterText: "",
    starterQuantity: emptyQuantityDraft("portion"),
    dessertTaken: false,
    dessertText: "",
    dessertQuantity: emptyQuantityDraft("portion"),
    snackQuantity: emptyQuantityDraft("portion"),
    snackTrigger: null,
    snackContext: null,
    reserviceRelation: null,
    reserviceText: "",
    reserviceReasons: [],
    clarifications: [],
    questionnaireVersion: "v2",
    components: { ...EMPTY_COMPONENTS },
  };
}

const today = todayISO();
const emptyMigrationSources: LocalMigrationSources = {
  guest: null,
  legacy: null,
};

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";
const sectionClass =
  "rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]";
const annotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";

async function materializeUserPendingState(
  baseData: AppData,
  userId: string,
): Promise<AppData> {
  const snapshot = await getPendingCloudSnapshot(userId);
  return materializePendingCloudState(
    baseData,
    snapshot.mutations,
  );
}
function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function exportJson(payload: AppData, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "Données insuffisantes";
  }

  return `${value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })} kg`;
}

function currentTime(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function parseQuantityAmount(value: string): number | null {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function quantityEstimateFromDraft(
  draft: MealQuantityDraft,
): MealQuantityEstimate {
  const amount = parseQuantityAmount(draft.amount);
  const note = draft.note.trim() || null;
  const hasUsableUnit = draft.unit !== "unknown";

  return {
    amount,
    unit: draft.unit,
    text: note,
    confidence:
      amount && hasUsableUnit
        ? "medium"
        : hasUsableUnit || note
          ? "low"
          : "not_estimated",
  };
}

function quantityDraftFromEstimate(
  estimate: MealQuantityEstimate | null | undefined,
  fallbackUnit: MealQuantityUnit,
): MealQuantityDraft {
  return {
    amount: estimate?.amount ? String(estimate.amount) : "1",
    unit: estimate?.unit ?? fallbackUnit,
    note: estimate?.text ?? "",
  };
}

function quantitySummary(quantity: MealQuantityEstimate | null | undefined): string | null {
  if (!quantity) {
    return null;
  }

  if (quantity.text) {
    return quantity.text;
  }

  if (quantity.amount && quantity.unit !== "unknown") {
    return `${quantity.amount.toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    })} ${quantityUnitLabels[quantity.unit]}`;
  }

  if (quantity.unit !== "unknown") {
    return quantityUnitLabels[quantity.unit];
  }

  return null;
}

function mealSectionQuantity(
  meal: MealEntry,
  kind: "starter" | "main" | "dessert" | "snack",
): MealQuantityEstimate | null {
  return meal.mealStructure?.sections.find((section) => section.kind === kind)
    ?.quantity ?? null;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

function activeKindFromMealKind(kind: MealKind): ActiveMealKind {
  if (kind === "petit-dejeuner" || kind === "dejeuner" || kind === "diner") {
    return kind;
  }

  if (kind === "grignotage" || kind === "collation") {
    return "grignotage";
  }

  return "dejeuner";
}

function quantityFromServingPattern(value: ServingPattern): ServedQuantity {
  if (value === "once") {
    return "two-plates";
  }

  if (value === "multiple" || value === "buffet") {
    return "three-plus-plates";
  }

  return "reasonable-plate";
}

function servingPatternFromQuantity(value: ServedQuantity): ServingPattern {
  if (value === "two-plates") {
    return "once";
  }

  if (value === "three-plus-plates") {
    return "multiple";
  }

  return "none";
}

function fullnessFromAfterMeal(value: MealAfter): FullnessAfter {
  if (
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
  ) {
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

function hungerForTunnel(value: HungerBefore): HungerBefore {
  if (value === "pas-faim") {
    return "no";
  }

  if (value === "petite-faim") {
    return "not_really";
  }

  if (value === "vraie-faim" || value === "tres-faim") {
    return "yes";
  }

  return value;
}

function mealDetectionText(draft: MealDraft): string {
  return [
    draft.freeText,
    draft.starterTaken ? draft.starterText : "",
    draft.dessertTaken ? draft.dessertText : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function prepareDetectedMealDraft(draft: MealDraft): MealDraft {
  const text = mealDetectionText(draft);

  return {
    ...draft,
    components: detectMealComponents(text),
    clarifications: mergeDetectedClarifications(text, draft.clarifications),
  };
}

function sanitizeMealDraftForKind(draft: MealDraft): MealDraft {
  if (draft.kind === "dejeuner" || draft.kind === "diner") {
    return draft;
  }

  return {
    ...draft,
    starterTaken: false,
    starterText: "",
    starterQuantity: emptyQuantityDraft("portion"),
    dessertTaken: false,
    dessertText: "",
    dessertQuantity: emptyQuantityDraft("portion"),
    servingPattern: "none",
    hungerAtReservice: null,
    reserviceRelation: null,
    reserviceText: "",
    reserviceReasons: [],
  };
}

function hasReservice(servingPattern: ServingPattern): boolean {
  return servingPattern === "once" ||
    servingPattern === "multiple" ||
    servingPattern === "buffet";
}

function shouldAskReserviceReason(draft: MealDraft): boolean {
  return (
    hasReservice(draft.servingPattern) &&
    (draft.hungerAtReservice === "not_really" ||
      draft.hungerAtReservice === "no")
  );
}

function shouldSkipMealStep(stepId: MealTunnelStepId, draft: MealDraft): boolean {
  if (stepId === "clarifications") {
    return draft.clarifications.length === 0;
  }

  if (
    stepId === "reservice-detail" ||
    stepId === "reservice-hunger"
  ) {
    return !hasReservice(draft.servingPattern);
  }

  if (stepId === "reservice-reason") {
    return !shouldAskReserviceReason(draft);
  }

  return false;
}

function createMealItem(
  rawText: string,
  quantity: MealQuantityEstimate | null,
) {
  return {
    id: createId("meal-item"),
    rawText,
    recognitionStatus: "unprocessed" as const,
    canonicalName: null,
    ciqualCode: null,
    confidence: null,
    quantity,
  };
}

function createSinglePassageSection({
  kind,
  rawText,
  quantity,
}: {
  kind: "starter" | "main" | "dessert" | "snack";
  rawText: string;
  quantity: MealQuantityEstimate | null;
}): MealStructureV2["sections"][number] {
  return {
    id: createId(`meal-section-${kind}`),
    kind,
    rawText,
    quantity,
    passages: [
      {
        id: createId("meal-passage"),
        index: 1,
        relationToPrevious: null,
        relationText: null,
        items: [createMealItem(rawText, quantity)],
      },
    ],
  };
}

function buildMealStructure(draft: MealDraft): MealStructureV2 {
  const sections: MealStructureV2["sections"] = [];
  const mainQuantity = quantityEstimateFromDraft(draft.mainQuantity);

  if (draft.starterTaken && draft.starterText.trim()) {
    sections.push(
      createSinglePassageSection({
        kind: "starter",
        rawText: draft.starterText.trim(),
        quantity: quantityEstimateFromDraft(draft.starterQuantity),
      }),
    );
  }

  if (draft.kind === "grignotage") {
    sections.push(
      createSinglePassageSection({
        kind: "snack",
        rawText: draft.freeText.trim(),
        quantity: quantityEstimateFromDraft(draft.snackQuantity),
      }),
    );
  } else {
    const mainSection = createSinglePassageSection({
      kind: "main",
      rawText: draft.freeText.trim(),
      quantity: mainQuantity,
    });

    if (hasReservice(draft.servingPattern)) {
      const reserviceText =
        draft.reserviceText.trim() ||
        (draft.reserviceRelation === "same"
          ? draft.freeText.trim()
          : reserviceRelationLabels[draft.reserviceRelation ?? "other"]);

      mainSection.passages.push({
        id: createId("meal-passage"),
        index: 2,
        relationToPrevious: draft.reserviceRelation ?? "other",
        relationText: draft.reserviceText.trim() || null,
        items: [
          createMealItem(
            reserviceText,
            draft.reserviceRelation === "smaller" ? null : mainQuantity,
          ),
        ],
      });
    }

    sections.push(mainSection);
  }

  if (draft.dessertTaken && draft.dessertText.trim()) {
    sections.push(
      createSinglePassageSection({
        kind: "dessert",
        rawText: draft.dessertText.trim(),
        quantity: quantityEstimateFromDraft(draft.dessertQuantity),
      }),
    );
  }

  return {
    version: 2,
    source: "meal_tunnel_v2",
    sections,
    behavior: {
      hungerBefore: draft.hungerBefore,
      fullnessAfter: draft.fullnessAfter,
      hungerAtReservice: hasReservice(draft.servingPattern)
        ? draft.hungerAtReservice ?? "unsure"
        : null,
      reserviceReasons: shouldAskReserviceReason(draft)
        ? draft.reserviceReasons
        : [],
    },
  };
}

function mealDetailLine(meal: MealEntry): string {
  const details = [];
  const servingPattern = meal.servingPattern ?? servingPatternFromQuantity(meal.quantity);
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
    if (mainQuantity) {
      details.push(mainQuantity);
    }
    if (meal.snackTrigger) {
      details.push(snackTriggerLabels[meal.snackTrigger].toLowerCase());
    }
    if (meal.snackContext) {
      details.push(snackContextLabels[meal.snackContext].toLowerCase());
    }
  } else {
    if (mainQuantity) {
      details.push(mainQuantity);
    }
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

function mealTagLabels(): string[] {
  return [];
}

function buildJournalDayEvents(data: AppData, date: ISODate): JournalDayEvent[] {
  return [
    ...data.weights
      .filter((weight) => weight.date === date)
      .map((weight) => ({
        createdAt: weight.createdAt,
        id: weight.id,
        kind: "weight" as const,
        time: weight.time,
        weight,
      })),
    ...data.meals
      .filter((meal) => meal.date === date)
      .map((meal) => ({
        createdAt: meal.createdAt,
        id: meal.id,
        kind: "meal" as const,
        meal,
        time: meal.time,
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

function sameWeek(a: ISODate, b: ISODate): boolean {
  return startOfWeek(a) === startOfWeek(b);
}

function buildSmokingDaySummary(
  entries: AppData["smokingEntries"],
): string {
  if (entries.length === 0) {
    return "Non renseigné";
  }

  const cigaretteCount = entries.filter((entry) => entry.state === "cigarette").length;
  if (cigaretteCount > 0) {
    return countLabel(cigaretteCount, "cigarette", "cigarettes");
  }

  const cravingCount = entries.filter((entry) => entry.state === "envie").length;
  if (cravingCount > 0) {
    return countLabel(cravingCount, "envie forte", "envies fortes");
  }

  return "Aucun";
}

function smokingEntryLine(entry: SmokingEntry): string {
  return `${smokingDayLabels[entry.state]}${entry.note ? ` · ${entry.note}` : ""}`;
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

function needsSmokingGoal(status: SmokingStatus): boolean {
  return status !== "non" && status !== "non-renseigne";
}

const onboardingWelcomeStep = 0;
const onboardingNameStep = 1;
const onboardingBirthDateStep = 2;
const onboardingHeightStep = 3;
const onboardingWeightStep = 4;
const onboardingBmiStep = 5;
const onboardingGoalStep = 6;
const onboardingBehaviorStartStep = 7;
const onboardingContextsStep = 14;
const onboardingPerceivedFrictionsStep = 15;
const onboardingProfessionalSupportStep = 16;
const onboardingSmokingStep = 17;
const onboardingSmokingGoalStep = 18;
const onboardingFinalStep = 19;

const behaviorAnswerStepKeys: Partial<
  Record<number, keyof InitialBehaviorAnswers>
> = {
  7: "rhythm",
  8: "hunger",
  9: "satietyControl",
  10: "emotional",
  11: "externalCues",
  12: "habitContext",
  13: "restrictionRebound",
};

function completeBehaviorAnswers(
  answers: OnboardingDraft["behaviorAnswers"],
): InitialBehaviorAnswers {
  return {
    rhythm: answers.rhythm ?? null,
    hunger: answers.hunger ?? null,
    satietyControl: answers.satietyControl ?? null,
    emotional: answers.emotional ?? null,
    externalCues: answers.externalCues ?? null,
    habitContext: answers.habitContext ?? null,
    restrictionRebound: answers.restrictionRebound ?? null,
  };
}

function hasCompleteBehaviorAnswers(
  answers: OnboardingDraft["behaviorAnswers"],
): boolean {
  return Object.values(answers).every((answer) => answer !== undefined);
}

function buildBehaviorAssessmentFromDraft(
  draft: Pick<
    OnboardingDraft,
    | "behaviorAnswers"
    | "contexts"
    | "perceivedFrictions"
    | "professionalSupport"
  >,
  completedAt: string,
): InitialBehaviorAssessment {
  return buildInitialBehaviorAssessment({
    answers: completeBehaviorAnswers(draft.behaviorAnswers),
    completedAt,
    contexts: draft.contexts,
    perceivedFrictions: draft.perceivedFrictions,
    professionalSupport: draft.professionalSupport,
  });
}

function buildProfile(draft: OnboardingDraft): Profile {
  const createdAt = new Date().toISOString();
  const initialBehaviorAssessment = buildBehaviorAssessmentFromDraft(
    draft,
    createdAt,
  );

  return {
    firstName: draft.firstName.trim(),
    age: calculateAgeOnDate(draft.birthDate, draft.startDate),
    heightCm: Number(draft.heightCm),
    startWeightKg: roundOne(Number(draft.startWeightKg)),
    goalWeightKg: roundOne(Number(draft.goalWeightKg)),
    startDate: draft.startDate,
    initialFriction: legacyFrictionFromAssessment(initialBehaviorAssessment),
    initialBehaviorAssessment,
    smokingStatus: draft.smokingStatus,
    smokingGoal: needsSmokingGoal(draft.smokingStatus) ? draft.smokingGoal : undefined,
    showActiveMission: true,
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt,
  };
}

function isValidProfileDraft(draft: OnboardingDraft): boolean {
  return (
    draft.firstName.trim().length > 0 &&
    hasValidOnboardingBirthDate(draft.birthDate, draft.startDate) &&
    hasNumberInRange(draft.heightCm, 100, 220) &&
    hasNumberInRange(draft.startWeightKg, 30, 250) &&
    hasNumberInRange(draft.goalWeightKg, 30, 250) &&
    draft.startDate.length > 0 &&
    hasCompleteBehaviorAnswers(draft.behaviorAnswers) &&
    draft.contexts.length > 0 &&
    draft.perceivedFrictions.length > 0 &&
    draft.smokingStatus !== "non-renseigne" &&
    (!needsSmokingGoal(draft.smokingStatus) || draft.smokingGoal !== undefined)
  );
}

function hasNumberInRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return value.trim().length > 0 && number >= min && number <= max;
}

function hasValidOnboardingBirthDate(
  birthDate: string,
  referenceDate: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return false;
  }

  const age = calculateAgeOnDate(birthDate, referenceDate);
  return age >= 18 && age <= 100;
}

function getNextOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === onboardingSmokingStep && !needsSmokingGoal(draft.smokingStatus)) {
    return onboardingFinalStep;
  }

  return Math.min(onboardingFinalStep, step + 1);
}

function getPreviousOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === onboardingFinalStep && !needsSmokingGoal(draft.smokingStatus)) {
    return onboardingSmokingStep;
  }

  return Math.max(0, step - 1);
}

function getOnboardingStepError(
  draft: OnboardingDraft,
  step: number,
): string | null {
  if (step === onboardingNameStep && draft.firstName.trim().length === 0) {
    return "Indique ton prénom pour ouvrir le carnet.";
  }

  if (
    step === onboardingBirthDateStep &&
    !hasValidOnboardingBirthDate(draft.birthDate, draft.startDate)
  ) {
    return "Choisis ta date de naissance.";
  }

  if (step === onboardingHeightStep && !hasNumberInRange(draft.heightCm, 100, 220)) {
    return "Choisis ta taille.";
  }

  if (step === onboardingWeightStep && !hasNumberInRange(draft.startWeightKg, 30, 250)) {
    return "Choisis ton poids actuel.";
  }

  if (step === onboardingGoalStep && !hasNumberInRange(draft.goalWeightKg, 30, 250)) {
    return "Choisis ton objectif.";
  }

  const behaviorAnswerKey = behaviorAnswerStepKeys[step];
  if (
    step >= onboardingBehaviorStartStep &&
    behaviorAnswerKey &&
    draft.behaviorAnswers[behaviorAnswerKey] === undefined
  ) {
    return "Choisis la réponse qui se rapproche le plus de ton quotidien.";
  }

  if (step === onboardingContextsStep && draft.contexts.length === 0) {
    return "Choisis au moins une situation, ou indique que tu ne sais pas encore.";
  }

  if (
    step === onboardingPerceivedFrictionsStep &&
    draft.perceivedFrictions.length === 0
  ) {
    return "Choisis au moins un point, ou indique que tu ne sais pas encore.";
  }

  if (step === onboardingSmokingStep && draft.smokingStatus === "non-renseigne") {
    return "Réponds à la question tabac pour continuer.";
  }

  if (
    step === onboardingSmokingGoalStep &&
    needsSmokingGoal(draft.smokingStatus) &&
    draft.smokingGoal === undefined
  ) {
    return "Choisis ce que tu souhaites faire concernant le tabac.";
  }

  if (step === onboardingFinalStep && !isValidProfileDraft(draft)) {
    return "Complète les réponses précédentes pour ouvrir le carnet.";
  }

  return null;
}

function Button({
  children,
  disabled = false,
  onClick,
  type = "button",
  variant = "ink",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "ink" | "line" | "signal";
}) {
  const classes =
    variant === "ink"
      ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-hover)]"
      : variant === "signal"
        ? "border border-[#D7B8B2] bg-[#FFF7F3] text-[#8A3B32]"
        : "border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-muted)]";

  return (
    <button
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0 ${classes}`}
      disabled={disabled}
      type={type}
      onClick={() => onClick?.()}
    >
      {children}
    </button>
  );
}

function ChoiceLine<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`min-h-12 cursor-pointer rounded-[16px] border px-4 text-left text-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px ${
              selected
                ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onChange(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-left transition active:scale-[0.99]"
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm font-semibold text-[var(--pc-color-text)]">{label}</span>
      <span
        className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
          checked
            ? "justify-end bg-[var(--pc-color-primary)]"
            : "justify-start bg-[var(--pc-color-primary-muted)]"
        }`}
      >
        <span className="size-6 rounded-full bg-white shadow-[0_2px_8px_rgba(16,24,32,0.18)]" />
      </span>
    </button>
  );
}

function PageTitle({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="space-y-3 pb-5">
      <p className={annotationClass}>{kicker}</p>
      <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">{title}</h1>
      {children ? (
        <div className="text-base leading-7 text-[var(--pc-color-text)]">{children}</div>
      ) : null}
    </header>
  );
}

function LoadingScreen() {
  return (
    <StartupStateLayout title="Ouverture du carnet.">
      <div
        aria-label="Ouverture du carnet"
        className="h-1.5 w-24 overflow-hidden rounded-[var(--pc-radius-full)] bg-[var(--pc-color-border)]"
        role="status"
      >
        <span className="block h-full w-1/2 animate-pulse rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary)]" />
      </div>
    </StartupStateLayout>
  );
}

function ConnectedResetScreen({ failed }: { failed: boolean }) {
  return (
    <StartupStateLayout
      description={
        failed
          ? "Le cloud n’a pas pu être rechargé. Les anciennes données locales ne sont plus affichées."
          : undefined
      }
      title={failed ? "Reconnexion nécessaire." : "Réinitialisation locale."}
    >
      {failed ? (
        <UIButton onClick={() => window.location.reload()} variant="secondary">
          Recharger le carnet
        </UIButton>
      ) : (
        <div
          aria-label="Réinitialisation locale"
          className="h-1.5 w-24 overflow-hidden rounded-[var(--pc-radius-full)] bg-[var(--pc-color-border)]"
          role="status"
        >
          <span className="block h-full w-1/2 animate-pulse rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary)]" />
        </div>
      )}
    </StartupStateLayout>
  );
}

function MigrationDecisionScreen({
  busy,
  cloudEmail,
  cloudHasProfile,
  error,
  localHasProfile,
  onAttach,
  onExport,
  onKeepCloud,
  operationStarted,
}: {
  busy: boolean;
  cloudEmail: string | null;
  cloudHasProfile: boolean;
  error: string | null;
  localHasProfile: boolean;
  onAttach: () => void;
  onExport: () => void;
  onKeepCloud: () => void;
  operationStarted: boolean;
}) {
  return (
    <StartupStateLayout
      eyebrow="Association des données"
      title="Des données existent sur cet appareil."
    >
      <Surface as="section" className="space-y-4 p-4 min-[390px]:p-5">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text-muted)]">
            {operationStarted
              ? "L’association a déjà commencé. Termine-la avec la même opération pour conserver un état cohérent."
              : `Connecté avec ${cloudEmail ?? "ce compte"}. Choisis leur destination avant d’ouvrir le carnet.`}
          </p>
          {cloudHasProfile && localHasProfile ? (
            <p className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] px-4 py-3 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-primary)]">
              Le profil et les préférences du compte seront conservés. Les notes,
              mesures et événements locaux seront ajoutés sans effacer ceux du
              compte.
            </p>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
          <div className="grid gap-2">
            <UIButton disabled={busy} fullWidth onClick={onAttach}>
              {busy
                ? "Association en cours…"
                : operationStarted
                  ? "Terminer l’association"
                  : "Associer ces données à mon compte"}
            </UIButton>
            {!operationStarted ? (
              <UIButton
                disabled={busy}
                fullWidth
                onClick={onKeepCloud}
                variant="secondary"
              >
                Garder uniquement les données du compte
              </UIButton>
            ) : null}
            <UIButton
              disabled={busy}
              fullWidth
              onClick={onExport}
              variant="tertiary"
            >
              <Download aria-hidden="true" size={17} />
              Exporter les données de cet appareil
            </UIButton>
          </div>
      </Surface>
    </StartupStateLayout>
  );
}

export function ProjetCentenaireApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [currentDate, setCurrentDate] = useState<ISODate>(() => todayISO());
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() =>
    isSupabaseConfigured() ? "loading" : "not-configured",
  );
  const [cloudSnapshot, setCloudSnapshot] = useState<AppData | null>(null);
  const [migrationSources, setMigrationSources] =
    useState<LocalMigrationSources>(emptyMigrationSources);
  const [migrationOperation, setMigrationOperation] =
    useState<MigrationOperation | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [connectedResetStatus, setConnectedResetStatus] = useState<
    "idle" | "running" | "reload-required"
  >("idle");
  const [launchStage, setLaunchStage] = useState<LaunchStage>("loading");
  const [launchAcknowledged, setLaunchAcknowledged] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>({
    firstName: "",
    birthDate: "",
    heightCm: "",
    startWeightKg: "",
    goalWeightKg: "",
    goalWeightIsCustom: false,
    startDate: today,
    behaviorAnswers: {
      rhythm: undefined,
      hunger: undefined,
      satietyControl: undefined,
      emotional: undefined,
      externalCues: undefined,
      habitContext: undefined,
      restrictionRebound: undefined,
    },
    contexts: [],
    perceivedFrictions: [],
    professionalSupport: undefined,
    smokingStatus: "non-renseigne",
    smokingGoal: undefined,
  });
  const [mealOpen, setMealOpen] = useState(false);
  const [mealStep, setMealStep] = useState(0);
  const [mealDraft, setMealDraft] = useState<MealDraft>(() =>
    createEmptyMealDraft(currentDate),
  );
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [openMealActionId, setOpenMealActionId] = useState<string | null>(null);
  const mealLongPressTimeoutRef = useRef<number | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");
  const [smokingOpen, setSmokingOpen] = useState(false);
  const [journalView, setJournalView] = useState<JournalViewMode>("days");
  const [journalDate, setJournalDate] = useState<ISODate>(() => todayISO());
  const [journalWeekDate, setJournalWeekDate] = useState<ISODate>(() =>
    todayISO(),
  );
  const [smokingState, setSmokingState] = useState<SmokingDayState>("aucun");
  const [smokingNote, setSmokingNote] = useState("");
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [behaviorEditorOpen, setBehaviorEditorOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cloudGenerationRef = useRef(0);
  const localEditGenerationRef = useRef(0);
  const activeCloudUserIdRef = useRef<string | null>(null);
  const cloudRecoveryInFlightRef = useRef(false);

  useEffect(() => {
    const sloganTimer = window.setTimeout(() => {
      setLaunchStage("slogan");
    }, LAUNCH_LOADING_DURATION_MS);
    const readyTimer = window.setTimeout(() => {
      setLaunchStage("ready");
    }, LAUNCH_READY_DELAY_MS);

    return () => {
      window.clearTimeout(sloganTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const generation = cloudGenerationRef.current + 1;
    cloudGenerationRef.current = generation;
    activeCloudUserIdRef.current = null;

    const generationIsCurrent = () =>
      !cancelled && cloudGenerationRef.current === generation;

    const synchronizeAfterCloudRead = async (
      supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
      userId: string,
    ) => {
      try {
        while (true) {
          const reconciled = await reconcilePendingAfterCloudLoad(
            supabase,
            userId,
            () => localEditGenerationRef.current,
          );

          if (
            !isCurrentCloudAttempt(
              cloudGenerationRef.current,
              generation,
              activeCloudUserIdRef.current,
              userId,
            )
          ) {
            return;
          }

          if (
            reconciled.localEditGeneration !== localEditGenerationRef.current ||
            (await hasPendingCloudWork(userId))
          ) {
            continue;
          }

          localDataStore.save(userStorageScope(userId), reconciled.data);
          setCloudStatus("ready");
          setCloudSnapshot(reconciled.data);
          setData(reconciled.data);
          setProfileDraft(reconciled.data.profile);
          setPendingSync(false);
          setNotice("Données en attente synchronisées.");
          return;
        }
      } catch {
        if (
          isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            userId,
          )
        ) {
          const visibleData = await materializeUserPendingState(
            localDataStore.load(userStorageScope(userId)),
            userId,
          );
          setCloudStatus("unavailable");
          setCloudSnapshot(null);
          setData(visibleData);
          setProfileDraft(visibleData.profile);
          setPendingSync(true);
          setNotice("Données en attente de synchronisation.");
        }
      }
    };

    const loadData = async () => {
      localDataStore.quarantineLegacyData();
      const legacyPendingData = quarantineLegacyPendingSyncData();
      const guestData = localDataStore.load(guestStorageScope);
      const legacyStoredData = localDataStore.getLegacyQuarantine();
      const legacyData =
        legacyStoredData && legacyPendingData
          ? mergeLocalAndCloudData(legacyStoredData, legacyPendingData)
          : legacyStoredData ?? legacyPendingData;
      let localMigrationSources = createLocalMigrationSources(
        guestData,
        legacyData,
      );
      let sessionUserId: string | null = null;
      let sessionEmail: string | null = null;
      let userCache: AppData | null = null;

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          activeCloudUserIdRef.current = null;
          setCloudStatus("not-configured");
          setCloudSnapshot(null);
          setMigrationSources(emptyMigrationSources);
          setMigrationOperation(null);
          setData(guestData);
          setProfileDraft(guestData.profile);
          setWeightDraft("");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!generationIsCurrent()) {
          return;
        }

        sessionUserId = session?.user.id ?? null;
        sessionEmail = session?.user.email ?? null;
        setPendingSync(
          sessionUserId ? await hasPendingCloudWork(sessionUserId) : false,
        );
        if (sessionUserId) {
          const ownedLegacyData = await getRecoverableLegacySnapshot(
            sessionUserId,
          );
          if (ownedLegacyData) {
            localMigrationSources = createLocalMigrationSources(
              guestData,
              legacyData
                ? mergeLocalAndCloudData(legacyData, ownedLegacyData)
                : ownedLegacyData,
            );
          }
        }

        const {
          data: { user },
        } = await withCloudReadTimeout(supabase.auth.getUser());

        if (!generationIsCurrent()) {
          return;
        }

        if (!user) {
          activeCloudUserIdRef.current = null;
          setCloudUserId(null);
          setCloudEmail(null);
          setCloudStatus("ready");
          setCloudSnapshot(null);
          setMigrationSources(emptyMigrationSources);
          setMigrationOperation(null);
          setPendingSync(false);
          setData(guestData);
          setProfileDraft(guestData.profile);
          setWeightDraft("");
          return;
        }

        const userScope = userStorageScope(user.id);
        sessionUserId = user.id;
        sessionEmail = user.email ?? null;
        userCache = localDataStore.load(userScope);
        const storedMigrationOperation = getMigrationOperation(user.id);
        const localMigrationCandidate = getLocalMigrationCandidate(
          localMigrationSources,
          storedMigrationOperation?.source,
        );
        const hadPendingSync = await hasPendingCloudWork(user.id);
        activeCloudUserIdRef.current = user.id;
        setCloudUserId(user.id);
        setCloudEmail(user.email ?? null);
        setMigrationSources(localMigrationSources);
        setMigrationOperation(storedMigrationOperation);

        const cloudData = await withCloudReadTimeout(
          loadCloudData(supabase, user.id),
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            user.id,
          )
        ) {
          return;
        }

        const hasPendingNow = await hasPendingCloudWork(user.id);
        setCloudStatus("ready");
        setCloudSnapshot(cloudData);
        setPendingSync(hasPendingNow);
        setWeightDraft("");

        if (hasPendingNow) {
          const visibleData = await materializeUserPendingState(cloudData, user.id);
          localDataStore.save(userScope, visibleData);
          setData(visibleData);
          setProfileDraft(visibleData.profile);
        } else {
          localDataStore.save(userScope, cloudData);
          setData(cloudData);
          setProfileDraft(cloudData.profile);
        }

        if (
          navigator.onLine &&
          (hadPendingSync || hasPendingNow) &&
          localMigrationCandidate === null &&
          storedMigrationOperation === null
        ) {
          void synchronizeAfterCloudRead(supabase, user.id);
        }
      } catch {
        if (!generationIsCurrent()) {
          return;
        }

        const fallbackBaseData =
          userCache ??
          (sessionUserId
            ? localDataStore.load(userStorageScope(sessionUserId))
            : guestData);
        const fallbackData = sessionUserId
          ? await materializeUserPendingState(fallbackBaseData, sessionUserId)
          : fallbackBaseData;

        activeCloudUserIdRef.current = sessionUserId;
        setCloudUserId(sessionUserId);
        setCloudEmail(sessionEmail);
        setCloudStatus("unavailable");
        setCloudSnapshot(null);
        setMigrationSources(
          sessionUserId ? localMigrationSources : emptyMigrationSources,
        );
        setMigrationOperation(
          sessionUserId ? getMigrationOperation(sessionUserId) : null,
        );
        setPendingSync(
          sessionUserId ? await hasPendingCloudWork(sessionUserId) : false,
        );
        setData(fallbackData);
        setProfileDraft(fallbackData.profile);
        setWeightDraft("");
        setError(
          sessionUserId
            ? "Compte connecté. La synchronisation cloud est retardée ; un nouvel essai va démarrer automatiquement."
            : "Connexion cloud indisponible. Le carnet reste local pour le moment.",
        );
      }
    };

    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      cancelled = true;
      if (cloudGenerationRef.current === generation) {
        cloudGenerationRef.current += 1;
      }
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const syncCurrentDate = () => {
      setCurrentDate((current) => {
        const next = todayISO();
        return shouldUpdateCurrentDate(current, next) ? next : current;
      });
    };

    const syncOnVisibility = () => {
      if (document.visibilityState === "visible") {
        syncCurrentDate();
      }
    };

    const interval = window.setInterval(syncCurrentDate, 60_000);
    window.addEventListener("focus", syncCurrentDate);
    document.addEventListener("visibilitychange", syncOnVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncCurrentDate);
      document.removeEventListener("visibilitychange", syncOnVisibility);
    };
  }, []);

  useEffect(() => {
    if (!cloudUserId) {
      return;
    }

    const syncOnOnline = async () => {
      const supabase = getSupabaseBrowserClient();
      const localMigrationCandidate = getLocalMigrationCandidate(
        migrationSources,
        migrationOperation?.source,
      );

      if (
        !supabase ||
        isMigrationDecisionRequired(
          cloudStatus,
          localMigrationCandidate,
          migrationOperation,
        ) ||
        (cloudStatus === "ready" && !(await hasPendingCloudWork(cloudUserId)))
      ) {
        return;
      }

      if (cloudRecoveryInFlightRef.current) {
        return;
      }

      cloudRecoveryInFlightRef.current = true;

      const generation = cloudGenerationRef.current + 1;
      cloudGenerationRef.current = generation;
      activeCloudUserIdRef.current = cloudUserId;

      try {
        const {
          data: { user },
        } = await withCloudReadTimeout(supabase.auth.getUser());

        if (!user || user.id !== cloudUserId) {
          return;
        }

        const cloudData = await withCloudReadTimeout(
          loadCloudData(supabase, cloudUserId),
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          return;
        }

        const currentOperation = getMigrationOperation(cloudUserId);
        const currentCandidate = getLocalMigrationCandidate(
          migrationSources,
          currentOperation?.source,
        );
        setCloudStatus("ready");
        setError(null);
        setCloudSnapshot(cloudData);
        setMigrationOperation(currentOperation);
        setPendingSync(await hasPendingCloudWork(cloudUserId));

        const visibleCloudData = await materializeUserPendingState(
          cloudData,
          cloudUserId,
        );
        localDataStore.save(
          userStorageScope(cloudUserId),
          visibleCloudData,
        );
        setData(visibleCloudData);
        setProfileDraft(visibleCloudData.profile);

        if (currentCandidate || currentOperation) {
          return;
        }

        if (await hasPendingCloudWork(cloudUserId)) {
          while (true) {
            const reconciled = await reconcilePendingAfterCloudLoad(
              supabase,
              cloudUserId,
              () => localEditGenerationRef.current,
            );

            if (
              !isCurrentCloudAttempt(
                cloudGenerationRef.current,
                generation,
                activeCloudUserIdRef.current,
                cloudUserId,
              )
            ) {
              return;
            }

            if (
              reconciled.localEditGeneration !==
                localEditGenerationRef.current ||
              (await hasPendingCloudWork(cloudUserId))
            ) {
              continue;
            }

            localDataStore.save(
              userStorageScope(cloudUserId),
              reconciled.data,
            );
            setCloudSnapshot(reconciled.data);
            setData(reconciled.data);
            setProfileDraft(reconciled.data.profile);
            setPendingSync(false);
            setNotice("Données en attente synchronisées.");
            return;
          }
        }

        localDataStore.save(userStorageScope(cloudUserId), cloudData);
        setData(cloudData);
        setProfileDraft(cloudData.profile);
        if (cloudStatus === "unavailable") {
          setNotice("Synchronisation cloud rétablie.");
        }
      } catch {
        if (
          isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          const visibleData = await materializeUserPendingState(
            localDataStore.load(userStorageScope(cloudUserId)),
            cloudUserId,
          );
          setCloudStatus("unavailable");
          setCloudSnapshot(null);
          setData(visibleData);
          setProfileDraft(visibleData.profile);
          setPendingSync(await hasPendingCloudWork(cloudUserId));
        }
      } finally {
        cloudRecoveryInFlightRef.current = false;
      }
    };

    const retryWhenVisible = () => {
      if (
        cloudStatus === "unavailable" &&
        document.visibilityState === "visible"
      ) {
        void syncOnOnline();
      }
    };

    const recoveryTimer =
      cloudStatus === "unavailable" && navigator.onLine
        ? window.setTimeout(() => {
            void syncOnOnline();
          }, CLOUD_RECOVERY_DELAY_MS)
        : null;

    window.addEventListener("online", syncOnOnline);
    window.addEventListener("focus", retryWhenVisible);
    document.addEventListener("visibilitychange", retryWhenVisible);

    return () => {
      window.removeEventListener("online", syncOnOnline);
      window.removeEventListener("focus", retryWhenVisible);
      document.removeEventListener("visibilitychange", retryWhenVisible);
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
      }
    };
  }, [cloudStatus, cloudUserId, migrationOperation, migrationSources]);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [notice, error]);

  useEffect(() => {
    document.documentElement.dataset.pcTheme = data?.profile?.darkMode
      ? "dark"
      : "light";
  }, [data?.profile?.darkMode]);

  useEffect(
    () => () => {
      if (mealLongPressTimeoutRef.current !== null) {
        window.clearTimeout(mealLongPressTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!openMealActionId) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMealActionId(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [openMealActionId]);

  const migrationCandidate = getLocalMigrationCandidate(
    migrationSources,
    migrationOperation?.source,
  );
  const migrationDecisionRequired = isMigrationDecisionRequired(
    cloudStatus,
    migrationCandidate,
    migrationOperation,
  );

  const analysis = useMemo(
    () => (data ? calculateWeeklyAnalysis(data, currentDate) : null),
    [data, currentDate],
  );

  const entrySearchParams =
    !data || typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);
  const onboardingPreview =
    process.env.NODE_ENV === "development" &&
    Boolean(entrySearchParams?.has("onboarding-preview"));
  const onboardingEntryRequested = Boolean(
    entrySearchParams?.has(ONBOARDING_START_PARAM),
  );
  const appResumeRequested = Boolean(
    data?.profile && entrySearchParams?.has(APP_RESUME_PARAM),
  );

  useEffect(() => {
    if (!data?.profile || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(ONBOARDING_START_PARAM)) return;

    const cleanupTimer = window.setTimeout(() => {
      url.searchParams.delete(ONBOARDING_START_PARAM);
      setLaunchAcknowledged(true);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }, 0);

    return () => window.clearTimeout(cleanupTimer);
  }, [data?.profile]);

  useEffect(() => {
    if (!data?.profile || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(APP_RESUME_PARAM)) return;

    const cleanupTimer = window.setTimeout(() => {
      const requestedTab = url.searchParams.get(APP_RESUME_TAB_PARAM);
      if (
        requestedTab === "today" ||
        requestedTab === "journal" ||
        requestedTab === "insights" ||
        requestedTab === "profile"
      ) {
        setActiveTab(requestedTab);
      }
      url.searchParams.delete(APP_RESUME_PARAM);
      url.searchParams.delete(APP_RESUME_TAB_PARAM);
      setLaunchAcknowledged(true);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }, 0);

    return () => window.clearTimeout(cleanupTimer);
  }, [data?.profile]);

  if (!onboardingEntryRequested && !appResumeRequested && !launchAcknowledged) {
    return (
      <LaunchScreen
        dataReady={Boolean(data)}
        stage={launchStage}
        onStart={() => {
          if (!data) return;

          if (onboardingPreview) {
            const nextPath = onboardingEntryPath(true);
            window.location.assign(
              `/login?next=${encodeURIComponent(nextPath)}`,
            );
            return;
          }

          if (
            data.profile ||
            cloudUserId ||
            isLocalEntryModeSelected()
          ) {
            setLaunchAcknowledged(true);
            if (!data.profile) {
              setOnboardingStep(onboardingNameStep);
            }
            return;
          }

          const nextPath = onboardingEntryPath(false);
          window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
        }}
      />
    );
  }

  if (connectedResetStatus !== "idle") {
    return (
      <ConnectedResetScreen
        failed={connectedResetStatus === "reload-required"}
      />
    );
  }

  if (!data || !analysis) {
    return <LoadingScreen />;
  }

  const persistData = async (
    normalized: AppData,
    nonMealMutations: NonMealMutationDraft[],
    mealMutations: MealMutation[] = [],
  ): Promise<boolean> => {
    if (migrationDecisionRequired) {
      return false;
    }

    const supabase = getSupabaseBrowserClient();
    const scope = cloudUserId ? userStorageScope(cloudUserId) : guestStorageScope;

    localDataStore.save(scope, normalized);
    localEditGenerationRef.current += 1;

    if (
      cloudUserId &&
      (mealMutations.length > 0 || nonMealMutations.length > 0)
    ) {
      try {
        await queueCloudMutations(
          cloudUserId,
          nonMealMutations,
          mealMutations,
        );
        setPendingSync(true);
      } catch {
        setError(
          "La modification reste affichée, mais elle n’a pas pu être sécurisée sur cet appareil. Réessaie avant de fermer l’application.",
        );
        return false;
      }
    }

    if (!cloudUserId || !supabase) {
      return true;
    }

    if (!(await hasPendingCloudWork(cloudUserId))) {
      return true;
    }

    if (
      !navigator.onLine ||
      !canAttemptAutomaticCloudWrite(cloudStatus, migrationDecisionRequired)
    ) {
      return true;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;

    try {
      await processPendingCloudWork(supabase, userId);

      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setPendingSync(await hasPendingCloudWork(userId));
      }
      return true;
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setPendingSync(true);
        setNotice("Données en attente de synchronisation.");
      }
      return true;
    }
  };

  const saveData = (
    next: AppData,
    message: string | undefined,
    nonMealMutations: NonMealMutationDraft[] = [],
    mealMutations: MealMutation[] = [],
  ) => {
    if (migrationDecisionRequired) {
      return;
    }

    const normalized = normalizeData(next);
    setData(normalized);
    setProfileDraft(normalized.profile);
    setError(null);
    void persistData(normalized, nonMealMutations, mealMutations).then(
      (secured) => {
        if (message && secured) setNotice(message);
      },
    );
  };

  const completeMigrationDecision = async (
    resolvedCloudData: AppData,
    source: keyof LocalMigrationSources,
    message: string,
    reconcileNormalPending = true,
    completedOperationId?: string,
  ) => {
    if (!cloudUserId) {
      return;
    }

    const generation = cloudGenerationRef.current;

    if (
      !isCurrentCloudAttempt(
        cloudGenerationRef.current,
        generation,
        activeCloudUserIdRef.current,
        cloudUserId,
      )
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Connexion cloud indisponible. Les données restent sur cet appareil.");
      return;
    }

    if (
      completedOperationId &&
      !(await completeMigrationOperation(cloudUserId, completedOperationId))
    ) {
      throw new Error("L’opération de migration n’a pas pu être finalisée.");
    }

    if (source === "guest") {
      localDataStore.reset(guestStorageScope);
    } else {
      localDataStore.clearLegacyQuarantine();
      clearLegacyPendingSyncQuarantine();
      await clearRecoverableLegacySnapshots(cloudUserId);
    }
    const remainingSources: LocalMigrationSources = {
      ...migrationSources,
      [source]: null,
    };
    const nextCandidate = getLocalMigrationCandidate(remainingSources);

    setMigrationSources(remainingSources);
    setMigrationOperation(null);
    setCloudStatus("ready");
    setCloudSnapshot(resolvedCloudData);

    const hasNormalPending = await hasPendingCloudWork(cloudUserId);
    if (hasNormalPending) {
      const visibleData = await materializeUserPendingState(
        resolvedCloudData,
        cloudUserId,
      );
      localDataStore.save(userStorageScope(cloudUserId), visibleData);
      setData(visibleData);
      setProfileDraft(visibleData.profile);
      setPendingSync(true);
    } else {
      localDataStore.save(userStorageScope(cloudUserId), resolvedCloudData);
      setData(resolvedCloudData);
      setProfileDraft(resolvedCloudData.profile);
      setPendingSync(false);
    }

    if (nextCandidate) {
      setNotice(message);
      return;
    }

    if (!reconcileNormalPending) {
      setNotice(message);
      return;
    }

    if (!hasNormalPending) {
      setNotice(message);
      return;
    }

    try {
      while (true) {
        const reconciled = await reconcilePendingAfterCloudLoad(
          supabase,
          cloudUserId,
          () => localEditGenerationRef.current,
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          return;
        }

        if (
          reconciled.localEditGeneration !== localEditGenerationRef.current ||
          (await hasPendingCloudWork(cloudUserId))
        ) {
          continue;
        }

        localDataStore.save(userStorageScope(cloudUserId), reconciled.data);
        setCloudSnapshot(reconciled.data);
        setData(reconciled.data);
        setProfileDraft(reconciled.data.profile);
        setPendingSync(false);
        setNotice(message);
        return;
      }
    } catch {
      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          cloudUserId,
        )
      ) {
        return;
      }

      setCloudStatus("unavailable");
      setCloudSnapshot(null);
      const visibleData = await materializeUserPendingState(
        localDataStore.load(userStorageScope(cloudUserId)),
        cloudUserId,
      );
      setData(visibleData);
      setProfileDraft(visibleData.profile);
      setPendingSync(true);
      setError(
        `${message} La synchronisation des autres données reprendra après le prochain chargement cloud.`,
      );
    }
  };

  const attachLocalDataToAccount = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !cloudUserId || (!migrationCandidate && !migrationOperation)) {
      return;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;
    setMigrationBusy(true);
    setError(null);

    try {
      let operation = migrationOperation;

      if (!operation) {
        if (!migrationCandidate) {
          return;
        }

        operation = await prepareMigrationOperation(
          supabase,
          userId,
          migrationCandidate.source,
          migrationCandidate.data,
        );
      }

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      setMigrationOperation(operation);
      const merged = await executeMigrationOperation(supabase, operation);

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      await completeMigrationDecision(
        merged,
        operation.source,
        "Données associées au compte.",
        true,
        operation.operationId,
      );
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationOperation(getMigrationOperation(userId));
        setError(
          "Association interrompue. Les données sont conservées et la même opération peut être terminée.",
        );
      }
    } finally {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationBusy(false);
      }
    }
  };

  const startFromCloudData = async () => {
    const supabase = getSupabaseBrowserClient();
    const source = migrationCandidate?.source ?? migrationOperation?.source;

    if (!supabase || !cloudUserId || !source) {
      return;
    }

    if (isMigrationOperationStarted(migrationOperation)) {
      return;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;
    setMigrationBusy(true);
    setError(null);

    try {
      let decisionOperation = migrationOperation;
      if (!decisionOperation && migrationCandidate) {
        decisionOperation = await prepareMigrationOperation(
          supabase,
          userId,
          migrationCandidate.source,
          migrationCandidate.data,
        );
        setMigrationOperation(decisionOperation);
      }

      const cloudData = await keepOnlyCloudData(supabase, userId);

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      if (decisionOperation) {
        const discarded = await discardPreparedMigrationOperation(
          userId,
          decisionOperation.operationId,
          decisionOperation.revision,
        );
        if (!discarded) {
          throw new Error("La décision de migration a déjà été prise ailleurs.");
        }
      }

      await completeMigrationDecision(
        cloudData,
        source,
        "Données de l’appareil ignorées. Le compte reste intact.",
        false,
      );
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setError(
          "Le compte ne peut pas être chargé. Les données de cet appareil sont conservées.",
        );
      }
    } finally {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationBusy(false);
      }
    }
  };

  const exportMigrationData = () => {
    const exportData = migrationCandidate?.data ??
      (migrationOperation
        ? migrationOperation.sourceData
        : null);

    if (!exportData) {
      return;
    }

    exportJson(
      exportData,
      `projet-centenaire-local-${currentDate}.json`,
    );
  };

  if (migrationDecisionRequired) {
    if ((!migrationCandidate && !migrationOperation) || !cloudUserId) {
      return <LoadingScreen />;
    }

    return (
      <MigrationDecisionScreen
        busy={migrationBusy}
        cloudEmail={cloudEmail}
        cloudHasProfile={Boolean(cloudSnapshot?.profile)}
        error={error}
        localHasProfile={Boolean(
          migrationCandidate?.data.profile ??
            migrationOperation?.sourceData.profile,
        )}
        onAttach={() => void attachLocalDataToAccount()}
        onExport={exportMigrationData}
        onKeepCloud={() => void startFromCloudData()}
        operationStarted={isMigrationOperationStarted(migrationOperation)}
      />
    );
  }

  const profile = data.profile;
  const activeOnboardingStep =
    onboardingStep === onboardingWelcomeStep &&
    (onboardingEntryRequested || cloudUserId || isLocalEntryModeSelected())
      ? onboardingNameStep
      : onboardingStep;

  if (!profile || onboardingPreview) {
    return (
      <Onboarding
        draft={onboardingDraft}
        error={error}
        step={activeOnboardingStep}
        onBack={() => {
          if (activeOnboardingStep === onboardingNameStep) {
            window.location.assign(
              onboardingPreview ? "/?onboarding-preview=1" : "/",
            );
            return;
          }
          setOnboardingStep(
            getPreviousOnboardingStep(
              activeOnboardingStep,
              onboardingDraft,
            ),
          );
        }}
        onAnswer={(nextDraft, nextStep) => {
          setOnboardingDraft(nextDraft);
          setError(null);
          setOnboardingStep(nextStep);
        }}
        onChange={(nextDraft) => {
          setOnboardingDraft(nextDraft);
          setError(null);
        }}
        onNext={() => {
          const stepError = getOnboardingStepError(
            onboardingDraft,
            activeOnboardingStep,
          );

          if (stepError) {
            setError(stepError);
            return;
          }

          if (activeOnboardingStep < onboardingFinalStep) {
            const referenceGoalWeight = calculateReferenceGoalWeight(
              Number(onboardingDraft.startWeightKg),
              Number(onboardingDraft.heightCm),
            );
            const nextDraft =
              activeOnboardingStep === onboardingBmiStep &&
              !onboardingDraft.goalWeightIsCustom &&
              referenceGoalWeight !== null
                ? {
                    ...onboardingDraft,
                    goalWeightKg: String(referenceGoalWeight),
                  }
                : onboardingDraft;

            if (nextDraft !== onboardingDraft) {
              setOnboardingDraft(nextDraft);
            }
            setError(null);
            setOnboardingStep(
              getNextOnboardingStep(
                activeOnboardingStep,
                nextDraft,
              ),
            );
            return;
          }

          if (onboardingPreview) {
            setError(null);
            setOnboardingStep(onboardingNameStep);
            return;
          }

          const nextProfile = buildProfile(onboardingDraft);
          const initialWeight: WeightEntry = {
            id: createId("weight"),
            date: nextProfile.startDate,
            time: currentTime(),
            weightKg: nextProfile.startWeightKg,
            createdAt: new Date().toISOString(),
          };

          saveData(
            {
              ...data,
              profile: nextProfile,
              weights: [initialWeight],
            },
            "Carnet ouvert.",
            [
              createProfileMutationDraft(nextProfile),
              createWeightMutationDraft(initialWeight),
            ],
          );
        }}
      />
    );
  }

  if (behaviorEditorOpen) {
    return (
      <BehaviorProfileEditor
        initialAssessment={profile.initialBehaviorAssessment}
        onCancel={() => setBehaviorEditorOpen(false)}
        onSave={(initialBehaviorAssessment) => {
          const nextProfile: Profile = {
            ...profile,
            initialBehaviorAssessment,
            initialFriction: legacyFrictionFromAssessment(
              initialBehaviorAssessment,
            ),
          };
          const patch = buildProfilePatch(profile, nextProfile);
          const mutation = createProfilePatchMutationDraft(patch);

          saveData(
            { ...data, profile: nextProfile },
            "Portrait initial mis à jour.",
            mutation ? [mutation] : [],
          );
          setProfileDraft(nextProfile);
          setBehaviorEditorOpen(false);
        }}
      />
    );
  }

  const todayMeals = data.meals.filter((meal) => meal.date === currentDate);
  const todayWeights = data.weights.filter((weight) => weight.date === currentDate);
  const latestTodayWeight = getLatestWeight(todayWeights);
  const latestKnownWeight = getLatestWeight(data.weights);
  const todaySmokingEntries = data.smokingEntries.filter(
    (entry) => entry.date === currentDate,
  );
  const dayNumber = Math.max(1, daysBetween(profile.startDate, currentDate) + 1);
  const smokingEnabled = isSmokingTrackingEnabled(data);
  const hasEnoughMealData = analysis.mealCount >= 5;
  const activePriorityText =
    analysis.priority.id === "insufficient-data"
      ? initialPriorityText(profile.initialFriction)
      : analysis.priority.action;
  const showMissionBlock = shouldShowActiveMission({
    showActiveMission: profile.showActiveMission,
    priority: analysis.priority,
    initialFriction: profile.initialFriction,
  });
  const smokingSummary = buildSmokingDaySummary(todaySmokingEntries);
  const supabaseConfigured = isSupabaseConfigured();

  const updateProfilePreferences = (
    nextPreferences: Partial<Pick<Profile, "darkMode" | "showActiveMission">>,
  ) => {
    const nextProfile = {
      ...profile,
      ...nextPreferences,
    };

    const mutation = createProfilePatchMutationDraft(nextPreferences);

    saveData(
      { ...data, profile: nextProfile },
      "Préférence mise à jour.",
      mutation ? [mutation] : [],
    );
  };

  const clearMealLongPress = () => {
    if (mealLongPressTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(mealLongPressTimeoutRef.current);
    mealLongPressTimeoutRef.current = null;
  };

  const startMealLongPress = (mealId: string) => {
    clearMealLongPress();
    mealLongPressTimeoutRef.current = window.setTimeout(() => {
      setOpenMealActionId(mealId);
      mealLongPressTimeoutRef.current = null;
    }, 1000);
  };

  const openWeightPanel = () => {
    setWeightDraft(
      latestTodayWeight
        ? String(latestTodayWeight.weightKg)
        : latestKnownWeight
          ? String(latestKnownWeight.weightKg)
          : String(profile.startWeightKg),
    );
    setWeightOpen(true);
  };

  const openMealPanel = () => {
    setEditingMealId(null);
    setOpenMealActionId(null);
    setMealDraft(createEmptyMealDraft(currentDate));
    setMealStep(0);
    setMealOpen(true);
  };

  const closeMealPanel = () => {
    setMealOpen(false);
    setEditingMealId(null);
    setMealStep(0);
    setMealDraft(createEmptyMealDraft(currentDate));
  };

  const openMealEditor = (meal: MealEntry) => {
    const mainSection = meal.mealStructure?.sections.find(
      (section) => section.kind === "main" || section.kind === "snack",
    );
    const starterSection = meal.mealStructure?.sections.find(
      (section) => section.kind === "starter",
    );
    const dessertSection = meal.mealStructure?.sections.find(
      (section) => section.kind === "dessert",
    );
    const reservicePassage = mainSection?.passages.find(
      (passage) => passage.index > 1,
    );

    setOpenMealActionId(null);
    setEditingMealId(meal.id);
    setMealDraft({
      kind: activeKindFromMealKind(meal.kind),
      date: meal.date,
      time: meal.time,
      freeText: meal.freeText,
      quantity: meal.quantity,
      servingPattern: meal.servingPattern ?? servingPatternFromQuantity(meal.quantity),
      mainQuantity: quantityDraftFromEstimate(
        mainSection?.quantity,
        meal.kind === "grignotage" ? "portion" : "plate",
      ),
      hungerBefore: hungerForTunnel(meal.hungerBefore),
      hungerAtReservice: meal.mealStructure?.behavior.hungerAtReservice ?? null,
      afterMeal: meal.afterMeal,
      fullnessAfter: meal.fullnessAfter ?? fullnessFromAfterMeal(meal.afterMeal),
      stopReason: meal.stopReason,
      snackingAfter: "non",
      starterTaken: meal.starterTaken ?? false,
      starterText: meal.starterText ?? "",
      starterQuantity: quantityDraftFromEstimate(
        starterSection?.quantity,
        "portion",
      ),
      dessertTaken: meal.dessertTaken ?? false,
      dessertText: meal.dessertText ?? "",
      dessertQuantity: quantityDraftFromEstimate(
        dessertSection?.quantity,
        "portion",
      ),
      snackQuantity: quantityDraftFromEstimate(mainSection?.quantity, "portion"),
      snackTrigger: meal.snackTrigger ?? null,
      snackContext: meal.snackContext ?? null,
      reserviceRelation: reservicePassage?.relationToPrevious ?? null,
      reserviceText: reservicePassage?.relationText ?? "",
      reserviceReasons: meal.mealStructure?.behavior.reserviceReasons ?? [],
      clarifications: meal.clarifications ?? [],
      questionnaireVersion: "v2",
      components: { ...meal.components },
    });
    setMealStep(0);
    setMealOpen(true);
  };

  const deleteMealFromJournal = (meal: MealEntry) => {
    setOpenMealActionId(null);

    if (!window.confirm("Supprimer ce repas ?")) {
      return;
    }

    saveData(
      {
        ...data,
        meals: deleteMealEntry(data.meals, meal.id),
      },
      "Repas supprimé.",
      [],
      cloudUserId ? [createMealDeleteMutation(cloudUserId, meal.createdAt)] : [],
    );
  };

  const addWeight = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(weightDraft.replace(",", "."));

    if (!Number.isFinite(value) || value < 40 || value > 300) {
      setError("La mesure doit être comprise entre 40 et 300 kg.");
      return false;
    }

    const entry: WeightEntry = {
      id: createId("weight"),
      date: currentDate,
      time: currentTime(),
      weightKg: roundOne(value),
      createdAt: new Date().toISOString(),
    };

    saveData(
      {
        ...data,
        weights: upsertDailyWeightEntry(data.weights, entry),
      },
      latestTodayWeight ? "Mesure mise à jour." : "Mesure ajoutée au carnet.",
      [createWeightMutationDraft(entry)],
    );
    setWeightDraft("");
    setWeightOpen(false);
    return true;
  };

  const addMealToJournal = () => {
    if (mealDraft.freeText.trim().length < 2) {
      setError("Ajoute une observation courte avant de continuer.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDraft.date)) {
      setError("Choisis une date valide.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(mealDraft.time)) {
      setError("Choisis une heure valide.");
      return;
    }

    const preparedDraft = prepareDetectedMealDraft(
      sanitizeMealDraftForKind(mealDraft),
    );
    const quantity = quantityFromServingPattern(preparedDraft.servingPattern);
    const mealStructure = buildMealStructure(preparedDraft);
    const finding = buildImmediateFinding({
      kind: preparedDraft.kind,
      servingPattern: preparedDraft.servingPattern,
      hungerBefore: preparedDraft.hungerBefore,
      fullnessAfter: preparedDraft.fullnessAfter,
      starterTaken: preparedDraft.starterTaken,
      dessertTaken: preparedDraft.dessertTaken,
      snackTrigger: preparedDraft.snackTrigger,
      snackContext: preparedDraft.snackContext,
      components: preparedDraft.components,
    });
    const editedMeal = editingMealId
      ? data.meals.find((meal) => meal.id === editingMealId)
      : null;
    const entry: MealEntry = {
      id: editedMeal?.id ?? createId("meal"),
      date: preparedDraft.date,
      time: preparedDraft.time,
      kind: preparedDraft.kind,
      freeText: preparedDraft.freeText.trim(),
      quantity,
      servingPattern: preparedDraft.servingPattern,
      hungerBefore: preparedDraft.hungerBefore,
      afterMeal: preparedDraft.fullnessAfter,
      fullnessAfter: preparedDraft.fullnessAfter,
      stopReason: preparedDraft.stopReason,
      snackingAfter: preparedDraft.snackingAfter,
      starterTaken: preparedDraft.starterTaken,
      starterText:
        preparedDraft.starterTaken && preparedDraft.starterText.trim()
          ? preparedDraft.starterText.trim()
          : null,
      dessertTaken: preparedDraft.dessertTaken,
      dessertText:
        preparedDraft.dessertTaken && preparedDraft.dessertText.trim()
          ? preparedDraft.dessertText.trim()
          : null,
      snackTrigger: preparedDraft.kind === "grignotage" ? preparedDraft.snackTrigger : null,
      snackContext: preparedDraft.kind === "grignotage" ? preparedDraft.snackContext : null,
      clarifications: preparedDraft.clarifications,
      questionnaireVersion: "v2",
      mealStructure,
      components: preparedDraft.components,
      finding,
      createdAt: editedMeal?.createdAt ?? new Date().toISOString(),
    };

    saveData(
      {
        ...data,
        meals: editedMeal
          ? updateMealEntry(data.meals, editedMeal.id, entry)
          : [...data.meals, entry],
      },
      editedMeal ? "Repas mis à jour." : "Repas ajouté au carnet.",
      [],
      cloudUserId ? [createMealUpsertMutation(cloudUserId, entry)] : [],
    );
    closeMealPanel();
  };

  const goToNextMealStep = (draftOverride?: MealDraft) => {
    const currentDraft = draftOverride ?? mealDraft;
    const stepIds = getMealTunnelStepIds(currentDraft.kind);
    const currentStepId = stepIds[mealStep];

    if (currentStepId === "time") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDraft.date)) {
        setError("Choisis une date valide.");
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(currentDraft.time)) {
        setError("Choisis une heure valide.");
        return;
      }
    }

    if (
      (currentStepId === "text" || currentStepId === "snack-text") &&
      currentDraft.freeText.trim().length < 2
    ) {
      setError("Ajoute une observation courte avant de continuer.");
      return;
    }

    if (
      currentStepId === "starter" &&
      currentDraft.starterTaken &&
      currentDraft.starterText.trim().length < 2
    ) {
      setError("Note rapidement l’entrée, ou choisis Non.");
      return;
    }

    if (
      currentStepId === "dessert" &&
      currentDraft.dessertTaken &&
      currentDraft.dessertText.trim().length < 2
    ) {
      setError("Note rapidement le dessert, ou choisis Non.");
      return;
    }

    if (
      currentStepId === "reservice-detail" &&
      hasReservice(currentDraft.servingPattern) &&
      !currentDraft.reserviceRelation
    ) {
      setError("Précise rapidement ce que contenait la reprise.");
      return;
    }

    if (
      currentStepId === "reservice-reason" &&
      shouldAskReserviceReason(currentDraft) &&
      currentDraft.reserviceReasons.length === 0
    ) {
      setError("Choisis une raison, ou Je ne sais pas.");
      return;
    }

    let nextDraft =
      currentStepId === "text" ||
      currentStepId === "snack-text" ||
      currentStepId === "starter" ||
      currentStepId === "dessert"
        ? prepareDetectedMealDraft(currentDraft)
        : currentDraft;
    let nextStepIndex = Math.min(stepIds.length - 1, mealStep + 1);

    while (
      nextStepIndex < stepIds.length - 1 &&
      shouldSkipMealStep(stepIds[nextStepIndex], nextDraft)
    ) {
      nextStepIndex += 1;
    }

    if (stepIds[nextStepIndex] === "finding") {
      nextDraft = prepareDetectedMealDraft(nextDraft);
    }

    setError(null);
    setMealDraft(nextDraft);
    setMealStep(nextStepIndex);
  };

  const goToPreviousMealStep = () => {
    const stepIds = getMealTunnelStepIds(mealDraft.kind);
    let previousStepIndex = Math.max(0, mealStep - 1);

    while (
      previousStepIndex > 0 &&
      shouldSkipMealStep(stepIds[previousStepIndex], mealDraft)
    ) {
      previousStepIndex -= 1;
    }

    setMealStep(previousStepIndex);
  };

  const addSmokingEntry = () => {
    const entry = {
      id: createId("smoking"),
      date: currentDate,
      time: currentTime(),
      state: smokingState,
      note: smokingNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    saveData(
      {
        ...data,
        smokingEntries: upsertSmokingEntry(data.smokingEntries, entry),
      },
      "Tabac ajouté au carnet.",
      [createSmokingMutationDraft(entry)],
    );
    setSmokingState("aucun");
    setSmokingNote("");
    setSmokingOpen(false);
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    cloudGenerationRef.current += 1;
    activeCloudUserIdRef.current = null;
    if (cloudUserId) {
      localDataStore.save(userStorageScope(cloudUserId), data);
    }
    await supabase?.auth.signOut();
    clearLocalEntryMode();
    const guestData = localDataStore.load(guestStorageScope);
    setCloudUserId(null);
    setCloudEmail(null);
    setCloudStatus("ready");
    setCloudSnapshot(null);
    setMigrationSources(emptyMigrationSources);
    setMigrationOperation(null);
    setPendingSync(false);
    setData(guestData);
    setProfileDraft(guestData.profile);
    setOnboardingStep(0);
    window.location.assign("/login");
  };

  const renderToday = () => (
    <TodayScreen
      currentDate={currentDate}
      dayNumber={dayNumber}
      formatKg={formatKg}
      formatMealDetail={mealDetailLine}
      formatMealTags={mealTagLabels}
      formatSmokingEntry={smokingEntryLine}
      latestWeight={latestKnownWeight}
      mealActionMenuId={openMealActionId}
      repereText={activePriorityText}
      showRepere={showMissionBlock}
      smokingEnabled={smokingEnabled}
      smokingSummary={smokingSummary}
      todayMeals={todayMeals}
      todaySmokingEntries={todaySmokingEntries}
      todayWeights={todayWeights}
      weightDraft={weightDraft}
      weightOpen={weightOpen}
      onCancelWeight={() => setWeightOpen(false)}
      onChangeWeightDraft={setWeightDraft}
      onCloseMealActionMenu={() => setOpenMealActionId(null)}
      onDeleteMeal={deleteMealFromJournal}
      onEditMeal={openMealEditor}
      onLongPressMealCancel={clearMealLongPress}
      onLongPressMealStart={startMealLongPress}
      onOpenMeal={openMealPanel}
      onOpenMealActionMenu={setOpenMealActionId}
      onOpenSmoking={() => setSmokingOpen(true)}
      onOpenWeight={openWeightPanel}
      onSubmitWeight={addWeight}
    />
  );

  const renderJournal = () => {
    const selectedWeekAnalysis = calculateWeeklyAnalysis(data, journalWeekDate);
    const canGoNextDay = journalDate < currentDate;
    const canGoNextWeek = startOfWeek(journalWeekDate) < startOfWeek(currentDate);

    return (
      <div className="space-y-5">
        <PageTitle kicker="Carnet" title="Mémoire">
          <p>Le poids d’abord, puis les faits qui aident à comprendre.</p>
        </PageTitle>

        <JournalWeightOverview profile={profile} weights={data.weights} />

        <JournalSegmentedControl value={journalView} onChange={setJournalView} />

        {pendingSync ? (
          <Surface className="px-4 py-3" variant="subtle">
            <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
              Des changements locaux attendent la synchronisation.
            </p>
          </Surface>
        ) : null}

        {journalView === "days" ? (
          <JournalDaysView
            currentDate={currentDate}
            date={journalDate}
            events={buildJournalDayEvents(data, journalDate)}
            canGoNext={canGoNextDay}
            onDeleteMeal={deleteMealFromJournal}
            onEditMeal={openMealEditor}
            onGoToday={() => setJournalDate(currentDate)}
            onNext={() => setJournalDate((date) => addDays(date, 1))}
            onPrevious={() => setJournalDate((date) => addDays(date, -1))}
          />
        ) : (
          <JournalWeeksView
            analysis={selectedWeekAnalysis}
            canGoNext={canGoNextWeek}
            currentDate={currentDate}
            smokingEnabled={smokingEnabled}
            onGoCurrent={() => setJournalWeekDate(currentDate)}
            onNext={() => setJournalWeekDate((date) => addDays(date, 7))}
            onPrevious={() => setJournalWeekDate((date) => addDays(date, -7))}
          />
        )}
      </div>
    );
  };

  const renderInsights = () => (
    <div className="space-y-5">
      <PageTitle kicker="Constats" title="Bilan de semaine">
        <p>Les faits sont lus par domaine, sans mélanger les signaux.</p>
      </PageTitle>
      <section className={sectionClass}>
        <p className={annotationClass}>Alimentation</p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Fact label="Repas observés" value={analysis.mealCount} />
          {hasEnoughMealData ? (
            <>
              <Fact label="Une assiette" value={analysis.onePlateMeals} />
              <Fact label="Deux assiettes ou plus" value={analysis.multiPlateMeals} />
              <Fact label="Sans faim" value={analysis.mealsStartedWithoutHunger} />
              <Fact label="Trop plein" value={analysis.mealsEndedTooFull} />
              <Fact
                label="Grignotages sans faim"
                value={analysis.snackingWithoutHunger}
              />
            </>
          ) : null}
        </dl>
        {!hasEnoughMealData ? (
          <p className="mt-5 leading-7 text-[var(--pc-color-text)]">
            Données insuffisantes pour établir un point de friction fiable.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className={annotationClass}>Point de friction</p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--pc-color-text)]">
                {analysis.frictionPoint}
              </h2>
              <p className="mt-3 leading-7 text-[var(--pc-color-text)]">
                {analysis.priority.rationale}
              </p>
            </div>
            <div>
              <p className={annotationClass}>Priorité active</p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--pc-color-text)]">
                {analysis.priority.label}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
                Niveau de preuve : {analysis.priority.evidenceLevel}
              </p>
              <p className="mt-4 rounded-[18px] bg-[var(--pc-color-primary-soft)] px-4 py-3 leading-7 text-[var(--pc-color-primary)]">
                {analysis.priority.action}
              </p>
            </div>
          </div>
        )}
      </section>

      {smokingEnabled ? (
        <section className={sectionClass}>
          <p className={annotationClass}>Tabac</p>
          {analysis.smokingEntries === 0 ? (
            <p className="mt-3 leading-7 text-[var(--pc-color-text)]">
              Aucune donnée tabac renseignée cette semaine.
            </p>
          ) : (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Fact label="Données tabac" value={analysis.smokingEntries} />
                <Fact
                  label="Jours sans cigarette renseignés"
                  value={analysis.smokeFreeDays}
                />
              </dl>
              <p className="mt-5 leading-7 text-[var(--pc-color-text)]">
                Les jours non renseignés restent neutres : absence de donnée ne
                signifie pas échec.
              </p>
            </>
          )}
        </section>
      ) : null}

      <section className={sectionClass}>
        <p className={annotationClass}>Poids</p>
        <p className="mt-2 text-sm text-[var(--pc-color-text-muted)]">
          Moyenne hebdomadaire :{" "}
          {analysis.weightAverageKg === null
            ? "Données insuffisantes"
            : formatKg(analysis.weightAverageKg)}
        </p>
        <div className="mt-4">
          <WeightTrendChart weights={data.weights} />
        </div>
      </section>
    </div>
  );

  const renderProfile = () => {
    const smokingSummaryText = profile.smokingGoal
      ? `${smokingStatusLabels[profile.smokingStatus]} · ${smokingGoalLabels[profile.smokingGoal]}`
      : smokingStatusLabels[profile.smokingStatus];
    const behaviorAssessment = profile.initialBehaviorAssessment;

    return (
      <div className="space-y-5">
        <PageTitle kicker="Profil" title="Paramètres">
          <p>Les réglages essentiels, le compte et les options avancées.</p>
        </PageTitle>

        {profileDraft ? (
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <p className={annotationClass}>Profil</p>
              <button
                className="rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--pc-color-primary)] transition active:scale-[0.98]"
                type="button"
                onClick={() => setProfileEditorOpen((open) => !open)}
              >
                {profileEditorOpen ? "Fermer" : "Modifier"}
              </button>
            </div>
            <button
              className="mt-4 grid w-full gap-3 rounded-[20px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 text-left shadow-[var(--pc-shadow-level-1)] transition active:scale-[0.99]"
              type="button"
              onClick={() => setProfileEditorOpen(true)}
            >
              <div>
                <p className="font-serif text-2xl leading-tight text-[var(--pc-color-text)]">
                  {profile.firstName || "Profil"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--pc-color-text-muted)]">
                  {profile.age} ans · {profile.heightCm} cm
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-[var(--pc-color-text)]">
                <span>Départ · {formatKg(profile.startWeightKg)}</span>
                <span>Objectif · {formatKg(profile.goalWeightKg)}</span>
                <span className="col-span-2">Tabac · {smokingSummaryText}</span>
              </div>
            </button>

            {profileEditorOpen ? (
              <form
                className="mt-5 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (
                    profileDraft.firstName.trim().length === 0 ||
                    profileDraft.age < 18 ||
                    profileDraft.heightCm < 120 ||
                    profileDraft.startWeightKg < 40 ||
                    profileDraft.goalWeightKg < 40
                  ) {
                    setError("Vérifie les données du profil.");
                    return;
                  }

                  const patch = buildProfilePatch(profile, profileDraft);
                  const mutation = createProfilePatchMutationDraft(patch);

                  saveData(
                    { ...data, profile: profileDraft },
                    "Profil mis à jour.",
                    mutation ? [mutation] : [],
                  );
                  setProfileEditorOpen(false);
                }}
              >
                <TextInput
                  label="Prénom"
                  value={profileDraft.firstName}
                  onChange={(value) =>
                    setProfileDraft({ ...profileDraft, firstName: value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Âge"
                    value={profileDraft.age}
                    onChange={(value) =>
                      setProfileDraft({ ...profileDraft, age: value })
                    }
                  />
                  <NumberInput
                    label="Taille en cm"
                    value={profileDraft.heightCm}
                    onChange={(value) =>
                      setProfileDraft({ ...profileDraft, heightCm: value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Poids de départ"
                    value={profileDraft.startWeightKg}
                    onChange={(value) =>
                      setProfileDraft({ ...profileDraft, startWeightKg: value })
                    }
                  />
                  <NumberInput
                    label="Poids objectif"
                    value={profileDraft.goalWeightKg}
                    onChange={(value) =>
                      setProfileDraft({ ...profileDraft, goalWeightKg: value })
                    }
                  />
                </div>
                <ChoiceLine
                  options={smokingStatusLabels}
                  value={profileDraft.smokingStatus}
                  onChange={(value) =>
                    setProfileDraft({
                      ...profileDraft,
                      smokingStatus: value,
                      smokingGoal: needsSmokingGoal(value)
                        ? profileDraft.smokingGoal ?? "observer"
                        : undefined,
                    })
                  }
                />
                {needsSmokingGoal(profileDraft.smokingStatus) ? (
                  <ChoiceLine
                    options={smokingGoalLabels}
                    value={profileDraft.smokingGoal ?? "observer"}
                    onChange={(value) =>
                      setProfileDraft({ ...profileDraft, smokingGoal: value })
                    }
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Enregistrer</Button>
                  <Button
                    variant="line"
                    onClick={() => {
                      setProfileDraft(profile);
                      setProfileEditorOpen(false);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className={sectionClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={annotationClass}>Portrait initial</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--pc-color-text)]">
                Tes pistes à observer
              </h2>
            </div>
            <UIButton
              className="shrink-0"
              variant="secondary"
              onClick={() => setBehaviorEditorOpen(true)}
            >
              {behaviorAssessment ? "Revoir" : "Compléter"}
            </UIButton>
          </div>
          {behaviorAssessment?.hypotheses.length ? (
            <ul className="mt-4 space-y-3">
              {behaviorAssessment.hypotheses.map((hypothesis) => (
                <li
                  className="flex gap-3 text-sm leading-6 text-[var(--pc-color-text-muted)]"
                  key={hypothesis.axis}
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
                  />
                  {behaviorHypothesisText(hypothesis.axis)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--pc-color-text-muted)]">
              {behaviorAssessment
                ? "Aucune tendance nette ne ressort pour le moment."
                : "Ce portrait aide Haru à choisir les premières situations à observer."}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-[var(--pc-color-text-muted)]">
            Réponses déclarées, modifiables à tout moment. Ce n’est pas un
            diagnostic.
          </p>
        </section>

        <section className={sectionClass}>
          <p className={annotationClass}>Préférences</p>
          <div className="mt-4 grid gap-3">
            <SwitchRow
              checked={profile.darkMode}
              label="Mode sombre"
              onChange={(checked) => updateProfilePreferences({ darkMode: checked })}
            />
            <SwitchRow
              checked={profile.showActiveMission}
              label="Afficher la mission en cours"
              onChange={(checked) =>
                updateProfilePreferences({ showActiveMission: checked })
              }
            />
          </div>
        </section>

        <section className={sectionClass}>
          <p className={annotationClass}>Compte</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--pc-color-text)]">
                {cloudUserId ? "Connecté" : "Non connecté"}
              </p>
              <p className="mt-1 break-words text-sm text-[var(--pc-color-text-muted)]">
                {cloudUserId
                  ? cloudEmail ?? "Compte cloud actif"
                  : "Le carnet fonctionne en local sur cet appareil."}
              </p>
            </div>
            {cloudUserId ? (
              <div className="grid gap-2">
                <Button onClick={signOut} variant="line">
                  Se déconnecter
                </Button>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D7B8B2] bg-[#FFF7F3] px-5 text-sm font-semibold text-[#8A3B32] transition active:scale-[0.99]"
                  href="/account"
                >
                  Supprimer mon compte
                </Link>
              </div>
            ) : (
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-5 text-sm font-semibold text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)] transition active:scale-[0.99]"
                href="/login"
              >
                Se connecter
              </Link>
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <p className={annotationClass}>Options avancées</p>
          <details className="mt-4 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--pc-color-text)]">
              Export, import et réinitialisation
            </summary>
            <div className="mt-4 grid gap-2">
              <Button
                onClick={() => {
                  exportJson(data, `projet-centenaire-carnet-${currentDate}.json`);
                }}
                variant="line"
              >
                <Download aria-hidden="true" size={17} />
                Export JSON
              </Button>
              <Button onClick={() => importInputRef.current?.click()} variant="line">
                <Upload aria-hidden="true" size={17} />
                Import JSON
              </Button>
              <input
                ref={importInputRef}
                accept="application/json"
                className="hidden"
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  try {
                    const parsedImport: unknown = JSON.parse(await file.text());
                    const imported = mergeImportedData(data, parsedImport);

                    if (imported.recognizedContributionCount === 0) {
                      setError("Aucune donnée nouvelle valide n’a été reconnue.");
                      return;
                    }

                    const importedMealMutations = cloudUserId
                      ? imported.mealUpserts.map((meal) =>
                          createMealUpsertMutation(cloudUserId, meal),
                        )
                      : [];
                    saveData(
                      imported.data,
                      "Import terminé.",
                      imported.nonMealMutations,
                      importedMealMutations,
                    );
                  } catch (importError) {
                    setError(
                      importError instanceof ImportValidationError
                        ? "Une date ou heure du fichier est invalide. Aucune donnée n’a été importée."
                        : "Le fichier JSON n'a pas pu être importé.",
                    );
                  } finally {
                    event.target.value = "";
                  }
                }}
              />
              <Button
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Réinitialiser les données locales de cet appareil ?",
                    )
                  ) {
                    return;
                  }

                  if (cloudUserId) {
                    const supabase = getSupabaseBrowserClient();

                    if (!supabase) {
                      setError("Connexion cloud indisponible.");
                      return;
                    }

                    cloudGenerationRef.current += 1;
                    activeCloudUserIdRef.current = cloudUserId;
                    setConnectedResetStatus("running");

                    try {
                      const cloudData = await resetConnectedLocalData(
                        supabase,
                        cloudUserId,
                      );
                      localEditGenerationRef.current += 1;
                      setCloudStatus("ready");
                      setCloudSnapshot(cloudData);
                      setMigrationOperation(null);
                      setData(cloudData);
                      setProfileDraft(cloudData.profile);
                      setPendingSync(false);
                      setNotice("Données locales réinitialisées.");
                      setConnectedResetStatus("idle");
                    } catch {
                      setData(createEmptyData());
                      setProfileDraft(null);
                      setCloudStatus("unavailable");
                      setCloudSnapshot(null);
                      setPendingSync(false);
                      setConnectedResetStatus("reload-required");
                    }
                    return;
                  }

                  const reset = localDataStore.reset(guestStorageScope);
                  setData(reset);
                  setProfileDraft(null);
                  setOnboardingStep(0);
                  setMigrationSources((current) => ({
                    ...current,
                    guest: null,
                  }));
                  setPendingSync(false);
                  setNotice("Carnet local réinitialisé.");
                }}
                variant="signal"
              >
                <RefreshCw aria-hidden="true" size={17} />
                Réinitialiser données locales
              </Button>
            </div>
          </details>
        </section>
      </div>
    );
  };

  const content = {
    today: renderToday,
    journal: renderJournal,
    insights: renderInsights,
    profile: renderProfile,
  }[activeTab]();

  return (
    <main className="pc-screen pc-app-screen-with-nav pc-motion-safe">
      {notice || error || pendingSync ? (
        <div aria-live="polite" className="app-toast-stack">
          {notice ? (
            <p className="app-toast app-toast-auto border-[var(--pc-color-success)] bg-[var(--pc-color-success-soft)] text-[var(--pc-color-text)]">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="app-toast app-toast-auto border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] text-[var(--pc-color-text)]">
              {error}
            </p>
          ) : null}
          {pendingSync ? (
            <p className="app-toast border-[var(--pc-color-warning)] bg-[var(--pc-color-warning-soft)] text-[var(--pc-color-text)]">
              Données en attente de synchronisation.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mx-auto max-w-[var(--pc-content-max-width)]">
        <AppHeader className="mb-4" />

        {!supabaseConfigured ? (
          <p className="mb-4 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-3 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
            Mode local actif. Configure Supabase pour activer la sauvegarde cloud.
          </p>
        ) : null}

        {content}
      </div>

      {smokingOpen ? (
        <SmokingPanel
          note={smokingNote}
          state={smokingState}
          onAdd={addSmokingEntry}
          onChangeNote={setSmokingNote}
          onChangeState={setSmokingState}
          onClose={() => setSmokingOpen(false)}
        />
      ) : null}

      {mealOpen ? (
        <MealObservation
          draft={mealDraft}
          initialObservationActive={isInitialObservationDay(dayNumber)}
          step={mealStep}
          submitLabel={editingMealId ? "Mettre à jour" : "Ajouter au carnet"}
          onAdd={addMealToJournal}
          onChange={setMealDraft}
          onClose={closeMealPanel}
          onNext={goToNextMealStep}
          onPrevious={goToPreviousMealStep}
        />
      ) : null}

      <BottomNav<NavigationTabId>
        activeId={activeTab}
        items={tabs}
        onChange={(nextTab) => {
          if (nextTab === "sport") {
            window.history.replaceState(
              null,
              "",
              appResumePath(activeTab),
            );
            window.location.assign("/sport");
            return;
          }

          setActiveTab(nextTab);
        }}
      />
    </main>
  );
}

function Onboarding({
  draft,
  error,
  step,
  onBack,
  onAnswer,
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  error: string | null;
  step: number;
  onBack: () => void;
  onAnswer: (draft: OnboardingDraft, nextStep: number) => void;
  onChange: (draft: OnboardingDraft) => void;
  onNext: () => void;
}) {
  const visibleStep = step;
  const [finalPreparationComplete, setFinalPreparationComplete] =
    useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [visibleStep]);

  useEffect(() => {
    if (
      visibleStep !== onboardingFinalStep ||
      finalPreparationComplete
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFinalPreparationComplete(true);
    }, ONBOARDING_PREPARATION_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [finalPreparationComplete, visibleStep]);

  if (visibleStep === onboardingFinalStep && !finalPreparationComplete) {
    return <OnboardingPreparationScreen />;
  }

  const showPrimaryAction = [
    onboardingNameStep,
    onboardingBirthDateStep,
    onboardingHeightStep,
    onboardingWeightStep,
    onboardingBmiStep,
    onboardingGoalStep,
    onboardingContextsStep,
    onboardingPerceivedFrictionsStep,
    onboardingProfessionalSupportStep,
    onboardingFinalStep,
  ].includes(visibleStep);
  const primaryLabel =
    visibleStep === onboardingFinalStep
      ? "Commencer les 7 jours"
      : visibleStep === onboardingProfessionalSupportStep &&
          draft.professionalSupport === undefined
        ? "Passer"
        : "Continuer";
  const progressStep = Math.min(visibleStep, onboardingFinalStep - 1);
  const bmi = calculateBmi(
    Number(draft.startWeightKg),
    Number(draft.heightCm),
  );
  const bmiClassification = bmi === null ? null : classifyAdultBmi(bmi);
  const referenceGoalWeight = calculateReferenceGoalWeight(
    Number(draft.startWeightKg),
    Number(draft.heightCm),
  );
  const assessmentPreview = buildBehaviorAssessmentFromDraft(
    draft,
    new Date().toISOString(),
  );
  const behaviorQuestion = behaviorQuestions[visibleStep];
  const actions = showPrimaryAction ? (
    <UIButton fullWidth onClick={onNext}>
      {primaryLabel}
    </UIButton>
  ) : null;
  const backAction =
    visibleStep > onboardingWelcomeStep ? (
      <UIIconButton
        className="rounded-full border-transparent"
        label="Retour"
        onClick={onBack}
      >
        <ChevronLeft aria-hidden="true" size={24} />
      </UIIconButton>
    ) : undefined;

  return (
    <OnboardingLayout
      actions={actions}
      backAction={backAction}
      currentStep={progressStep}
      error={error ? <ErrorState message={error} /> : undefined}
      showProgress={visibleStep > 0 && visibleStep < onboardingFinalStep}
      totalSteps={onboardingFinalStep - 1}
    >
      {visibleStep === onboardingNameStep ? (
        <OnboardingQuestion
          description="Le carnet utilise ce prénom uniquement dans l’application."
          title="Comment tu veux qu’on t’appelle ?"
        >
          <FormField id="onboarding-first-name" label="Prénom">
            <UITextInput
              autoComplete="given-name"
              value={draft.firstName}
              onChange={(event) =>
                onChange({ ...draft, firstName: event.target.value })
              }
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingBirthDateStep ? (
        <OnboardingQuestion title="Quelle est ta date de naissance ?">
          <DateWheelPicker
            onChange={(value) => onChange({ ...draft, birthDate: value })}
            referenceDate={draft.startDate}
            value={draft.birthDate}
          />
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingHeightStep ? (
        <OnboardingQuestion title="Quelle est ta taille ?">
          <WheelPicker
            ariaLabel="Taille"
            max={220}
            min={100}
            onChange={(value) => onChange({ ...draft, heightCm: value })}
            suggestedValue={170}
            unit="cm"
            value={draft.heightCm}
          />
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingWeightStep ? (
        <OnboardingQuestion title="Quel est ton poids actuel ?">
          <WheelPicker
            ariaLabel="Poids actuel"
            max={250}
            min={30}
            onChange={(value) => onChange({ ...draft, startWeightKg: value })}
            suggestedValue={100}
            unit="kg"
            value={draft.startWeightKg}
          />
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingBmiStep && bmi !== null && bmiClassification ? (
        <section className="space-y-6" aria-labelledby="onboarding-bmi-title">
          <div className="space-y-3">
            <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
              État des lieux
            </p>
            <h1
              className="max-w-[18ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
              id="onboarding-bmi-title"
            >
              Ton point de départ
            </h1>
          </div>
          <Surface className="space-y-4 p-5 min-[390px]:p-6">
            <div>
              <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
                IMC estimé
              </p>
              <p className="mt-1 text-4xl leading-none font-bold text-[var(--pc-color-text)]">
                {bmi.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}
              </p>
            </div>
            <p className="text-base leading-6 text-[var(--pc-color-text)]">
              Selon les repères adultes, cette valeur se situe {bmiClassification.visibleLabel}.
            </p>
            <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
              C’est un indicateur de santé, pas un jugement. Il ne résume ni ta
              santé, ni ta valeur, ni les raisons de ta situation.
            </p>
            <p className="text-xs leading-5 text-[var(--pc-color-text-muted)]">
              Repère médical · {bmiClassification.medicalLabel}
            </p>
          </Surface>
          <p className="text-base leading-6 text-[var(--pc-color-text-muted)]">
            Haru va maintenant chercher les situations et les habitudes qui
            méritent d’être observées.
          </p>
        </section>
      ) : null}

      {visibleStep === onboardingGoalStep ? (
        <OnboardingQuestion
          description={
            referenceGoalWeight === null
              ? "C’est un repère. Il pourra évoluer plus tard."
              : `Le « poids idéal » n’est pas une valeur absolue. Haru a placé la roue sur ${referenceGoalWeight} kg, un repère calculé à partir de ta taille et de la zone d’IMC de référence. Tu peux le modifier.`
          }
          title="Quel poids veux-tu viser pour commencer ?"
        >
          <WheelPicker
            ariaLabel="Objectif de poids"
            max={250}
            min={30}
            onChange={(value) =>
              onChange({
                ...draft,
                goalWeightKg: value,
                goalWeightIsCustom: true,
              })
            }
            suggestedValue={
              referenceGoalWeight ?? (Number(draft.startWeightKg) || 80)
            }
            unit="kg"
            value={draft.goalWeightKg}
          />
        </OnboardingQuestion>
      ) : null}

      {behaviorQuestion ? (
        <BehaviorFrequencyQuestion
          answer={draft.behaviorAnswers[behaviorQuestion.key]}
          questionId={behaviorQuestion.key}
          title={behaviorQuestion.title}
          onSelect={(answer) => {
            const nextDraft = {
              ...draft,
              behaviorAnswers: {
                ...draft.behaviorAnswers,
                [behaviorQuestion.key]: answer,
              },
            };
            onAnswer(nextDraft, Math.min(onboardingContextsStep, visibleStep + 1));
          }}
        />
      ) : null}

      {visibleStep === onboardingContextsStep ? (
        <OnboardingQuestion
          description="Tu peux en choisir plusieurs. Les deux dernières réponses sont exclusives."
          title="Dans quelles situations cela arrive-t-il le plus souvent ?"
        >
          <div className="grid gap-2">
            {Object.entries(behaviorContextLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.contexts.includes(key as BehaviorContext)}
                key={key}
                label={label}
                name="behavior-context"
                type="checkbox"
                value={key}
                onChange={(event) => {
                  const context = key as BehaviorContext;
                  const contexts = toggleExclusiveSelection(
                    draft.contexts,
                    context,
                    event.target.checked,
                    ["no-specific-context", "unknown"],
                  );
                  onChange({ ...draft, contexts });
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingPerceivedFrictionsStep ? (
        <OnboardingQuestion
          description="Tu peux en choisir plusieurs. Le carnet vérifiera ensuite cette première impression."
          title="Qu’est-ce qui semble le plus te freiner aujourd’hui ?"
        >
          <div className="grid gap-2">
            {Object.entries(perceivedFrictionLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.perceivedFrictions.includes(
                  key as PerceivedFriction,
                )}
                key={key}
                label={label}
                name="perceived-friction"
                type="checkbox"
                value={key}
                onChange={(event) => {
                  const friction = key as PerceivedFriction;
                  const perceivedFrictions = toggleExclusiveSelection(
                    draft.perceivedFrictions,
                    friction,
                    event.target.checked,
                    ["unknown"],
                  );
                  onChange({ ...draft, perceivedFrictions });
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingProfessionalSupportStep ? (
        <OnboardingQuestion
          description="Cette question est facultative. Haru reste un outil d’observation et ne remplace pas cet accompagnement."
          title="Es-tu actuellement accompagné par un professionnel pour ton poids, ton alimentation ou un trouble alimentaire ?"
        >
          <div className="grid gap-2">
            {Object.entries(professionalSupportLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.professionalSupport === key}
                key={key}
                label={label}
                name="professional-support"
                value={key}
                onChange={() =>
                  onChange({
                    ...draft,
                    professionalSupport: key as ProfessionalSupportStatus,
                  })
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingSmokingStep ? (
        <OnboardingQuestion
          description="Le tabac sera suivi séparément de l’alimentation."
          title="Tu fumes actuellement ?"
        >
          <div aria-label="Statut tabac" className="grid gap-2" role="radiogroup">
            {Object.entries(onboardingSmokingLabels).map(([key, label]) => (
              <HoldChoiceCard
                checked={draft.smokingStatus === key}
                key={key}
                label={label}
                onConfirm={() => {
                  const nextDraft = {
                    ...draft,
                    smokingStatus: key as SmokingStatus,
                    smokingGoal: undefined,
                  };
                  onAnswer(
                    nextDraft,
                    getNextOnboardingStep(visibleStep, nextDraft),
                  );
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingSmokingGoalStep ? (
        <OnboardingQuestion
          description="Cette réponse sert seulement à adapter le suivi tabac."
          title="Qu’aimerais-tu faire concernant le tabac ?"
        >
          <div aria-label="Objectif tabac" className="grid gap-2" role="radiogroup">
            {Object.entries(onboardingSmokingGoalLabels).map(([key, label]) => (
              <HoldChoiceCard
                checked={draft.smokingGoal === key}
                key={key}
                label={label}
                onConfirm={() => {
                  const nextDraft = {
                    ...draft,
                    smokingGoal: key as SmokingGoal,
                  };
                  onAnswer(nextDraft, onboardingFinalStep);
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === onboardingFinalStep ? (
        <section className="space-y-5" aria-labelledby="onboarding-priority">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Ton bilan
          </p>
          <h1
            className="max-w-[19ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
            id="onboarding-priority"
          >
            Voilà ce que nous allons observer.
          </h1>
          <dl className="grid grid-cols-2 gap-3">
            {bmi !== null ? (
              <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] p-4">
                <dt className="text-xs font-semibold text-[var(--pc-color-text-muted)]">
                  IMC estimé
                </dt>
                <dd className="mt-1 text-2xl font-bold text-[var(--pc-color-text)]">
                  {bmi.toLocaleString("fr-FR", {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}
                </dd>
              </div>
            ) : null}
            <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]">
              <dt className="text-xs font-semibold text-[var(--pc-color-text-muted)]">
                Poids visé
              </dt>
              <dd className="mt-1 text-2xl font-bold text-[var(--pc-color-text)]">
                {draft.goalWeightKg} kg
              </dd>
            </div>
          </dl>
          <Surface className="space-y-3 p-5" variant="subtle">
            <p className="text-sm font-semibold text-[var(--pc-color-text)]">
              {assessmentPreview.hypotheses.length > 0
                ? assessmentPreview.hypotheses.length === 1
                  ? "Une piste mérite d’être observée"
                  : "Deux pistes méritent d’être observées"
                : "Aucune tendance nette pour le moment"}
            </p>
            {assessmentPreview.hypotheses.length > 0 ? (
              <ul className="space-y-3">
                {assessmentPreview.hypotheses.map((hypothesis) => (
                  <li
                    className="flex gap-3 text-sm leading-6 text-[var(--pc-color-text-muted)]"
                    key={hypothesis.axis}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
                    />
                    {behaviorHypothesisText(hypothesis.axis)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
                Tes réponses ne dessinent pas de piste dominante. C’est aussi
                une information utile.
              </p>
            )}
          </Surface>
          <Surface className="space-y-4 p-5">
            <div className="space-y-2">
              <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
                Les 7 prochains jours
              </p>
              <h2 className="text-xl leading-7 font-bold text-[var(--pc-color-text)]">
                Vis comme d’habitude.
              </h2>
            </div>
            <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
              Avant de commencer à changer tes habitudes, j’ai besoin de
              comprendre comment tu fonctionnes vraiment. Pendant sept jours,
              mange et organise tes journées comme tu le fais habituellement.
              Ne change rien exprès pour l’application.
            </p>
            <ul className="space-y-3 text-sm leading-6 text-[var(--pc-color-text-muted)]">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]" />
                Renseigne chaque repas avec soin : contenu, quantités, faim et
                sensations.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]" />
                Sois honnête, même lorsque la journée ne se déroule pas comme
                prévu.
              </li>
            </ul>
            <p className="text-sm leading-6 font-semibold text-[var(--pc-color-text)]">
              Il n’y a rien à réussir ni à rater. Plus les faits seront fidèles
              à ton quotidien, plus je pourrai t’aider justement.
            </p>
          </Surface>
        </section>
      ) : null}
    </OnboardingLayout>
  );
}

const behaviorQuestions: Record<
  number,
  { key: keyof InitialBehaviorAnswers; title: string }
> = {
  7: {
    key: "rhythm",
    title: "Sur une semaine habituelle, t’arrive-t-il de sauter un repas ou de manger beaucoup plus tard que prévu ?",
  },
  8: {
    key: "hunger",
    title: "T’arrive-t-il de commencer un repas avec une faim difficile à calmer ?",
  },
  9: {
    key: "satietyControl",
    title: "T’arrive-t-il de continuer à manger alors que tu n’as plus vraiment faim ?",
  },
  10: {
    key: "emotional",
    title: "Le stress, la fatigue, l’ennui ou une contrariété te donnent-ils envie de manger ?",
  },
  11: {
    key: "externalCues",
    title: "La vue, l’odeur ou la présence d’un aliment te donnent-elles envie de manger sans faim ?",
  },
  12: {
    key: "habitContext",
    title: "T’arrive-t-il de manger uniquement parce que c’est l’heure ou parce que les autres mangent ?",
  },
  13: {
    key: "restrictionRebound",
    title: "Après t’être beaucoup privé, t’arrive-t-il de manger nettement plus ensuite ?",
  },
};

function BehaviorFrequencyQuestion({
  answer,
  onSelect,
  questionId,
  title,
}: {
  answer: BehaviorFrequency | undefined;
  onSelect: (answer: BehaviorFrequency) => void;
  questionId: string;
  title: string;
}) {
  return (
    <OnboardingQuestion title={title}>
      <div aria-label={title} className="grid gap-2" role="radiogroup">
        {behaviorFrequencyChoices.map((choice) => (
          <HoldChoiceCard
            checked={answer === choice.value}
            key={holdChoiceInstanceKey(questionId, choice.value)}
            label={choice.label}
            onConfirm={() => onSelect(choice.value)}
          />
        ))}
      </div>
    </OnboardingQuestion>
  );
}

type BehaviorAssessmentDraft = Pick<
  OnboardingDraft,
  | "behaviorAnswers"
  | "contexts"
  | "perceivedFrictions"
  | "professionalSupport"
>;

const behaviorEditorFinalStep = 10;

function BehaviorProfileEditor({
  initialAssessment,
  onCancel,
  onSave,
}: {
  initialAssessment?: InitialBehaviorAssessment;
  onCancel: () => void;
  onSave: (assessment: InitialBehaviorAssessment) => void;
}) {
  const [step, setStep] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BehaviorAssessmentDraft>(() => ({
    behaviorAnswers: initialAssessment
      ? { ...initialAssessment.answers }
      : {
          rhythm: undefined,
          hunger: undefined,
          satietyControl: undefined,
          emotional: undefined,
          externalCues: undefined,
          habitContext: undefined,
          restrictionRebound: undefined,
        },
    contexts: initialAssessment?.contexts ?? [],
    perceivedFrictions: initialAssessment?.perceivedFrictions ?? [],
    professionalSupport: initialAssessment?.professionalSupport,
  }));
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  const question = behaviorQuestions[onboardingBehaviorStartStep + step];
  const assessmentPreview = buildBehaviorAssessmentFromDraft(
    draft,
    new Date().toISOString(),
  );

  const goForward = () => {
    if (step === 7 && draft.contexts.length === 0) {
      setEditorError("Choisis au moins une situation.");
      return;
    }
    if (step === 8 && draft.perceivedFrictions.length === 0) {
      setEditorError("Choisis au moins un point.");
      return;
    }
    if (step === behaviorEditorFinalStep) {
      if (!hasCompleteBehaviorAnswers(draft.behaviorAnswers)) {
        setEditorError("Complète les réponses précédentes.");
        return;
      }
      onSave(
        buildBehaviorAssessmentFromDraft(draft, new Date().toISOString()),
      );
      return;
    }

    setEditorError(null);
    setStep((current) => Math.min(behaviorEditorFinalStep, current + 1));
  };

  const actions =
    step >= 7 ? (
      <UIButton fullWidth onClick={goForward}>
        {step === behaviorEditorFinalStep
          ? "Enregistrer le portrait"
          : step === 9 && draft.professionalSupport === undefined
            ? "Passer"
            : "Continuer"}
      </UIButton>
    ) : null;

  return (
    <OnboardingLayout
      actions={actions}
      backAction={
        <UIIconButton
          className="rounded-full border-transparent"
          label={step === 0 ? "Fermer" : "Retour"}
          onClick={() => {
            if (step === 0) {
              onCancel();
              return;
            }
            setEditorError(null);
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          <ChevronLeft aria-hidden="true" size={24} />
        </UIIconButton>
      }
      currentStep={Math.min(step + 1, behaviorEditorFinalStep)}
      error={editorError ? <ErrorState message={editorError} /> : undefined}
      showProgress={step < behaviorEditorFinalStep}
      totalSteps={behaviorEditorFinalStep}
    >
      {question ? (
        <BehaviorFrequencyQuestion
          answer={draft.behaviorAnswers[question.key]}
          questionId={question.key}
          title={question.title}
          onSelect={(answer) => {
            setDraft((current) => ({
              ...current,
              behaviorAnswers: {
                ...current.behaviorAnswers,
                [question.key]: answer,
              },
            }));
            setEditorError(null);
            setStep((current) => current + 1);
          }}
        />
      ) : null}

      {step === 7 ? (
        <OnboardingQuestion title="Dans quelles situations cela arrive-t-il le plus souvent ?">
          <div className="grid gap-2">
            {Object.entries(behaviorContextLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.contexts.includes(key as BehaviorContext)}
                key={key}
                label={label}
                name="profile-behavior-context"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contexts: toggleExclusiveSelection(
                      current.contexts,
                      key as BehaviorContext,
                      event.target.checked,
                      ["no-specific-context", "unknown"],
                    ),
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === 8 ? (
        <OnboardingQuestion title="Qu’est-ce qui semble le plus te freiner aujourd’hui ?">
          <div className="grid gap-2">
            {Object.entries(perceivedFrictionLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.perceivedFrictions.includes(
                  key as PerceivedFriction,
                )}
                key={key}
                label={label}
                name="profile-perceived-friction"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    perceivedFrictions: toggleExclusiveSelection(
                      current.perceivedFrictions,
                      key as PerceivedFriction,
                      event.target.checked,
                      ["unknown"],
                    ),
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === 9 ? (
        <OnboardingQuestion
          description="Cette question est facultative."
          title="Es-tu actuellement accompagné par un professionnel pour ton poids, ton alimentation ou un trouble alimentaire ?"
        >
          <div className="grid gap-2">
            {Object.entries(professionalSupportLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.professionalSupport === key}
                key={key}
                label={label}
                name="profile-professional-support"
                value={key}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    professionalSupport: key as ProfessionalSupportStatus,
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === behaviorEditorFinalStep ? (
        <section className="space-y-5" aria-labelledby="behavior-editor-summary">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Portrait initial
          </p>
          <h1
            className="max-w-[19ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
            id="behavior-editor-summary"
          >
            Tes pistes à observer
          </h1>
          <Surface className="space-y-3 p-5" variant="subtle">
            {assessmentPreview.hypotheses.length > 0 ? (
              <ul className="space-y-3">
                {assessmentPreview.hypotheses.map((hypothesis) => (
                  <li
                    className="flex gap-3 text-sm leading-6 text-[var(--pc-color-text-muted)]"
                    key={hypothesis.axis}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
                    />
                    {behaviorHypothesisText(hypothesis.axis)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
                Aucune tendance nette ne ressort pour le moment.
              </p>
            )}
          </Surface>
          <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
            Cette mise à jour remplace tes réponses déclarées. Les notes déjà
            présentes dans le carnet restent intactes.
          </p>
        </section>
      ) : null}
    </OnboardingLayout>
  );
}

function ActionPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="app-fixed-panel z-30">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <div className="flex flex-col items-start gap-3 rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)] min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
          <h1 className="font-serif text-2xl leading-tight min-[390px]:text-3xl">{title}</h1>
          <button
            className="text-sm font-semibold text-[#3A3732]"
            type="button"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
      </div>
    </div>
  );
}

function SmokingPanel({
  note,
  state,
  onAdd,
  onChangeNote,
  onChangeState,
  onClose,
}: {
  note: string;
  state: SmokingDayState;
  onAdd: () => void;
  onChangeNote: (value: string) => void;
  onChangeState: (value: SmokingDayState) => void;
  onClose: () => void;
}) {
  const showTrigger = state === "envie" || state === "cigarette";

  return (
    <ActionPanel title="Tabac" onClose={onClose}>
      <div className="space-y-6">
        <ChoiceLine
          options={smokingDayLabels}
          value={state}
          onChange={(value) => {
            onChangeState(value);

            if (value === "aucun") {
              onChangeNote("");
            }
          }}
        />
        {showTrigger ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--pc-color-text)]">Déclencheur facultatif</p>
            <div className="flex flex-wrap gap-2">
              {smokingTriggerOptions.map((trigger) => {
                const selected = note === trigger;

                return (
                  <button
                    className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                      selected
                        ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
                        : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text-muted)] shadow-[var(--pc-shadow-level-1)]"
                    }`}
                    key={trigger}
                    type="button"
                    onClick={() => onChangeNote(selected ? "" : trigger)}
                  >
                    {trigger}
                  </button>
                );
              })}
            </div>
            <input
              className={inputClass}
              value={note}
              onChange={(event) => onChangeNote(event.target.value)}
              placeholder="Autre déclencheur"
            />
          </div>
        ) : null}
        <Button onClick={onAdd}>
          <Archive aria-hidden="true" size={17} />
          Ajouter au carnet
        </Button>
      </div>
    </ActionPanel>
  );
}

function MealObservation({
  draft,
  initialObservationActive,
  step,
  submitLabel,
  onAdd,
  onChange,
  onClose,
  onNext,
  onPrevious,
}: {
  draft: MealDraft;
  initialObservationActive: boolean;
  step: number;
  submitLabel: string;
  onAdd: () => void;
  onChange: (draft: MealDraft) => void;
  onClose: () => void;
  onNext: (draftOverride?: MealDraft) => void;
  onPrevious: () => void;
}) {
  const stepIds = getMealTunnelStepIds(draft.kind);
  const stepId: MealTunnelStepId = stepIds[step] ?? stepIds[0];
  const finding = buildImmediateFinding({
    kind: draft.kind,
    servingPattern: draft.servingPattern,
    hungerBefore: draft.hungerBefore,
    fullnessAfter: draft.fullnessAfter,
    starterTaken: draft.starterTaken,
    dessertTaken: draft.dessertTaken,
    snackTrigger: draft.snackTrigger,
    snackContext: draft.snackContext,
    components: draft.components,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const choose = (nextDraft: MealDraft) => {
    onChange(nextDraft);
    onNext(nextDraft);
  };
  const showNextButton =
    stepId === "time" ||
    stepId === "text" ||
    stepId === "snack-text" ||
    stepId === "starter" ||
    stepId === "dessert" ||
    stepId === "clarifications" ||
    stepId === "quantity" ||
    stepId === "reservice-detail" ||
    stepId === "reservice-reason";

  return (
    <div className="app-fixed-panel z-30">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 shadow-[var(--pc-shadow-level-1)]">
          <p className={annotationClass}>
            Observation {step + 1}/{stepIds.length}
          </p>
          <button className="text-sm font-semibold text-[var(--pc-color-text)]" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-3">
          {stepId === "kind" ? (
            <TunnelQuestion title="Type de repas">
              <TunnelChoiceLine
                options={activeMealKindLabels}
                value={draft.kind}
                onPick={(value) =>
                  choose(sanitizeMealDraftForKind({ ...draft, kind: value }))
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "time" ? (
            <TunnelQuestion title="À quelle heure as-tu mangé ?">
              <div className="grid gap-4">
                <input
                  className="min-h-16 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-3xl font-semibold tabular-nums text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
                  type="time"
                  value={draft.time}
                  onChange={(event) =>
                    onChange({ ...draft, time: event.target.value })
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="min-h-9 rounded-full border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-3 text-sm font-semibold text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                    type="button"
                    onClick={() => onChange({ ...draft, date: todayISO() })}
                  >
                    Aujourd’hui
                  </button>
                  <button
                    className="min-h-9 rounded-full border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-3 text-sm font-semibold text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                    type="button"
                    onClick={() =>
                      onChange({ ...draft, date: addDays(todayISO(), -1) })
                    }
                  >
                    Hier
                  </button>
                  <button
                    className="min-h-9 rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 text-sm font-semibold text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
                    type="button"
                    onClick={() => setShowDatePicker((current) => !current)}
                  >
                    Changer la date
                  </button>
                </div>
                <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
                  {formatShortDate(draft.date)}
                </p>
                {showDatePicker ? (
                  <input
                    className={inputClass}
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      onChange({ ...draft, date: event.target.value })
                    }
                  />
                ) : null}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "text" || stepId === "snack-text" ? (
            <section className="space-y-6">
              <p className={annotationClass}>Contenu</p>
              <h1 className="font-serif text-3xl leading-tight">
                {stepId === "snack-text"
                  ? "Tu as grignoté quoi ?"
                  : "Note ce que tu as mangé, simplement."}
              </h1>
              <textarea
                className="min-h-40 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 text-lg leading-8 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
                value={draft.freeText}
                onChange={(event) =>
                  onChange({ ...draft, freeText: event.target.value })
                }
                placeholder="Exemple : pâtes, deux steaks, sauce au poivre"
              />
            </section>
          ) : null}

          {stepId === "starter" ? (
            <TunnelQuestion title="Tu as pris une entrée ?">
              <TunnelChoiceLine
                options={{ non: "Non", oui: "Oui" }}
                value={draft.starterTaken ? "oui" : "non"}
                onPick={(value) => {
                  if (value === "non") {
                    choose({ ...draft, starterTaken: false, starterText: "" });
                    return;
                  }

                  onChange({ ...draft, starterTaken: true });
                }}
              />
              {draft.starterTaken ? (
                <div className="grid gap-4">
                  <input
                    className={inputClass}
                    value={draft.starterText}
                    onChange={(event) =>
                      onChange({ ...draft, starterText: event.target.value })
                    }
                    placeholder="C’était quoi ?"
                  />
                  <QuantityFields
                    label="Quantité approximative"
                    value={draft.starterQuantity}
                    onChange={(starterQuantity) =>
                      onChange({ ...draft, starterQuantity })
                    }
                  />
                </div>
              ) : null}
            </TunnelQuestion>
          ) : null}

          {stepId === "dessert" ? (
            <TunnelQuestion title="Tu as pris un dessert ?">
              <TunnelChoiceLine
                options={{ non: "Non", oui: "Oui" }}
                value={draft.dessertTaken ? "oui" : "non"}
                onPick={(value) => {
                  if (value === "non") {
                    choose({ ...draft, dessertTaken: false, dessertText: "" });
                    return;
                  }

                  onChange({ ...draft, dessertTaken: true });
                }}
              />
              {draft.dessertTaken ? (
                <div className="grid gap-4">
                  <input
                    className={inputClass}
                    value={draft.dessertText}
                    onChange={(event) =>
                      onChange({ ...draft, dessertText: event.target.value })
                    }
                    placeholder="C’était quoi ?"
                  />
                  <QuantityFields
                    label="Quantité approximative"
                    value={draft.dessertQuantity}
                    onChange={(dessertQuantity) =>
                      onChange({ ...draft, dessertQuantity })
                    }
                  />
                </div>
              ) : null}
            </TunnelQuestion>
          ) : null}

          {stepId === "quantity" ? (
            <TunnelQuestion
              title={
                draft.kind === "grignotage"
                  ? "Tu en as pris quelle quantité ?"
                  : "Tu dirais quelle quantité ?"
              }
            >
              <QuantityFields
                label="Quantité approximative"
                value={
                  draft.kind === "grignotage"
                    ? draft.snackQuantity
                    : draft.mainQuantity
                }
                onChange={(quantity) =>
                  onChange(
                    draft.kind === "grignotage"
                      ? { ...draft, snackQuantity: quantity }
                      : { ...draft, mainQuantity: quantity },
                  )
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "serving" ? (
            <TunnelQuestion title="Tu as repris ou ajouté une portion ?">
              <TunnelChoiceLine
                options={servingPatternLabels}
                value={draft.servingPattern}
                onPick={(value) =>
                  choose({
                    ...draft,
                    servingPattern: value,
                    hungerAtReservice: value === "none" ? null : draft.hungerAtReservice,
                    reserviceReasons: value === "none" ? [] : draft.reserviceReasons,
                    reserviceRelation: value === "none" ? null : draft.reserviceRelation,
                    reserviceText: value === "none" ? "" : draft.reserviceText,
                  })
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-detail" ? (
            <TunnelQuestion title="La reprise contenait quoi ?">
              <div className="grid gap-4">
                <TunnelChoiceLine
                  options={reserviceRelationLabels}
                  value={
                    (draft.reserviceRelation ?? "__none") as MealPassageRelation
                  }
                  onPick={(value) =>
                    onChange({
                      ...draft,
                      reserviceRelation: value,
                      reserviceText:
                        value === "same" ? "" : draft.reserviceText,
                    })
                  }
                />
                {draft.reserviceRelation &&
                draft.reserviceRelation !== "same" ? (
                  <input
                    className={inputClass}
                    value={draft.reserviceText}
                    onChange={(event) =>
                      onChange({ ...draft, reserviceText: event.target.value })
                    }
                    placeholder="Exemple : juste des frites, un peu de pâtes"
                  />
                ) : null}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-hunger" ? (
            <TunnelQuestion title="Au moment de te resservir, tu avais encore faim ?">
              <TunnelChoiceLine
                options={reserviceHungerLabels}
                value={draft.hungerAtReservice ?? "unsure"}
                onPick={(value) =>
                  choose({ ...draft, hungerAtReservice: value })
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-reason" ? (
            <TunnelQuestion title="Qu’est-ce qui a joué ?">
              <div className="grid gap-2">
                {Object.entries(reserviceReasonLabels).map(([key, label]) => {
                  const reason = key as ReserviceReason;
                  const selected = draft.reserviceReasons.includes(reason);

                  return (
                    <button
                      className={`min-h-12 rounded-[18px] border px-4 text-left text-base transition active:scale-[0.99] ${
                        selected
                          ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                          : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                      }`}
                      key={key}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          reserviceReasons: selected
                            ? draft.reserviceReasons.filter(
                                (item) => item !== reason,
                              )
                            : [...draft.reserviceReasons, reason],
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "hunger" ? (
            <TunnelQuestion title="Tu avais vraiment faim ?">
              <TunnelChoiceLine
                options={{
                  yes: hungerLabels.yes,
                  not_really: hungerLabels.not_really,
                  no: hungerLabels.no,
                  unsure: hungerLabels.unsure,
                }}
                value={draft.hungerBefore}
                onPick={(value) => choose({ ...draft, hungerBefore: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "fullness" || stepId === "snack-fullness" ? (
            <TunnelQuestion
              title={
                stepId === "snack-fullness"
                  ? "Après, tu étais comment ?"
                  : "Après le repas, tu étais comment ?"
              }
            >
              <TunnelChoiceLine
                options={fullnessLabels}
                value={draft.fullnessAfter}
                onPick={(value) =>
                  choose({ ...draft, fullnessAfter: value, afterMeal: value })
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "snack-trigger" ? (
            <TunnelQuestion title="Pourquoi tu as mangé ?">
              <TunnelChoiceLine
                options={snackTriggerLabels}
                value={draft.snackTrigger ?? "unsure"}
                onPick={(value) => choose({ ...draft, snackTrigger: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "snack-context" ? (
            <TunnelQuestion title="Tu étais où ?">
              <TunnelChoiceLine
                options={snackContextLabels}
                value={draft.snackContext ?? "other"}
                onPick={(value) => choose({ ...draft, snackContext: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "clarifications" ? (
            <section className="space-y-4">
              <p className={annotationClass}>Petite précision</p>
              <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
                Je te demande juste ça.
              </h1>
              {draft.clarifications.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {draft.clarifications.slice(0, 3).map((clarification) => (
                    <ClarificationQuestion
                      clarification={clarification}
                      key={clarification.key}
                      onChange={(nextClarification) =>
                        onChange({
                          ...draft,
                          clarifications: draft.clarifications.map((item) =>
                            item.key === nextClarification.key
                              ? nextClarification
                              : item,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {stepId === "finding" ? (
            <section className="space-y-6">
              <ConstatPart title="Ce que je vois" text={finding.fact} emphasized />
              {initialObservationActive ? (
                <div className="rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                  <ConstatPart
                    title="Pour l’instant"
                    text={INITIAL_OBSERVATION_MEAL_MESSAGE}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-5 rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <ConstatPart title="Point à surveiller" text={finding.reading} />
                    <ConstatPart title="Prochaine fois" text={finding.nextAction} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
                    {finding.evidenceLevel}
                  </p>
                </>
              )}
            </section>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button onClick={onPrevious} variant="line">
              <ChevronLeft aria-hidden="true" size={17} />
              Retour
            </Button>
          ) : (
            <span />
          )}
          {showNextButton ? (
            <Button onClick={onNext}>
              Continuer
              <ChevronRight aria-hidden="true" size={17} />
            </Button>
          ) : null}
          {stepId === "finding" ? (
            <Button onClick={onAdd}>
              <Archive aria-hidden="true" size={17} />
              {submitLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TunnelQuestion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
        {title}
      </h1>
      {children}
    </section>
  );
}

function QuantityFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MealQuantityDraft;
  onChange: (value: MealQuantityDraft) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className={annotationClass}>{label}</p>
      <div className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-2">
        <input
          className={inputClass}
          inputMode="decimal"
          value={value.amount}
          onChange={(event) =>
            onChange({ ...value, amount: event.target.value })
          }
          placeholder="1"
        />
        <select
          className={inputClass}
          value={value.unit}
          onChange={(event) =>
            onChange({
              ...value,
              unit: event.target.value as MealQuantityUnit,
            })
          }
        >
          {quickQuantityUnits.map((unit) => (
            <option key={unit} value={unit}>
              {quantityUnitLabels[unit]}
            </option>
          ))}
        </select>
      </div>
      {value.unit === "other" || value.unit === "unknown" ? (
        <input
          className={inputClass}
          value={value.note}
          onChange={(event) =>
            onChange({ ...value, note: event.target.value })
          }
          placeholder="Précise si tu veux"
        />
      ) : null}
    </div>
  );
}

function TunnelChoiceLine<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onPick: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`min-h-12 cursor-pointer rounded-[18px] border px-4 text-left text-base transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px active:scale-[0.99] ${
              selected
                ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onPick(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}

function ClarificationQuestion({
  clarification,
  onChange,
}: {
  clarification: MealClarification;
  onChange: (clarification: MealClarification) => void;
}) {
  const choices = getClarificationChoices(clarification.key);

  return (
    <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)]">
      <p className="mb-3 text-sm font-semibold text-[var(--pc-color-text)]">
        {clarification.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = clarification.value === choice;

          return (
            <button
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                selected
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)]"
              }`}
              key={choice}
              type="button"
              onClick={() =>
                onChange({
                  ...clarification,
                  value: choice,
                  customText:
                    choice === "Autre" ? clarification.customText ?? "" : null,
                })
              }
            >
              {choice}
            </button>
          );
        })}
      </div>
      {clarification.value === "Autre" ? (
        <input
          className={`${inputClass} mt-3`}
          value={clarification.customText ?? ""}
          onChange={(event) =>
            onChange({
              ...clarification,
              customText: event.target.value,
            })
          }
          placeholder="Précise en quelques mots"
        />
      ) : null}
    </div>
  );
}

function ConstatPart({
  title,
  text,
  emphasized = false,
}: {
  title: string;
  text: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className={annotationClass}>{title}</p>
      <p
        className={
          emphasized
            ? "mt-2 font-serif text-3xl leading-tight text-[var(--pc-color-text)]"
            : "mt-2 leading-7 text-[var(--pc-color-text)]"
        }
      >
        {text}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
      <p className="font-serif text-xl text-[var(--pc-color-text)]">{title}</p>
      <p className="mt-2 leading-7 text-[var(--pc-color-text)]">{text}</p>
    </div>
  );
}

function JournalSegmentedControl({
  value,
  onChange,
}: {
  value: JournalViewMode;
  onChange: (value: JournalViewMode) => void;
}) {
  const options: Array<{ id: JournalViewMode; label: string }> = [
    { id: "days", label: "Jours" },
    { id: "weeks", label: "Semaines" },
  ];

  return (
    <div
      aria-label="Vue du carnet"
      className="grid grid-cols-2 gap-1 rounded-full border border-[var(--pc-color-border)] bg-[var(--pc-color-primary-soft)] p-1 shadow-[var(--pc-shadow-level-1)]"
      role="tablist"
    >
      {options.map((option) => (
        <button
          aria-selected={value === option.id}
          className={`min-h-11 rounded-full text-sm font-semibold transition active:scale-[0.98] ${
            value === option.id
              ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]"
              : "text-[var(--pc-color-text)]"
          }`}
          key={option.id}
          role="tab"
          type="button"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function JournalWeightOverview({
  profile,
  weights,
}: {
  profile: Profile;
  weights: WeightEntry[];
}) {
  const measuredWeights = dedupeDailyWeights(weights).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latestWeight = getLatestWeight(measuredWeights);
  const chartPoints = [
    {
      date: profile.startDate,
      id: "start",
      value: profile.startWeightKg,
    },
    ...measuredWeights.map((weight) => ({
      date: weight.date,
      id: weight.id,
      value: weight.weightKg,
    })),
  ];

  return (
    <Surface as="section" className="overflow-hidden px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
            Évolution du poids
          </p>
          <h2 className="mt-1 text-2xl leading-8 font-bold text-[var(--pc-color-text)]">
            Depuis le départ
          </h2>
        </div>
        <Scale
          aria-hidden="true"
          className="mt-1 text-[var(--pc-color-primary)]"
          size={24}
          strokeWidth={2.25}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
            Départ
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--pc-color-text)]">
            {formatKg(profile.startWeightKg)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
            Dernière mesure
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--pc-color-text)]">
            {latestWeight ? formatKg(latestWeight.weightKg) : "Aucune"}
          </p>
        </div>
      </div>

      <SimpleWeightChart points={chartPoints} />
    </Surface>
  );
}

function SimpleWeightChart({
  points,
}: {
  points: Array<{ date: ISODate; id: string; value: number }>;
}) {
  const width = 320;
  const height = 132;
  const paddingX = 18;
  const paddingY = 18;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.8);
  const lower = min - span * 0.25;
  const upper = max + span * 0.25;
  const firstDate = points[0]?.date ?? todayISO();
  const lastDate = points[points.length - 1]?.date ?? firstDate;
  const totalDays = Math.max(0, daysBetween(firstDate, lastDate));
  const xRange = width - paddingX * 2;
  const yRange = height - paddingY * 2;
  const toX = (point: { date: ISODate }, index: number) => {
    if (points.length === 1) {
      return width / 2;
    }

    if (totalDays === 0) {
      return paddingX + (xRange * index) / (points.length - 1);
    }

    return paddingX + (xRange * daysBetween(firstDate, point.date)) / totalDays;
  };
  const toY = (value: number) =>
    paddingY + yRange - ((value - lower) / (upper - lower)) * yRange;
  const svgPoints = points
    .map((point, index) => `${toX(point, index)},${toY(point.value)}`)
    .join(" ");
  const visibleDots = points.filter(
    (_, index) =>
      points.length <= 15 || index === 0 || index === points.length - 1,
  );

  return (
    <div
      aria-label="Courbe simple du poids depuis le départ"
      className="mt-4 h-36 w-full"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          stroke="var(--pc-color-border)"
          strokeDasharray="6 8"
          strokeWidth="2"
          x1={paddingX}
          x2={width - paddingX}
          y1={height / 2}
          y2={height / 2}
        />
        {points.length > 1 ? (
          <polyline
            fill="none"
            points={svgPoints}
            stroke="var(--pc-color-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        ) : null}
        {visibleDots.map((point) => {
          const pointIndex = points.indexOf(point);
          const isEdge = pointIndex === 0 || pointIndex === points.length - 1;

          return (
            <circle
              cx={toX(point, pointIndex)}
              cy={toY(point.value)}
              fill={
                isEdge
                  ? "var(--pc-color-primary)"
                  : "var(--pc-color-primary-muted)"
              }
              key={point.id}
              r={isEdge ? 4.5 : 3}
            />
          );
        })}
      </svg>
    </div>
  );
}

function JournalDaysView({
  currentDate,
  date,
  events,
  canGoNext,
  onDeleteMeal,
  onEditMeal,
  onGoToday,
  onNext,
  onPrevious,
}: {
  currentDate: ISODate;
  date: ISODate;
  events: JournalDayEvent[];
  canGoNext: boolean;
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onGoToday: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <section className="space-y-4" aria-labelledby="journal-days-title">
      <div className="flex items-center justify-between gap-3">
        <UIIconButton label="Jour précédent" onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" size={22} />
        </UIIconButton>
        <div className="min-w-0 text-center">
          <h2
            className="text-lg leading-6 font-bold text-[var(--pc-color-text)]"
            id="journal-days-title"
          >
            {formatLongDate(date)}
          </h2>
          <p className="mt-1 text-sm text-[var(--pc-color-text-muted)]">
            {events.length === 0
              ? "Aucun événement"
              : countLabel(events.length, "événement", "événements")}
          </p>
        </div>
        <UIIconButton
          disabled={!canGoNext}
          label="Jour suivant"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </UIIconButton>
      </div>

      {date !== currentDate ? (
        <div className="flex justify-center">
          <Button onClick={onGoToday} variant="line">
            Aujourd’hui
          </Button>
        </div>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="Rien noté ce jour-là."
          text="Une journée vide reste neutre : Haru n’en tire aucun score."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            if (event.kind === "meal") {
              return (
                <JournalMealEvent
                  key={`meal-${event.id}`}
                  meal={event.meal}
                  onDelete={() => onDeleteMeal(event.meal)}
                  onEdit={() => onEditMeal(event.meal)}
                />
              );
            }

            if (event.kind === "weight") {
              return (
                <JournalFactEvent
                  icon={Scale}
                  key={`weight-${event.id}`}
                  time={event.time}
                  title="Poids"
                  value={formatKg(event.weight.weightKg)}
                />
              );
            }

            return (
              <JournalFactEvent
                icon={Cigarette}
                key={`smoking-${event.id}`}
                time={event.time}
                title="Tabac"
                value={smokingEntryLine(event.smoking)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function JournalMealEvent({
  meal,
  onDelete,
  onEdit,
}: {
  meal: MealEntry;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Surface as="article" className="p-3">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
        <p className="pt-1 text-sm font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
          {meal.time}
        </p>
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
              <BookOpen aria-hidden="true" size={17} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--pc-color-text)]">
                {mealKindLabels[meal.kind]}
              </p>
              <p className="mt-0.5 text-sm leading-5 text-[var(--pc-color-text)]">
                {meal.freeText}
              </p>
              <p className="mt-1 text-xs leading-4 text-[var(--pc-color-text-muted)]">
                {mealDetailLine(meal)}
              </p>
            </div>
          </div>
          {meal.finding?.fact ? (
            <p className="mt-3 rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-3 py-2 text-sm leading-5 text-[var(--pc-color-primary)]">
              {meal.finding.fact}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 text-sm font-semibold text-[var(--pc-color-text)] transition active:scale-[0.98]"
              type="button"
              onClick={onEdit}
            >
              Modifier
            </button>
            <button
              className="min-h-10 rounded-full border border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] px-3 text-sm font-semibold text-[var(--pc-color-danger)] transition active:scale-[0.98]"
              type="button"
              onClick={onDelete}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function JournalFactEvent({
  icon: Icon,
  time,
  title,
  value,
}: {
  icon: LucideIcon;
  time: string;
  title: string;
  value: string;
}) {
  return (
    <Surface as="article" className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 p-3">
      <p className="pt-1 text-sm font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
        {time}
      </p>
      <div className="flex min-w-0 gap-2">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
          <Icon aria-hidden="true" size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--pc-color-text)]">
            {title}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-[var(--pc-color-text)]">
            {value}
          </p>
        </div>
      </div>
    </Surface>
  );
}

function JournalWeeksView({
  analysis,
  canGoNext,
  currentDate,
  smokingEnabled,
  onGoCurrent,
  onNext,
  onPrevious,
}: {
  analysis: ReturnType<typeof calculateWeeklyAnalysis>;
  canGoNext: boolean;
  currentDate: ISODate;
  smokingEnabled: boolean;
  onGoCurrent: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const isCurrentWeek = sameWeek(analysis.weekStart, currentDate);
  const hasEnoughMealData = analysis.mealCount >= 5;
  const rhythms = buildWeeklyRhythms(analysis, smokingEnabled);

  return (
    <section className="space-y-4" aria-labelledby="journal-weeks-title">
      <div className="flex items-center justify-between gap-3">
        <UIIconButton label="Semaine précédente" onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" size={22} />
        </UIIconButton>
        <div className="min-w-0 text-center">
          <h2
            className="text-lg leading-6 font-bold text-[var(--pc-color-text)]"
            id="journal-weeks-title"
          >
            {formatShortDate(analysis.weekStart)} - {formatShortDate(analysis.weekEnd)}
          </h2>
          <p className="mt-1 text-sm text-[var(--pc-color-text-muted)]">
            {isCurrentWeek ? "Lecture provisoire" : "Semaine terminée"}
          </p>
        </div>
        <UIIconButton
          disabled={!canGoNext}
          label="Semaine suivante"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </UIIconButton>
      </div>

      {!isCurrentWeek ? (
        <div className="flex justify-center">
          <Button onClick={onGoCurrent} variant="line">
            Semaine en cours
          </Button>
        </div>
      ) : null}

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Ce qui est noté</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <JournalMetric label="Repas" value={analysis.mealCount} />
          <JournalMetric label="Resservice" value={analysis.multiPlateMeals} />
          <JournalMetric label="Sans vraie faim" value={analysis.mealsStartedWithoutHunger} />
          <JournalMetric label="Trop plein" value={analysis.mealsEndedTooFull} />
          {smokingEnabled ? (
            <JournalMetric label="Tabac" value={analysis.smokingEntries} />
          ) : null}
          <JournalMetric
            label="Poids"
            value={
              analysis.weightAverageKg === null
                ? "Non renseigné"
                : formatKg(analysis.weightAverageKg)
            }
          />
        </dl>
      </Surface>

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Rythmes observés</p>
        {rhythms.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
            Aucun rythme dominant net avec les données disponibles.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--pc-color-text)]">
            {rhythms.map((rhythm) => (
              <li className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-3 py-2" key={rhythm}>
                {rhythm}
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Hypothèse de Haru</p>
        <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
          {weeklyHypothesisText(analysis, hasEnoughMealData)}
        </p>
      </Surface>

      <Surface as="section" className="px-4 py-4" variant="subtle">
        <p className={annotationClass}>
          {isCurrentWeek ? "À observer" : "Expérience possible"}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
          {hasEnoughMealData
            ? analysis.priority.action
            : "Continuer à noter quelques repas avant de choisir une action."}
        </p>
      </Surface>
    </section>
  );
}

function JournalMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--pc-color-text)]">
        {value}
      </dd>
    </div>
  );
}

function buildWeeklyRhythms(
  analysis: ReturnType<typeof calculateWeeklyAnalysis>,
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
      countLabel(
        analysis.snackingWithoutHunger,
        "grignotage de contexte noté.",
        "grignotages de contexte notés.",
      ),
    );
  }

  if (smokingEnabled && analysis.smokingEntries > 0) {
    rhythms.push(
      countLabel(
        analysis.smokingEntries,
        "événement tabac noté.",
        "événements tabac notés.",
      ),
    );
  }

  return rhythms;
}

function weeklyHypothesisText(
  analysis: ReturnType<typeof calculateWeeklyAnalysis>,
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

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] bg-[#F6F4EC] p-3">
      <dt className="text-xs uppercase tracking-[0.14em] text-[#7A7166]">{label}</dt>
      <dd className="mt-1 font-serif text-2xl tabular-nums text-[#171512]">
        {value}
      </dd>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-[#3A3732]">
      {label}
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextInput
      label={label}
      type="number"
      value={Number.isFinite(value) ? String(value) : ""}
      onChange={(next) => onChange(Number(next))}
    />
  );
}
