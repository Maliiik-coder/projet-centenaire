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
  LineChart,
  PenLine,
  Plus,
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
  daysBetween,
  formatLongDate,
  formatShortDate,
  shouldUpdateCurrentDate,
  todayISO,
} from "@/lib/dates";
import {
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
import { isCurrentCloudAttempt } from "@/lib/cloudAttempt";
import { withCloudReadTimeout } from "@/lib/cloudRead";
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
  clarificationChoices,
  detectMealComponents,
  mergeDetectedClarifications,
} from "@/lib/foodDetection";
import { shouldShowActiveMission } from "@/lib/mission";
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
  OnboardingLayout,
  OnboardingQuestion,
} from "@/components/centenaire/OnboardingLayout";
import { StartupStateLayout } from "@/components/centenaire/StartupStateLayout";
import { TodayActionTile } from "@/components/centenaire/TodayActionTile";
import {
  Button as UIButton,
  ChoiceCard,
  ErrorState,
  FormField,
  IconButton as UIIconButton,
  Surface,
  TextInput as UITextInput,
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
  FrictionChoice,
  FullnessAfter,
  HungerBefore,
  ISODate,
  MealAfter,
  MealClarification,
  MealComponents,
  MealEntry,
  MealMutation,
  MealKind,
  NonMealMutationDraft,
  Profile,
  QuestionnaireVersion,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SnackTrigger,
  SmokingDayState,
  SmokingGoal,
  SmokingStatus,
  SnackingAfter,
  StopReason,
  WeightEntry,
} from "@/lib/types";

type TabId = "today" | "journal" | "insights" | "profile";
type JournalFilter = "tout" | "repas" | "tabac" | "mesures";

interface TabDefinition {
  accessibleLabel?: string;
  id: TabId;
  label: string;
  icon: LucideIcon;
}

interface OnboardingDraft {
  firstName: string;
  age: string;
  heightCm: string;
  startWeightKg: string;
  goalWeightKg: string;
  startDate: string;
  initialFriction: FrictionChoice;
  smokingStatus: SmokingStatus;
  smokingGoal: SmokingGoal;
}

interface MealDraft {
  kind: ActiveMealKind;
  freeText: string;
  quantity: ServedQuantity;
  servingPattern: ServingPattern;
  hungerBefore: HungerBefore;
  afterMeal: MealAfter;
  fullnessAfter: FullnessAfter;
  stopReason: StopReason;
  snackingAfter: SnackingAfter;
  starterTaken: boolean;
  starterText: string;
  dessertTaken: boolean;
  dessertText: string;
  snackTrigger: SnackTrigger | null;
  snackContext: SnackContext | null;
  clarifications: MealClarification[];
  questionnaireVersion: QuestionnaireVersion;
  components: MealComponents;
}

const tabs: TabDefinition[] = [
  { id: "today", label: "Jour", accessibleLabel: "Page du jour", icon: PenLine },
  { id: "journal", label: "Carnet", icon: BookOpen },
  { id: "insights", label: "Constats", icon: LineChart },
  { id: "profile", label: "Profil", icon: Settings2 },
];

const frictionLabels: Record<FrictionChoice, string> = {
  "large-portions": "Portions trop importantes",
  "snacking-without-hunger": "Grignotage sans faim",
  "habit-meals": "Repas pris par habitude",
  "low-activity": "Manque d'activité",
  irregularity: "Irrégularité",
  unknown: "Je ne sais pas encore",
};

const smokingStatusLabels: Record<SmokingStatus, string> = {
  "non-renseigne": "Non renseigné",
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d'arrêter",
};

const onboardingSmokingLabels: Partial<Record<SmokingStatus, string>> = {
  non: "Non",
  "tous-les-jours": "Oui",
};

const smokingGoalLabels: Record<SmokingGoal, string> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer seulement",
  "pas-maintenant": "Pas maintenant",
};

const onboardingSmokingGoalLabels: Partial<Record<SmokingGoal, string>> = {
  arreter: "Oui, je veux arrêter",
  observer: "Pas maintenant",
};

const servingPatternLabels: Record<ServingPattern, string> = {
  none: "Non",
  once: "Oui, une fois",
  multiple: "Oui, plusieurs fois",
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

const componentLabels: Record<keyof MealComponents, string> = {
  proteins: "Protéines",
  vegetables: "Légumes",
  starches: "Féculents",
  fried: "Friture",
  dessert: "Dessert",
  richSauce: "Sauce riche",
  ultraProcessed: "Très transformé",
  sugaryDrink: "Boisson sucrée",
  zeroDrink: "Boisson zéro",
  alcohol: "Alcool",
};

const emptyMealDraft: MealDraft = {
  kind: "dejeuner",
  freeText: "",
  quantity: "reasonable-plate",
  servingPattern: "none",
  hungerBefore: "yes",
  afterMeal: "fine",
  fullnessAfter: "fine",
  stopReason: "rassasie",
  snackingAfter: "non",
  starterTaken: false,
  starterText: "",
  dessertTaken: false,
  dessertText: "",
  snackTrigger: null,
  snackContext: null,
  clarifications: [],
  questionnaireVersion: "v0.7",
  components: { ...EMPTY_COMPONENTS },
};

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

function mealDetailLine(meal: MealEntry): string {
  const details = [];
  const servingPattern = meal.servingPattern ?? servingPatternFromQuantity(meal.quantity);
  const fullness = meal.fullnessAfter ?? fullnessFromAfterMeal(meal.afterMeal);

  if (meal.starterTaken && meal.starterText) {
    details.push(`Entrée · ${meal.starterText}`);
  }

  if (meal.dessertTaken && meal.dessertText) {
    details.push(`Dessert · ${meal.dessertText}`);
  }

  if (meal.kind === "grignotage") {
    if (meal.snackTrigger) {
      details.push(snackTriggerLabels[meal.snackTrigger].toLowerCase());
    }
    if (meal.snackContext) {
      details.push(snackContextLabels[meal.snackContext].toLowerCase());
    }
  } else {
    details.push(servingPatternLabels[servingPattern].toLowerCase());
    details.push(hungerLabels[meal.hungerBefore].toLowerCase());
  }

  details.push(fullnessLabels[fullness].toLowerCase());

  return details.join(" · ");
}

function mealTagLabels(components: MealComponents): string[] {
  return (Object.keys(componentLabels) as Array<keyof MealComponents>)
    .filter((key) => components[key])
    .map((key) => componentLabels[key]);
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

  return "Aucun noté";
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

  return "Observer sans corriger brutalement pendant 7 jours.";
}

function needsSmokingGoal(status: SmokingStatus): boolean {
  return status !== "non" && status !== "non-renseigne";
}

function buildProfile(draft: OnboardingDraft): Profile {
  return {
    firstName: draft.firstName.trim(),
    age: Number(draft.age),
    heightCm: Number(draft.heightCm),
    startWeightKg: roundOne(Number(draft.startWeightKg)),
    goalWeightKg: roundOne(Number(draft.goalWeightKg)),
    startDate: draft.startDate,
    initialFriction: draft.initialFriction,
    smokingStatus: draft.smokingStatus,
    smokingGoal: needsSmokingGoal(draft.smokingStatus) ? draft.smokingGoal : undefined,
    showActiveMission: true,
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt: new Date().toISOString(),
  };
}

function isValidProfileDraft(draft: OnboardingDraft): boolean {
  return (
    draft.firstName.trim().length > 0 &&
    Number(draft.age) >= 16 &&
    Number(draft.heightCm) >= 120 &&
    Number(draft.startWeightKg) >= 40 &&
    Number(draft.goalWeightKg) >= 40 &&
    draft.startDate.length > 0 &&
    draft.smokingStatus !== "non-renseigne" &&
    (!needsSmokingGoal(draft.smokingStatus) ||
      draft.smokingGoal !== "pas-maintenant")
  );
}

const onboardingFinalStep = 9;

function hasNumberAtLeast(value: string, min: number): boolean {
  return value.trim().length > 0 && Number(value) >= min;
}

function getNextOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === 7 && !needsSmokingGoal(draft.smokingStatus)) {
    return onboardingFinalStep;
  }

  return Math.min(onboardingFinalStep, step + 1);
}

function getPreviousOnboardingStep(
  step: number,
  draft: OnboardingDraft,
): number {
  if (step === onboardingFinalStep && !needsSmokingGoal(draft.smokingStatus)) {
    return 7;
  }

  return Math.max(0, step - 1);
}

function getOnboardingStepError(
  draft: OnboardingDraft,
  step: number,
): string | null {
  if (step === 1 && draft.firstName.trim().length === 0) {
    return "Indique ton prénom pour ouvrir le carnet.";
  }

  if (step === 2 && !hasNumberAtLeast(draft.age, 16)) {
    return "Indique ton âge.";
  }

  if (step === 3 && !hasNumberAtLeast(draft.heightCm, 120)) {
    return "Indique ta taille.";
  }

  if (step === 4 && !hasNumberAtLeast(draft.startWeightKg, 40)) {
    return "Indique ton poids actuel.";
  }

  if (step === 5 && !hasNumberAtLeast(draft.goalWeightKg, 40)) {
    return "Indique ton objectif.";
  }

  if (step === 7 && draft.smokingStatus === "non-renseigne") {
    return "Réponds à la question tabac pour continuer.";
  }

  if (
    step === 8 &&
    needsSmokingGoal(draft.smokingStatus) &&
    draft.smokingGoal === "pas-maintenant"
  ) {
    return "Indique si tu souhaites arrêter maintenant.";
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
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>({
    firstName: "",
    age: "",
    heightCm: "",
    startWeightKg: "",
    goalWeightKg: "",
    startDate: today,
    initialFriction: "unknown",
    smokingStatus: "non-renseigne",
    smokingGoal: "pas-maintenant",
  });
  const [mealOpen, setMealOpen] = useState(false);
  const [mealStep, setMealStep] = useState(0);
  const [mealDraft, setMealDraft] = useState<MealDraft>(emptyMealDraft);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [openMealActionId, setOpenMealActionId] = useState<string | null>(null);
  const mealLongPressTimeoutRef = useRef<number | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");
  const [smokingOpen, setSmokingOpen] = useState(false);
  const [journalFilter, setJournalFilter] = useState<JournalFilter>("tout");
  const [smokingState, setSmokingState] = useState<SmokingDayState>("aucun");
  const [smokingNote, setSmokingNote] = useState("");
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const cloudGenerationRef = useRef(0);
  const localEditGenerationRef = useRef(0);
  const activeCloudUserIdRef = useRef<string | null>(null);

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
        setError("Connexion cloud indisponible. Le carnet reste local pour le moment.");
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
      }
    };

    window.addEventListener("online", syncOnOnline);

    return () => window.removeEventListener("online", syncOnOnline);
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

  if (!profile) {
    return (
      <Onboarding
        draft={onboardingDraft}
        error={error}
        step={onboardingStep}
        onBack={() =>
          setOnboardingStep((step) =>
            getPreviousOnboardingStep(step, onboardingDraft),
          )
        }
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
            onboardingStep,
          );

          if (stepError) {
            setError(stepError);
            return;
          }

          if (onboardingStep < onboardingFinalStep) {
            setError(null);
            setOnboardingStep((step) =>
              getNextOnboardingStep(step, onboardingDraft),
            );
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

  const todayMeals = data.meals.filter((meal) => meal.date === currentDate);
  const todayWeights = data.weights.filter((weight) => weight.date === currentDate);
  const latestTodayWeight = getLatestWeight(todayWeights);
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
  const mealCountText = countLabel(todayMeals.length, "observation", "observations");
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
    setWeightDraft(latestTodayWeight ? String(latestTodayWeight.weightKg) : "");
    setWeightOpen(true);
  };

  const openMealPanel = () => {
    setEditingMealId(null);
    setOpenMealActionId(null);
    setMealDraft(emptyMealDraft);
    setMealStep(0);
    setMealOpen(true);
  };

  const closeMealPanel = () => {
    setMealOpen(false);
    setEditingMealId(null);
    setMealStep(0);
    setMealDraft(emptyMealDraft);
  };

  const openMealEditor = (meal: MealEntry) => {
    setOpenMealActionId(null);
    setEditingMealId(meal.id);
    setMealDraft({
      kind: activeKindFromMealKind(meal.kind),
      freeText: meal.freeText,
      quantity: meal.quantity,
      servingPattern: meal.servingPattern ?? servingPatternFromQuantity(meal.quantity),
      hungerBefore: hungerForTunnel(meal.hungerBefore),
      afterMeal: meal.afterMeal,
      fullnessAfter: meal.fullnessAfter ?? fullnessFromAfterMeal(meal.afterMeal),
      stopReason: meal.stopReason,
      snackingAfter: "non",
      starterTaken: meal.starterTaken ?? false,
      starterText: meal.starterText ?? "",
      dessertTaken: meal.dessertTaken ?? false,
      dessertText: meal.dessertText ?? "",
      snackTrigger: meal.snackTrigger ?? null,
      snackContext: meal.snackContext ?? null,
      clarifications: meal.clarifications ?? [],
      questionnaireVersion: "v0.7",
      components: { ...meal.components },
    });
    setMealStep(0);
    setMealOpen(true);
  };

  const deleteMealFromJournal = (meal: MealEntry) => {
    setOpenMealActionId(null);

    if (!window.confirm("Supprimer cette observation repas ?")) {
      return;
    }

    saveData(
      {
        ...data,
        meals: deleteMealEntry(data.meals, meal.id),
      },
      "Observation supprimée.",
      [],
      cloudUserId ? [createMealDeleteMutation(cloudUserId, meal.createdAt)] : [],
    );
  };

  const addWeight = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(weightDraft.replace(",", "."));

    if (!Number.isFinite(value) || value < 40 || value > 300) {
      setError("La mesure doit être comprise entre 40 et 300 kg.");
      return;
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
  };

  const addMealToJournal = () => {
    if (mealDraft.freeText.trim().length < 2) {
      setError("Ajoute une observation courte avant de continuer.");
      return;
    }

    const preparedDraft = prepareDetectedMealDraft(mealDraft);
    const quantity = quantityFromServingPattern(preparedDraft.servingPattern);
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
      date: editedMeal?.date ?? currentDate,
      time: editedMeal?.time ?? currentTime(),
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
      questionnaireVersion: "v0.7",
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
      editedMeal ? "Observation mise à jour." : "Observation ajoutée au carnet.",
      [],
      cloudUserId ? [createMealUpsertMutation(cloudUserId, entry)] : [],
    );
    closeMealPanel();
  };

  const goToNextMealStep = (draftOverride?: MealDraft) => {
    const currentDraft = draftOverride ?? mealDraft;
    const stepIds = getMealTunnelStepIds(currentDraft.kind);
    const currentStepId = stepIds[mealStep];
    const nextStepIndex = Math.min(stepIds.length - 1, mealStep + 1);
    const nextStepId = stepIds[nextStepIndex];

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

    const nextDraft =
      nextStepId === "tags" ||
      (currentDraft.kind === "grignotage" && nextStepId === "finding")
        ? prepareDetectedMealDraft(currentDraft)
        : currentDraft;

    setError(null);
    setMealDraft(nextDraft);
    setMealStep(nextStepIndex);
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
      "Observation tabac ajoutée au carnet.",
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
    setNotice("Déconnecté du compte cloud.");
  };

  const renderToday = () => (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
            Jour {String(dayNumber).padStart(3, "0")}
          </h1>
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
            {formatLongDate(currentDate)}
          </p>
        </div>
      </header>

      {showMissionBlock ? (
        <Surface as="section" className="px-4 py-3" variant="subtle">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Mission en cours
          </p>
          <p className="mt-1.5 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text)]">
            {activePriorityText}
          </p>
        </Surface>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]">
          Aujourd’hui
        </h2>
        <div className="grid gap-3">
          <TodayActionTile
            actionLabel={latestTodayWeight ? "Modifier le poids" : "Noter le poids"}
            compact
            icon={Scale}
            label="Poids du matin"
            showActionLabel={false}
            value={
              latestTodayWeight ? formatKg(latestTodayWeight.weightKg) : "Non renseigné"
            }
            onClick={openWeightPanel}
          />
          <div className={smokingEnabled ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
            <TodayActionTile
              actionLabel="Observation repas"
              icon={Plus}
              label="Repas"
              primary
              showActionLabel={false}
              value={mealCountText}
              onClick={openMealPanel}
            />
            {smokingEnabled ? (
              <TodayActionTile
                actionLabel="Noter tabac"
                icon={Cigarette}
                label="Tabac"
                showActionLabel={false}
                value={smokingSummary}
                onClick={() => setSmokingOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]">
            Chronologie du jour
          </h2>
          <p className="shrink-0 text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
            {mealCountText}
          </p>
        </div>
        {openMealActionId ? (
          <button
            aria-label="Fermer le menu repas"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            type="button"
            onClick={() => setOpenMealActionId(null)}
          />
        ) : null}
        <div className="mt-4 space-y-3">
          {todayMeals.length === 0 ? (
            <Surface
              className="flex items-center gap-3 px-4 py-3 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]"
              variant="subtle"
            >
              <BookOpen
                aria-hidden="true"
                className="shrink-0 text-[var(--pc-color-primary)]"
                size={18}
              />
              <p>Aucune note repas pour aujourd’hui.</p>
            </Surface>
          ) : (
            todayMeals.map((meal) => (
              <TodayChronologyMeal
                key={meal.id}
                meal={meal}
                menuOpen={openMealActionId === meal.id}
                onDelete={() => deleteMealFromJournal(meal)}
                onEdit={() => openMealEditor(meal)}
                onLongPressCancel={clearMealLongPress}
                onLongPressStart={() => startMealLongPress(meal.id)}
                onOpenMenu={() => setOpenMealActionId(meal.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );

  const renderJournal = () => (
    <div className="space-y-5">
      <PageTitle kicker="Carnet" title="Chronologie">
        <p>Les observations sont listées par ordre chronologique.</p>
      </PageTitle>
      <div className="grid grid-cols-4 gap-1 rounded-full border border-[var(--pc-color-border)] bg-[var(--pc-color-primary-soft)] p-1 shadow-[var(--pc-shadow-level-1)]">
        {(["tout", "repas", "tabac", "mesures"] as JournalFilter[]).map(
          (filter) => (
            <button
              className={`min-h-10 rounded-full text-xs font-semibold transition active:scale-[0.98] ${
                journalFilter === filter
                  ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]"
                  : "text-[var(--pc-color-text)]"
              }`}
              key={filter}
              type="button"
              onClick={() => setJournalFilter(filter)}
            >
              {filter}
            </button>
          ),
        )}
      </div>
      <Chronology data={data} filter={journalFilter} />
    </div>
  );

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
                    profileDraft.age < 16 ||
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

      {weightOpen ? (
        <WeightPanel
          draft={weightDraft}
          onChange={setWeightDraft}
          onClose={() => setWeightOpen(false)}
          onSubmit={addWeight}
        />
      ) : null}

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
          step={mealStep}
          submitLabel={editingMealId ? "Mettre à jour" : "Ajouter au carnet"}
          onAdd={addMealToJournal}
          onChange={setMealDraft}
          onClose={closeMealPanel}
          onNext={goToNextMealStep}
          onPrevious={() => setMealStep((step) => Math.max(0, step - 1))}
        />
      ) : null}

      <BottomNav activeId={activeTab} items={tabs} onChange={setActiveTab} />
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
  const visibleStep =
    step === 8 && !needsSmokingGoal(draft.smokingStatus)
      ? onboardingFinalStep
      : step;
  const showPrimaryAction = visibleStep <= 5 || visibleStep === onboardingFinalStep;
  const primaryLabel =
    visibleStep === 0
      ? "Commencer"
      : visibleStep === onboardingFinalStep
        ? "Ouvrir la page du jour"
        : "Continuer";
  const progressStep = Math.min(visibleStep, onboardingFinalStep - 1);
  const actions = showPrimaryAction ? (
    <UIButton fullWidth onClick={onNext}>
      {primaryLabel}
    </UIButton>
  ) : null;
  const backAction =
    visibleStep > 0 ? (
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
      {visibleStep === 0 ? (
        <section className="space-y-5" aria-labelledby="onboarding-welcome">
          <h1
            className="max-w-[15ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)] min-[390px]:text-[2.25rem]"
            id="onboarding-welcome"
          >
            Un carnet pour observer les faits.
          </h1>
          <p className="text-xl leading-7 text-[var(--pc-color-text-muted)]">
            Pas les calories.
          </p>
        </section>
      ) : null}

      {visibleStep === 1 ? (
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

      {visibleStep === 2 ? (
        <OnboardingQuestion title="Quel âge as-tu ?">
          <FormField id="onboarding-age" label="Âge">
            <UITextInput
              inputMode="numeric"
              type="number"
              value={draft.age}
              onChange={(event) => onChange({ ...draft, age: event.target.value })}
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === 3 ? (
        <OnboardingQuestion title="Quelle est ta taille ?">
          <FormField id="onboarding-height" label="Taille en cm">
            <UITextInput
              inputMode="numeric"
              type="number"
              value={draft.heightCm}
              onChange={(event) =>
                onChange({ ...draft, heightCm: event.target.value })
              }
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === 4 ? (
        <OnboardingQuestion title="Quel est ton poids actuel ?">
          <FormField id="onboarding-weight" label="Poids en kg">
            <UITextInput
              inputMode="decimal"
              type="number"
              value={draft.startWeightKg}
              onChange={(event) =>
                onChange({ ...draft, startWeightKg: event.target.value })
              }
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === 5 ? (
        <OnboardingQuestion
          description="Un repère suffit. Il pourra changer plus tard."
          title="Quel objectif veux-tu viser ?"
        >
          <FormField id="onboarding-goal" label="Objectif en kg">
            <UITextInput
              inputMode="decimal"
              type="number"
              value={draft.goalWeightKg}
              onChange={(event) =>
                onChange({ ...draft, goalWeightKg: event.target.value })
              }
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {visibleStep === 6 ? (
        <OnboardingQuestion
          description="Ce choix n’est pas définitif. Les données pourront te contredire."
          title="Quel point semble le plus te freiner aujourd’hui ?"
        >
          <div className="grid gap-2">
            {Object.entries(frictionLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.initialFriction === key}
                key={key}
                label={label}
                name="initial-friction"
                value={key}
                onChange={() => {
                  const nextDraft = {
                    ...draft,
                    initialFriction: key as FrictionChoice,
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

      {visibleStep === 7 ? (
        <OnboardingQuestion
          description="Le tabac sera suivi séparément de l’alimentation."
          title="Tu fumes actuellement ?"
        >
          <div className="grid gap-2">
            {Object.entries(onboardingSmokingLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.smokingStatus === key}
                key={key}
                label={label}
                name="smoking-status"
                value={key}
                onChange={() => {
                  const nextDraft = {
                    ...draft,
                    smokingStatus: key as SmokingStatus,
                    smokingGoal: "pas-maintenant" as SmokingGoal,
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

      {visibleStep === 8 ? (
        <OnboardingQuestion
          description="Cette réponse sert seulement à adapter le suivi tabac."
          title="Souhaites-tu arrêter ?"
        >
          <div className="grid gap-2">
            {Object.entries(onboardingSmokingGoalLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.smokingGoal === key}
                key={key}
                label={label}
                name="smoking-goal"
                value={key}
                onChange={() => {
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
        <section className="space-y-4" aria-labelledby="onboarding-priority">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Priorité initiale
          </p>
          <h1
            className="max-w-[19ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
            id="onboarding-priority"
          >
            Pendant 7 jours : observer sans corriger brutalement.
          </h1>
          <p className="max-w-[38ch] text-lg leading-7 text-[var(--pc-color-text-muted)]">
            Ajoute tes repas au carnet. Le diagnostic viendra des faits.
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

function WeightPanel({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ActionPanel title="Mesure du matin" onClose={onClose}>
      <form className="space-y-7" onSubmit={onSubmit}>
        <label className="grid gap-3 text-sm text-[#3A3732]">
          Mesure en kg
          <div className="flex items-end gap-3">
            <input
              className="min-h-14 flex-1 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-3xl font-semibold tabular-nums text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
              inputMode="decimal"
              type="number"
              value={draft}
              onChange={(event) => onChange(event.target.value)}
              placeholder="149"
            />
            <span className="pb-3 text-sm text-[var(--pc-color-text-muted)]">kg</span>
          </div>
        </label>
        <Button type="submit">
          <Scale aria-hidden="true" size={17} />
          Ajouter au carnet
        </Button>
      </form>
    </ActionPanel>
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
  step,
  submitLabel,
  onAdd,
  onChange,
  onClose,
  onNext,
  onPrevious,
}: {
  draft: MealDraft;
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
  const componentKeys = Object.keys(componentLabels) as Array<keyof MealComponents>;
  const detectedTags = componentKeys.filter((key) => draft.components[key]);
  const [editingTags, setEditingTags] = useState(false);
  const choose = (nextDraft: MealDraft) => {
    onChange(nextDraft);
    onNext(nextDraft);
  };
  const tagsToShow = editingTags ? componentKeys : detectedTags;
  const showNextButton =
    stepId === "text" ||
    stepId === "snack-text" ||
    stepId === "starter" ||
    stepId === "dessert" ||
    stepId === "tags";

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
                onPick={(value) => choose({ ...draft, kind: value })}
              />
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
                <input
                  className={inputClass}
                  value={draft.starterText}
                  onChange={(event) =>
                    onChange({ ...draft, starterText: event.target.value })
                  }
                  placeholder="C’était quoi ?"
                />
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
                <input
                  className={inputClass}
                  value={draft.dessertText}
                  onChange={(event) =>
                    onChange({ ...draft, dessertText: event.target.value })
                  }
                  placeholder="C’était quoi ?"
                />
              ) : null}
            </TunnelQuestion>
          ) : null}

          {stepId === "serving" ? (
            <TunnelQuestion title="Tu as repris ou ajouté une portion ?">
              <TunnelChoiceLine
                options={servingPatternLabels}
                value={draft.servingPattern}
                onPick={(value) => choose({ ...draft, servingPattern: value })}
              />
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

          {stepId === "tags" ? (
            <section className="space-y-4">
              <p className={annotationClass}>Ce que l’application a repéré</p>
              <div className="flex flex-wrap gap-2">
                {tagsToShow.map((key) => {
                  const selected = draft.components[key];

                  return (
                    <button
                      className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                        selected
                          ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
                          : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text-muted)] shadow-[var(--pc-shadow-level-1)]"
                      }`}
                      key={key}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          components: {
                            ...draft.components,
                            [key]: !selected,
                          },
                        })
                      }
                    >
                      {componentLabels[key]}
                    </button>
                  );
                })}
                {!editingTags && detectedTags.length === 0 ? (
                  <p className="text-sm text-[var(--pc-color-text-muted)]">
                    Aucune étiquette détectée automatiquement.
                  </p>
                ) : null}
              </div>
              <button
                className="inline-flex min-h-9 w-fit items-center rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 text-sm font-semibold text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)] transition active:scale-[0.98]"
                type="button"
                onClick={() => setEditingTags((current) => !current)}
              >
                {editingTags ? "Masquer les étiquettes" : "Modifier les étiquettes"}
              </button>
              {draft.clarifications.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {draft.clarifications.slice(0, 2).map((clarification) => (
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
              <div className="space-y-5 rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                <ConstatPart title="Point à surveiller" text={finding.reading} />
                <ConstatPart title="Prochaine fois" text={finding.nextAction} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
                {finding.evidenceLevel}
              </p>
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
              {stepId === "tags" ? "Voir le retour" : "Continuer"}
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
  return (
    <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)]">
      <p className="mb-3 text-sm font-semibold text-[var(--pc-color-text)]">
        {clarification.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {clarificationChoices.map((choice) => {
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

function TodayChronologyMeal({
  meal,
  menuOpen,
  onDelete,
  onEdit,
  onLongPressCancel,
  onLongPressStart,
  onOpenMenu,
}: {
  meal: MealEntry;
  menuOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onLongPressCancel: () => void;
  onLongPressStart: () => void;
  onOpenMenu: () => void;
}) {
  return (
    <article
      aria-label="Observation repas. Appui long pour modifier ou supprimer."
      className={`pc-focus-ring pc-motion-safe relative grid cursor-pointer select-none grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)] transition-[border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] [-webkit-touch-callout:none] [-webkit-user-select:none] hover:border-[var(--pc-color-primary)] active:translate-y-px ${
        menuOpen ? "z-20" : ""
      }`}
      role="button"
      tabIndex={0}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenMenu();
        }
      }}
      onPointerCancel={onLongPressCancel}
      onPointerDown={() => {
        if (!menuOpen) {
          onLongPressStart();
        }
      }}
      onPointerLeave={onLongPressCancel}
      onPointerUp={onLongPressCancel}
    >
      <p className="pt-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
        {meal.time}
      </p>
      {menuOpen ? (
        <div className="absolute right-2 top-11 z-30 grid min-w-32 gap-1 rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-1 text-sm shadow-[var(--pc-shadow-level-2)]">
          <button
            className="rounded-[12px] px-3 py-2 text-left font-semibold text-[var(--pc-color-text)] transition hover:bg-[var(--pc-color-primary-soft)]"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEdit}
          >
            Modifier
          </button>
          <button
            className="rounded-[12px] px-3 py-2 text-left font-semibold text-[#8A3B32] transition hover:bg-[#FFF7F3]"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onDelete}
          >
            Supprimer
          </button>
        </div>
      ) : null}
      <div className="flex min-w-0 gap-2">
        <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]" />
        <div className="min-w-0">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
            {mealKindLabels[meal.kind]}
          </p>
          <p className="mt-0.5 truncate text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]">
            {meal.freeText}
          </p>
          <p className="mt-1 truncate text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
            {mealDetailLine(meal)}
          </p>
          {mealTagLabels(meal.components).length > 0 ? (
            <p className="mt-1 truncate text-[11px] leading-4 font-semibold text-[var(--pc-color-text-subtle)]">
              {mealTagLabels(meal.components).slice(0, 3).join(" · ")}
            </p>
          ) : null}
          <p className="mt-2 inline-flex w-fit rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary-soft)] px-2.5 py-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Signal · {meal.finding.frictionPoint}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChronologyMeal({ meal }: { meal: MealEntry }) {
  return (
    <article className="rounded-[20px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[var(--pc-color-text)]">{mealKindLabels[meal.kind]}</p>
        <p className="text-xs font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
          {meal.time}
        </p>
      </div>
      <p className="mt-2 leading-7 text-[var(--pc-color-text)]">{meal.freeText}</p>
      <p className="mt-2 text-sm text-[var(--pc-color-text-muted)]">
        {mealDetailLine(meal)}
      </p>
      {mealTagLabels(meal.components).length > 0 ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B8277]">
          {mealTagLabels(meal.components).slice(0, 4).join(" · ")}
        </p>
      ) : null}
      <p className="mt-3 inline-flex rounded-full bg-[var(--pc-color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--pc-color-primary)]">
        Signal : {meal.finding.frictionPoint}
      </p>
    </article>
  );
}

function Chronology({ data, filter }: { data: AppData; filter: JournalFilter }) {
  const entries = [
    ...data.meals.map((meal) => ({
      id: meal.id,
      type: "repas" as JournalFilter,
      date: meal.date,
      createdAt: meal.createdAt,
      node: <ChronologyMeal meal={meal} />,
    })),
    ...data.smokingEntries.map((entry) => ({
      id: entry.id,
      type: "tabac" as JournalFilter,
      date: entry.date,
      createdAt: entry.createdAt,
      node: (
        <article className="rounded-[20px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[var(--pc-color-text)]">Tabac</p>
            <p className="text-xs font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
              {entry.time}
            </p>
          </div>
          <p className="mt-2 text-[var(--pc-color-text)]">
            {smokingDayLabels[entry.state]}
            {entry.note ? ` · ${entry.note}` : ""}
          </p>
        </article>
      ),
    })),
    ...data.weights.map((entry) => ({
      id: entry.id,
      type: "mesures" as JournalFilter,
      date: entry.date,
      createdAt: entry.createdAt,
      node: (
        <article className="rounded-[20px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[var(--pc-color-text)]">Mesure</p>
            <p className="text-xs font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
              {entry.time}
            </p>
          </div>
          <p className="mt-2 text-[var(--pc-color-text)]">{formatKg(entry.weightKg)}</p>
        </article>
      ),
    })),
  ]
    .filter((entry) => filter === "tout" || entry.type === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (entries.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Aucune observation."
          text="Le carnet ne conclut pas sans preuves. Continue d'observer."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {entries.map((entry) => (
        <div key={`${entry.type}-${entry.id}`}>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#7A7166]">
            {formatShortDate(entry.date)}
          </p>
          {entry.node}
        </div>
      ))}
    </div>
  );
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
