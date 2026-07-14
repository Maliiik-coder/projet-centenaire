"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
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
import { activeMealKindLabels, mealKindLabels } from "@/lib/mealKinds";
import { deleteMealEntry, updateMealEntry } from "@/lib/mealMutations";
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
import { localDataStore, normalizeData } from "@/lib/storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WeightTrendChart } from "@/components/WeightTrendChart";
import { LogoFull, LogoHorizontal, LogoMark } from "@/components/Logo";
import { loadCloudData, saveCloudData } from "@/services/cloudDataService";
import {
  hasLocalData,
  migrateLocalDataToSupabase,
} from "@/services/localMigrationService";
import {
  clearPendingSyncData,
  hasPendingSyncData,
  storePendingSyncData,
  syncPendingLocalData,
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
  MealKind,
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
  { id: "today", label: "Page du jour", icon: PenLine },
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

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 text-base text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.035)] outline-none placeholder:text-[#7A7166] focus:border-[#3E6670] focus:ring-2 focus:ring-[#3E6670]/15";
const sectionClass =
  "rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_12px_28px_rgba(23,21,18,0.045)]";
const annotationClass = "text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166]";
const bootTimeoutMs = 4500;

function withBootTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Cloud initialization timeout"));
    }, bootTimeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  onClick,
  type = "button",
  variant = "ink",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "ink" | "line" | "signal";
}) {
  const classes =
    variant === "ink"
      ? "bg-[#171512] text-[#F3EDE2] shadow-[0_10px_22px_rgba(23,21,18,0.16)]"
      : variant === "signal"
        ? "border border-[#D7B8B2] bg-[#FFF7F3] text-[#8A3B32]"
        : "border border-[#D7CEC0] bg-[#FAF8F1] text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.04)]";

  return (
    <button
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/35 active:translate-y-px active:scale-[0.99] ${classes}`}
      type={type}
      onClick={onClick}
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
            className={`min-h-12 cursor-pointer rounded-[16px] border px-4 text-left text-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/25 active:translate-y-px ${
              selected
                ? "border-[#3E6670] bg-[#E6EFED] text-[#171512] shadow-[0_8px_18px_rgba(62,102,112,0.12)]"
                : "border-[#DDD5C7] bg-[#FAF8F1] text-[#3A3732] shadow-[0_6px_14px_rgba(23,21,18,0.03)]"
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
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] border border-[#DDD5C7] bg-[#F6F4EC] px-4 py-3 text-left transition active:scale-[0.99]"
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm font-semibold text-[#171512]">{label}</span>
      <span
        className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
          checked ? "justify-end bg-[#3E6670]" : "justify-start bg-[#D7CEC0]"
        }`}
      >
        <span className="size-6 rounded-full bg-[#FAF8F1] shadow-[0_2px_8px_rgba(23,21,18,0.18)]" />
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
      <h1 className="font-serif text-3xl leading-tight text-[#171512]">{title}</h1>
      {children ? <div className="text-base leading-7 text-[#3A3732]">{children}</div> : null}
    </header>
  );
}

function LoadingScreen() {
  return (
    <main className="app-screen">
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-4">
        <LogoFull
          className="items-start"
          markClassName="h-20 w-auto text-[#171512]"
          textClassName="font-serif text-3xl leading-tight text-[#171512]"
        />
        <h1 className="mt-4 font-serif text-4xl">Ouverture du carnet.</h1>
      </div>
    </main>
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
  const [migrationData, setMigrationData] = useState<AppData | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const localData = localDataStore.load();

      try {
        const supabase = getSupabaseBrowserClient();

        setPendingSync(hasPendingSyncData());

        if (!supabase) {
          setData(localData);
          setProfileDraft(localData.profile);
          setWeightDraft("");
          return;
        }

        const hadPendingSync = hasPendingSyncData();
        const {
          data: { user },
        } = await withBootTimeout(supabase.auth.getUser());

        if (cancelled) {
          return;
        }

        if (!user) {
          setData(localData);
          setProfileDraft(localData.profile);
          setWeightDraft("");
          return;
        }

        setCloudUserId(user.id);
        setCloudEmail(user.email ?? null);

        let cloudData = await withBootTimeout(loadCloudData(supabase, user.id));

        if (navigator.onLine && hadPendingSync) {
          await withBootTimeout(syncPendingLocalData(supabase, user.id));
          cloudData = await withBootTimeout(loadCloudData(supabase, user.id));
          localDataStore.reset();
          setPendingSync(false);
          setNotice("Données en attente synchronisées.");
        }

        const localHasData = hasLocalData(localData) && !hadPendingSync;
        const cloudHasData = hasLocalData(cloudData);

        if (localHasData) {
          setMigrationData(localData);
        }

        const initialData = cloudHasData ? cloudData : localData;
        setData(initialData);
        setProfileDraft(initialData.profile);
        setWeightDraft("");
      } catch {
        if (cancelled) {
          return;
        }

        setData(localData);
        setProfileDraft(localData.profile);
        setWeightDraft("");
        setError("Connexion cloud indisponible. Le carnet reste local pour le moment.");
      }
    };

    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      cancelled = true;
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

      if (!supabase || !hasPendingSyncData()) {
        return;
      }

      try {
        await syncPendingLocalData(supabase, cloudUserId);
        const cloudData = await loadCloudData(supabase, cloudUserId);
        localDataStore.reset();
        setData(cloudData);
        setProfileDraft(cloudData.profile);
        setPendingSync(false);
        setNotice("Données en attente synchronisées.");
      } catch {
        setPendingSync(true);
      }
    };

    window.addEventListener("online", syncOnOnline);

    return () => window.removeEventListener("online", syncOnOnline);
  }, [cloudUserId]);

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

  const analysis = useMemo(
    () => (data ? calculateWeeklyAnalysis(data, currentDate) : null),
    [data, currentDate],
  );

  if (!data || !analysis) {
    return <LoadingScreen />;
  }

  const persistData = async (normalized: AppData) => {
    const supabase = getSupabaseBrowserClient();

    if (!cloudUserId || !supabase) {
      localDataStore.save(normalized);
      return;
    }

    if (!navigator.onLine) {
      localDataStore.save(normalized);
      storePendingSyncData(normalized);
      setPendingSync(true);
      return;
    }

    try {
      await saveCloudData(supabase, cloudUserId, normalized);
      clearPendingSyncData();
      localDataStore.reset();
      setPendingSync(false);
    } catch {
      localDataStore.save(normalized);
      storePendingSyncData(normalized);
      setPendingSync(true);
      setNotice("Données en attente de synchronisation.");
    }
  };

  const saveData = (next: AppData, message?: string) => {
    const normalized = normalizeData(next);
    setData(normalized);
    setProfileDraft(normalized.profile);
    setError(null);
    void persistData(normalized);

    if (message) {
      setNotice(message);
    }
  };

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

  const exportJson = (payload: AppData, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const attachLocalDataToAccount = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !cloudUserId || !migrationData) {
      return;
    }

    try {
      const merged = await migrateLocalDataToSupabase(
        supabase,
        cloudUserId,
        migrationData,
        { clearLocalAfter: true },
      );
      setData(merged);
      setProfileDraft(merged.profile);
      setMigrationData(null);
      setPendingSync(false);
      setNotice("Données associées au compte.");
    } catch {
      setError("Migration impossible pour le moment.");
    }
  };

  const startFromCloudData = async () => {
    const supabase = getSupabaseBrowserClient();

    localDataStore.reset();
    clearPendingSyncData();
    setMigrationData(null);
    setPendingSync(false);

    if (supabase && cloudUserId) {
      const cloudData = await loadCloudData(supabase, cloudUserId);
      setData(cloudData);
      setProfileDraft(cloudData.profile);
    }

    setNotice("Données locales ignorées.");
  };

  const exportMigrationData = () => {
    if (!migrationData) {
      return;
    }

    exportJson(
      migrationData,
      `projet-centenaire-local-${currentDate}.json`,
    );
  };

  const updateProfilePreferences = (
    nextPreferences: Partial<Pick<Profile, "darkMode" | "showActiveMission">>,
  ) => {
    const nextProfile = {
      ...profile,
      ...nextPreferences,
    };

    saveData({ ...data, profile: nextProfile }, "Préférence mise à jour.");
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
    }, 2000);
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
    );
    setSmokingState("aucun");
    setSmokingNote("");
    setSmokingOpen(false);
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    localDataStore.save(data);
    await supabase?.auth.signOut();
    setCloudUserId(null);
    setCloudEmail(null);
    setPendingSync(false);
    setNotice("Déconnecté du compte cloud.");
  };

  const renderToday = () => (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl leading-tight text-[#171512]">
            Jour {String(dayNumber).padStart(3, "0")}
          </h1>
          <p className="text-sm text-[#7A7166]">{formatLongDate(currentDate)}</p>
        </div>
      </header>

      {showMissionBlock ? (
        <section className="rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-2.5 shadow-[0_10px_26px_rgba(23,21,18,0.045)]">
          <p className={annotationClass}>Mission en cours</p>
          <p className="mt-1.5 text-base leading-6 text-[#171512]">
            {activePriorityText}
          </p>
        </section>
      ) : null}

      <section className="space-y-2.5">
        <h2 className="font-serif text-2xl leading-tight text-[#171512]">
          Aujourd’hui
        </h2>
        <div className="grid gap-3">
          <TodayTile
            actionAriaLabel={
              latestTodayWeight ? "Modifier le poids" : "Noter le poids"
            }
            actionIcon={PenLine}
            label="Poids du matin"
            size="slim"
            value={
              latestTodayWeight ? formatKg(latestTodayWeight.weightKg) : "Non renseigné"
            }
            onClick={openWeightPanel}
          />
          <div className={`grid gap-3 ${smokingEnabled ? "min-[390px]:grid-cols-2" : ""}`}>
            <TodayTile
              actionLabel="+ Observation repas"
              label="Repas"
              size="compact"
              tone="primary"
              value={mealCountText}
              onClick={openMealPanel}
            />
            {smokingEnabled ? (
              <TodayTile
                actionLabel="+"
                label="Tabac"
                size="compact"
                value={smokingSummary}
                onClick={() => setSmokingOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={annotationClass}>Chronologie du jour</p>
          <p className="text-xs text-[#7A7166]">{mealCountText}</p>
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
            <p className="rounded-[18px] bg-[#FAF8F1]/75 px-4 py-3 text-sm leading-6 text-[#7A7166] shadow-[0_6px_18px_rgba(23,21,18,0.035)]">
              Aucune note repas pour aujourd’hui.
            </p>
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
      <div className="grid grid-cols-4 gap-1 rounded-full border border-[#DDD5C7] bg-[#FAF8F1] p-1 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
        {(["tout", "repas", "tabac", "mesures"] as JournalFilter[]).map(
          (filter) => (
            <button
              className={`min-h-10 rounded-full text-xs font-semibold transition active:scale-[0.98] ${
                journalFilter === filter
                  ? "bg-[#171512] text-[#F3EDE2]"
                  : "text-[#3A3732]"
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
          <p className="mt-5 leading-7 text-[#3A3732]">
            Données insuffisantes pour établir un point de friction fiable.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className={annotationClass}>Point de friction</p>
              <h2 className="mt-2 font-serif text-2xl text-[#171512]">
                {analysis.frictionPoint}
              </h2>
              <p className="mt-3 leading-7 text-[#3A3732]">
                {analysis.priority.rationale}
              </p>
            </div>
            <div>
              <p className={annotationClass}>Priorité active</p>
              <h2 className="mt-2 font-serif text-2xl text-[#171512]">
                {analysis.priority.label}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#7A7166]">
                Niveau de preuve : {analysis.priority.evidenceLevel}
              </p>
              <p className="mt-4 rounded-[18px] bg-[#E6EFED] px-4 py-3 leading-7 text-[#2F4E55]">
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
            <p className="mt-3 leading-7 text-[#3A3732]">
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
              <p className="mt-5 leading-7 text-[#3A3732]">
                Les jours non renseignés restent neutres : absence de donnée ne
                signifie pas échec.
              </p>
            </>
          )}
        </section>
      ) : null}

      <section className={sectionClass}>
        <p className={annotationClass}>Poids</p>
        <p className="mt-2 text-sm text-[#7A7166]">
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
                className="rounded-full border border-[#C7D4D2] bg-[#E6EFED] px-3 py-1 text-xs font-semibold text-[#2F5E68] transition active:scale-[0.98]"
                type="button"
                onClick={() => setProfileEditorOpen((open) => !open)}
              >
                {profileEditorOpen ? "Fermer" : "Modifier"}
              </button>
            </div>
            <button
              className="mt-4 grid w-full gap-3 rounded-[20px] border border-[#DDD5C7] bg-[#F6F4EC] p-4 text-left shadow-[0_6px_14px_rgba(23,21,18,0.03)] transition active:scale-[0.99]"
              type="button"
              onClick={() => setProfileEditorOpen(true)}
            >
              <div>
                <p className="font-serif text-2xl leading-tight text-[#171512]">
                  {profile.firstName || "Profil"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#7A7166]">
                  {profile.age} ans · {profile.heightCm} cm
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-[#3A3732]">
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

                  saveData({ ...data, profile: profileDraft }, "Profil mis à jour.");
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
            <div className="rounded-[18px] border border-[#DDD5C7] bg-[#F6F4EC] p-4">
              <p className="text-sm font-semibold text-[#171512]">
                {cloudUserId ? "Connecté" : "Non connecté"}
              </p>
              <p className="mt-1 break-words text-sm text-[#7A7166]">
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
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C7D4D2] bg-[#E6EFED] px-5 text-sm font-semibold text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.08)] transition active:scale-[0.99]"
                href="/login"
              >
                Se connecter
              </Link>
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <p className={annotationClass}>Options avancées</p>
          <details className="mt-4 rounded-[18px] border border-[#DDD5C7] bg-[#F6F4EC] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#171512]">
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
                    const imported = normalizeData(JSON.parse(await file.text()));
                    saveData(imported, "Import terminé.");
                  } catch {
                    setError("Le fichier JSON n'a pas pu être importé.");
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

                  const reset = localDataStore.reset();
                  clearPendingSyncData();
                  if (!cloudUserId) {
                    setData(reset);
                    setProfileDraft(null);
                    setOnboardingStep(0);
                  }
                  setMigrationData(null);
                  setPendingSync(false);
                  setNotice(
                    cloudUserId
                      ? "Données locales réinitialisées."
                      : "Carnet local réinitialisé.",
                  );
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
    <main className="app-screen app-screen-with-nav">
      <div className="mx-auto max-w-md">
        <header className="mb-3 flex items-center justify-center">
          <LogoMark className="h-12 w-auto text-[#171512]" />
        </header>

        {notice ? (
          <p className="mb-4 rounded-[18px] border border-[#CAD8C8] bg-[#F3FAF0] p-3 text-sm text-[#3A3732] shadow-[0_8px_18px_rgba(23,21,18,0.035)]">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-[18px] border border-[#D7B8B2] bg-[#FFF7F3] p-3 text-sm text-[#3A3732] shadow-[0_8px_18px_rgba(23,21,18,0.035)]">
            {error}
          </p>
        ) : null}
        {pendingSync ? (
          <p className="mb-4 rounded-[18px] border border-[#C7D4D2] bg-[#E6EFED] p-3 text-sm text-[#2F5E68] shadow-[0_8px_18px_rgba(23,21,18,0.035)]">
            Données en attente de synchronisation.
          </p>
        ) : null}
        {migrationData && cloudUserId ? (
          <section className="mb-5 rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_12px_28px_rgba(23,21,18,0.045)]">
            <p className={annotationClass}>Sauvegarde cloud</p>
            <h2 className="mt-2 font-serif text-2xl leading-tight">
              Des données existent sur cet appareil.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#3A3732]">
              Connecté avec {cloudEmail ?? "ce compte"}. Choisis comment traiter
              les données locales avant de continuer.
            </p>
            <div className="mt-4 grid gap-2">
              <Button onClick={attachLocalDataToAccount}>
                Associer à mon compte
              </Button>
              <Button onClick={startFromCloudData} variant="line">
                Repartir de zéro
              </Button>
              <Button onClick={exportMigrationData} variant="line">
                Exporter avant de continuer
              </Button>
            </div>
          </section>
        ) : null}
        {!supabaseConfigured ? (
          <p className="mb-4 rounded-[18px] border border-[#DDD5C7] bg-[#FAF8F1] p-3 text-xs leading-5 text-[#7A7166] shadow-[0_8px_18px_rgba(23,21,18,0.035)]">
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

      <nav className="app-bottom-nav fixed inset-x-0 bottom-0 bg-transparent pt-2">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[26px] border border-[#DDD5C7] bg-[#FAF8F1]/95 p-1 shadow-[0_16px_34px_rgba(23,21,18,0.12)] backdrop-blur">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeTab;

            return (
              <button
                aria-label={tab.label}
                className={`flex min-h-12 items-center justify-center rounded-[20px] px-1 transition active:scale-[0.98] ${
                  selected ? "bg-[#171512] text-[#F3EDE2]" : "text-[#3A3732]"
                }`}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={selected ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={2.1} />
              </button>
            );
          })}
        </div>
      </nav>
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
  const progressPercent =
    visibleStep === onboardingFinalStep
      ? 100
      : Math.max(0, Math.round((progressStep / (onboardingFinalStep - 1)) * 100));
  const questionClass =
    "mt-8 space-y-6 rounded-[28px] border border-[#DDD5C7] bg-[#FAF8F1] p-5 shadow-[0_16px_34px_rgba(23,21,18,0.07)]";

  return (
    <main className="app-screen">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <div className="min-w-0">
          <LogoHorizontal
            markClassName="h-12 w-auto shrink-0 text-[#171512]"
            textClassName="hidden whitespace-nowrap font-serif text-xl leading-none text-[#171512] min-[430px]:inline"
          />
          {visibleStep > 0 && visibleStep < onboardingFinalStep ? (
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className={annotationClass}>Profil initial</p>
                <p className="text-xs font-semibold tabular-nums text-[#7A7166]">
                  {progressStep}/{onboardingFinalStep - 1}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E6DFD3]">
                <div
                  className="h-full rounded-full bg-[#3E6670] transition-[width] duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
          {visibleStep === 0 ? (
            <div className="mt-[clamp(3rem,14svh,7rem)] space-y-6 rounded-[28px] border border-[#DDD5C7] bg-[#FAF8F1] p-5 shadow-[0_16px_34px_rgba(23,21,18,0.07)]">
              <h1 className="font-serif text-4xl leading-tight">
                Un carnet pour observer les faits.
              </h1>
              <p className="text-xl text-[#3A3732]">Pas les calories.</p>
            </div>
          ) : null}
          {visibleStep === 1 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Comment tu veux qu’on t’appelle ?
              </h1>
              <p className="leading-7 text-[#3A3732]">
                Le carnet utilise ce prénom uniquement dans l’application.
              </p>
              <TextInput
                label="Prénom"
                value={draft.firstName}
                onChange={(value) => onChange({ ...draft, firstName: value })}
              />
            </div>
          ) : null}
          {visibleStep === 2 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Quel âge as-tu ?
              </h1>
              <TextInput
                label="Âge"
                type="number"
                value={draft.age}
                onChange={(value) => onChange({ ...draft, age: value })}
              />
            </div>
          ) : null}
          {visibleStep === 3 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Quelle est ta taille ?
              </h1>
              <TextInput
                label="Taille en cm"
                type="number"
                value={draft.heightCm}
                onChange={(value) => onChange({ ...draft, heightCm: value })}
              />
            </div>
          ) : null}
          {visibleStep === 4 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Quel est ton poids actuel ?
              </h1>
              <TextInput
                label="Poids en kg"
                type="number"
                value={draft.startWeightKg}
                onChange={(value) =>
                  onChange({ ...draft, startWeightKg: value })
                }
              />
            </div>
          ) : null}
          {visibleStep === 5 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Quel objectif veux-tu viser ?
              </h1>
              <p className="leading-7 text-[#3A3732]">
                Un repère suffit. Il pourra changer plus tard.
              </p>
              <TextInput
                label="Objectif en kg"
                type="number"
                value={draft.goalWeightKg}
                onChange={(value) => onChange({ ...draft, goalWeightKg: value })}
              />
            </div>
          ) : null}
          {visibleStep === 6 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Quel point semble le plus te freiner aujourd’hui ?
              </h1>
              <ChoiceLine
                options={frictionLabels}
                value={draft.initialFriction}
                onChange={(value) => {
                  const nextDraft = { ...draft, initialFriction: value };
                  onAnswer(
                    nextDraft,
                    getNextOnboardingStep(visibleStep, nextDraft),
                  );
                }}
              />
              <p className="leading-7 text-[#7A7166]">
                Ce choix n’est pas définitif. Les données pourront te contredire.
              </p>
            </div>
          ) : null}
          {visibleStep === 7 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Tu fumes actuellement ?
              </h1>
              <ChoiceLine
                options={onboardingSmokingLabels}
                value={draft.smokingStatus}
                onChange={(value) => {
                  const nextDraft = {
                    ...draft,
                    smokingStatus: value,
                    smokingGoal: "pas-maintenant" as SmokingGoal,
                  };
                  onAnswer(
                    nextDraft,
                    getNextOnboardingStep(visibleStep, nextDraft),
                  );
                }}
              />
              <p className="leading-7 text-[#7A7166]">
                Le tabac sera suivi séparément de l’alimentation.
              </p>
            </div>
          ) : null}
          {visibleStep === 8 ? (
            <div className={questionClass}>
              <h1 className="font-serif text-3xl leading-tight">
                Souhaites-tu arrêter ?
              </h1>
              <ChoiceLine
                options={onboardingSmokingGoalLabels}
                value={draft.smokingGoal}
                onChange={(value) => {
                  const nextDraft = { ...draft, smokingGoal: value };
                  onAnswer(nextDraft, onboardingFinalStep);
                }}
              />
              <p className="leading-7 text-[#7A7166]">
                Cette réponse sert seulement à adapter le suivi tabac.
              </p>
            </div>
          ) : null}
          {visibleStep === onboardingFinalStep ? (
            <div className="mt-24 space-y-6">
              <p className={annotationClass}>Priorité initiale</p>
              <h1 className="font-serif text-3xl leading-tight">
                Pendant 7 jours : observer sans corriger brutalement.
              </h1>
              <p className="text-xl leading-8 text-[#3A3732]">
                Ajoute tes repas au carnet. Le diagnostic viendra des faits.
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="mt-6 rounded-[18px] border border-[#D7B8B2] bg-[#FFF7F3] p-3 text-sm text-[#3A3732]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          {visibleStep > 0 ? (
            <Button onClick={onBack} variant="line">
              <ChevronLeft aria-hidden="true" size={17} />
              Retour
            </Button>
          ) : (
            <span />
          )}
          {showPrimaryAction ? (
            <Button onClick={onNext}>
              {primaryLabel}
              <ChevronRight aria-hidden="true" size={17} />
            </Button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </main>
  );
}

function TodayTile({
  label,
  value,
  actionLabel,
  actionIcon: ActionIcon,
  actionAriaLabel,
  onClick,
  size = "compact",
  tone = "quiet",
}: {
  label: string;
  value: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  actionAriaLabel?: string;
  onClick: () => void;
  size?: "wide" | "compact" | "slim";
  tone?: "quiet" | "primary";
}) {
  const primary = tone === "primary";
  const slim = size === "slim";
  const iconOnly = Boolean(ActionIcon && !actionLabel);
  const sizeClass = slim ? "min-h-[4.75rem]" : size === "wide" ? "min-h-28" : "min-h-32";
  const layoutClass = slim
    ? "flex-row items-center justify-between gap-4 px-4 py-3"
    : "flex-col justify-between p-4";
  const tileClass = primary
    ? "border-[#171512] bg-[#171512] text-[#F3EDE2] shadow-[0_16px_34px_rgba(23,21,18,0.18)]"
    : "border-[#DDD5C7] bg-[#FAF8F1] text-[#171512] shadow-[0_12px_28px_rgba(23,21,18,0.06)]";
  const actionClass = primary
    ? "bg-[#F3EDE2] text-[#171512]"
    : "border border-[#C7D4D2] bg-[#E6EFED] text-[#2F5E68]";

  return (
    <button
      className={`group flex w-full cursor-pointer rounded-[22px] border text-left transition duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/45 active:translate-y-px active:scale-[0.99] ${layoutClass} ${sizeClass} ${tileClass}`}
      type="button"
      onClick={onClick}
    >
      <div className="min-w-0 space-y-1">
        <p
          className={`text-sm font-semibold ${
            primary ? "text-[#F3EDE2]" : "text-[#171512]"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-base leading-5 ${
            primary ? "text-[#E7DECF]" : "text-[#6E665C]"
          }`}
        >
          {value}
        </p>
      </div>
      <span
        aria-label={actionAriaLabel}
        className={`inline-flex min-h-8 max-w-full shrink-0 items-center rounded-full text-xs font-semibold leading-4 shadow-[0_2px_8px_rgba(23,21,18,0.06)] ${iconOnly ? "size-8 justify-center px-0" : "w-fit px-3"} ${slim ? "" : "mt-4"} ${actionClass}`}
      >
        {ActionIcon ? (
          <ActionIcon aria-hidden="true" size={15} strokeWidth={2.2} />
        ) : null}
        {actionLabel ? (
          <span className={ActionIcon ? "ml-1.5" : ""}>{actionLabel}</span>
        ) : null}
      </span>
    </button>
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
              className="min-h-14 flex-1 rounded-[18px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 text-3xl font-semibold tabular-nums text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.035)] outline-none placeholder:text-[#7A7166] focus:border-[#3E6670] focus:ring-2 focus:ring-[#3E6670]/15"
              inputMode="decimal"
              type="number"
              value={draft}
              onChange={(event) => onChange(event.target.value)}
              placeholder="149"
            />
            <span className="pb-3 text-sm text-[#7A7166]">kg</span>
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
            <p className="text-sm text-[#3A3732]">Déclencheur facultatif</p>
            <div className="flex flex-wrap gap-2">
              {smokingTriggerOptions.map((trigger) => {
                const selected = note === trigger;

                return (
                  <button
                    className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                      selected
                        ? "border-[#3E6670] bg-[#E6EFED] text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.12)]"
                        : "border-[#DDD5C7] bg-[#FAF8F1] text-[#7A7166] shadow-[0_6px_14px_rgba(23,21,18,0.03)]"
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
        <div className="mb-8 flex items-center justify-between rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
          <p className={annotationClass}>
            Observation {step + 1}/{stepIds.length}
          </p>
          <button className="text-sm font-semibold text-[#3A3732]" type="button" onClick={onClose}>
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
                className="min-h-40 rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 text-lg leading-8 text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.035)] outline-none placeholder:text-[#7A7166] focus:border-[#3E6670] focus:ring-2 focus:ring-[#3E6670]/15"
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
                          ? "border-[#3E6670] bg-[#E6EFED] text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.12)]"
                          : "border-[#DDD5C7] bg-[#FAF8F1] text-[#7A7166] shadow-[0_6px_14px_rgba(23,21,18,0.03)]"
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
                  <p className="text-sm text-[#7A7166]">
                    Aucune étiquette détectée automatiquement.
                  </p>
                ) : null}
              </div>
              <button
                className="inline-flex min-h-9 w-fit items-center rounded-full border border-[#C7D4D2] bg-[#E6EFED] px-3 text-sm font-semibold text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.08)] transition active:scale-[0.98]"
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
              <div className="space-y-5 rounded-[22px] bg-[#FAF8F1] p-4 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
                <ConstatPart title="Point à surveiller" text={finding.reading} />
                <ConstatPart title="Prochaine fois" text={finding.nextAction} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A7166]">
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
      <h1 className="font-serif text-3xl leading-tight text-[#171512]">
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
            className={`min-h-12 cursor-pointer rounded-[18px] border px-4 text-left text-base transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/25 active:translate-y-px active:scale-[0.99] ${
              selected
                ? "border-[#3E6670] bg-[#E6EFED] text-[#171512] shadow-[0_8px_18px_rgba(62,102,112,0.12)]"
                : "border-[#DDD5C7] bg-[#FAF8F1] text-[#3A3732] shadow-[0_6px_14px_rgba(23,21,18,0.03)]"
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
    <div className="rounded-[18px] border border-[#DDD5C7] bg-[#FAF8F1] p-3 shadow-[0_6px_14px_rgba(23,21,18,0.03)]">
      <p className="mb-3 text-sm font-semibold text-[#171512]">
        {clarification.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {clarificationChoices.map((choice) => {
          const selected = clarification.value === choice;

          return (
            <button
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                selected
                  ? "border-[#3E6670] bg-[#E6EFED] text-[#2F5E68]"
                  : "border-[#DDD5C7] bg-[#FFFDF7] text-[#3A3732]"
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
            ? "mt-2 font-serif text-3xl leading-tight text-[#171512]"
            : "mt-2 leading-7 text-[#3A3732]"
        }
      >
        {text}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#D3CABD] bg-[#FAF8F1] p-4 shadow-[0_8px_20px_rgba(23,21,18,0.035)]">
      <p className="font-serif text-xl text-[#171512]">{title}</p>
      <p className="mt-2 leading-7 text-[#3A3732]">{text}</p>
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
      className={`relative grid cursor-pointer grid-cols-[3rem_1fr] gap-3 rounded-[18px] bg-[#FAF8F1]/80 p-3 shadow-[0_8px_20px_rgba(23,21,18,0.04)] transition active:scale-[0.99] ${
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
      <p className="pt-1 text-xs font-semibold tabular-nums text-[#7A7166]">
        {meal.time}
      </p>
      {menuOpen ? (
        <div className="absolute right-2 top-11 z-30 grid min-w-32 gap-1 rounded-[16px] border border-[#DDD5C7] bg-[#FAF8F1] p-1 text-sm shadow-[0_16px_34px_rgba(23,21,18,0.14)]">
          <button
            className="rounded-[12px] px-3 py-2 text-left font-semibold text-[#171512] transition hover:bg-[#E6DFD3]"
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
        <span className="mt-2 size-2 shrink-0 rounded-full bg-[#3E6670]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#171512]">
            {mealKindLabels[meal.kind]}
          </p>
          <p className="mt-0.5 truncate text-sm text-[#171512]">{meal.freeText}</p>
          <p className="mt-1 truncate text-xs text-[#7A7166]">
            {mealDetailLine(meal)}
          </p>
          {mealTagLabels(meal.components).length > 0 ? (
            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B8277]">
              {mealTagLabels(meal.components).slice(0, 3).join(" · ")}
            </p>
          ) : null}
          <p className="mt-2 inline-flex w-fit rounded-full border border-[#C7D4D2] bg-[#E6EFED]/65 px-2.5 py-1 text-xs font-semibold text-[#2F5E68]">
            Signal · {meal.finding.frictionPoint}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChronologyMeal({ meal }: { meal: MealEntry }) {
  return (
    <article className="rounded-[20px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[#171512]">{mealKindLabels[meal.kind]}</p>
        <p className="text-xs font-semibold tabular-nums text-[#7A7166]">
          {meal.time}
        </p>
      </div>
      <p className="mt-2 leading-7 text-[#171512]">{meal.freeText}</p>
      <p className="mt-2 text-sm text-[#6E665C]">
        {mealDetailLine(meal)}
      </p>
      {mealTagLabels(meal.components).length > 0 ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B8277]">
          {mealTagLabels(meal.components).slice(0, 4).join(" · ")}
        </p>
      ) : null}
      <p className="mt-3 inline-flex rounded-full bg-[#E6EFED] px-3 py-1 text-xs font-semibold text-[#2F5E68]">
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
        <article className="rounded-[20px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[#171512]">Tabac</p>
            <p className="text-xs font-semibold tabular-nums text-[#7A7166]">
              {entry.time}
            </p>
          </div>
          <p className="mt-2 text-[#3A3732]">
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
        <article className="rounded-[20px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[#171512]">Mesure</p>
            <p className="text-xs font-semibold tabular-nums text-[#7A7166]">
              {entry.time}
            </p>
          </div>
          <p className="mt-2 text-[#3A3732]">{formatKg(entry.weightKg)}</p>
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
