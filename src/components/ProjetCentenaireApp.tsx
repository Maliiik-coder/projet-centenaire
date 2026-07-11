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
  detectMealComponents,
  getLatestWeight,
  isSmokingTrackingEnabled,
  roundOne,
} from "@/lib/analytics";
import {
  daysBetween,
  formatLongDate,
  formatShortDate,
  todayISO,
} from "@/lib/dates";
import {
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
import { localDataStore, normalizeData } from "@/lib/storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WeightTrendChart } from "@/components/WeightTrendChart";
import { LogoFull, LogoHorizontal, LogoMark } from "@/components/Logo";
import { deleteUserApplicationData, loadCloudData, saveCloudData } from "@/services/cloudDataService";
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
  FrictionChoice,
  HungerBefore,
  ISODate,
  MealAfter,
  MealComponents,
  MealEntry,
  MealKind,
  Profile,
  ServedQuantity,
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
  kind: MealKind;
  freeText: string;
  quantity: ServedQuantity;
  hungerBefore: HungerBefore;
  afterMeal: MealAfter;
  stopReason: StopReason;
  snackingAfter: SnackingAfter;
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
  non: "Non",
  occasionnellement: "Occasionnellement",
  "tous-les-jours": "Tous les jours",
  arrete: "Je viens d'arrêter",
};

const smokingGoalLabels: Record<SmokingGoal, string> = {
  arreter: "Arrêter",
  reduire: "Réduire",
  observer: "Observer seulement",
  "pas-maintenant": "Pas maintenant",
};

const mealKindLabels: Record<MealKind, string> = {
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation / grignotage",
  autre: "Autre",
};

const quantityLabels: Record<ServedQuantity, string> = {
  "reasonable-plate": "1 assiette raisonnable",
  "loaded-plate": "1 assiette très chargée",
  "two-plates": "2 assiettes",
  "three-plus-plates": "3 assiettes ou plus",
};

const hungerLabels: Record<HungerBefore, string> = {
  "pas-faim": "Pas faim",
  "petite-faim": "Petite faim",
  "vraie-faim": "Vraie faim",
  "tres-faim": "Très faim",
};

const afterLabels: Record<MealAfter, string> = {
  "encore-faim": "Encore faim",
  satisfait: "Satisfait",
  "trop-plein": "Trop plein",
  inconfortable: "Inconfortable",
};

const stopLabels: Record<StopReason, string> = {
  rassasie: "Rassasié",
  "assiette-vide": "Assiette terminée",
  "arret-volontaire": "Arrêt volontaire",
  "contrainte-exterieure": "Contrainte extérieure",
};

const snackingLabels: Record<SnackingAfter, string> = {
  non: "Non",
  "oui-leger": "Oui, léger",
  "oui-important": "Oui, important",
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
  hungerBefore: "vraie-faim",
  afterMeal: "satisfait",
  stopReason: "rassasie",
  snackingAfter: "non",
  components: { ...EMPTY_COMPONENTS },
};

const MEAL_TUNNEL_STEPS = 9;
const MEAL_TEXT_STEP = 1;
const MEAL_LAST_STEP = MEAL_TUNNEL_STEPS - 1;

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
  return status !== "non";
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
    draft.startDate.length > 0
  );
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
  options: Record<T, string>;
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
    <main className="min-h-dvh bg-[#F6F4EC] px-5 py-8 text-[#171512]">
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-4">
        <LogoFull
          className="items-start"
          markClassName="size-20 text-[#171512]"
          textClassName="font-serif text-3xl leading-tight text-[#171512]"
        />
        <h1 className="mt-4 font-serif text-4xl">Ouverture du carnet.</h1>
      </div>
    </main>
  );
}

export function ProjetCentenaireApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [currentDate] = useState<ISODate>(() => today);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);
  const [migrationData, setMigrationData] = useState<AppData | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>({
    firstName: "Mickael",
    age: "38",
    heightCm: "200",
    startWeightKg: "150",
    goalWeightKg: "100",
    startDate: today,
    initialFriction: "unknown",
    smokingStatus: "non",
    smokingGoal: "observer",
  });
  const [mealOpen, setMealOpen] = useState(false);
  const [mealStep, setMealStep] = useState(0);
  const [mealDraft, setMealDraft] = useState<MealDraft>(emptyMealDraft);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");
  const [smokingOpen, setSmokingOpen] = useState(false);
  const [journalFilter, setJournalFilter] = useState<JournalFilter>("tout");
  const [smokingState, setSmokingState] = useState<SmokingDayState>("aucun");
  const [smokingNote, setSmokingNote] = useState("");
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
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
        onBack={() => setOnboardingStep((step) => Math.max(0, step - 1))}
        onChange={setOnboardingDraft}
        onNext={() => {
          if (onboardingStep === 1 && !isValidProfileDraft(onboardingDraft)) {
            setError("Complète les données de base pour ouvrir le carnet.");
            return;
          }

          if (onboardingStep < 4) {
            setError(null);
            setOnboardingStep((step) => step + 1);
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

  const openWeightPanel = () => {
    setWeightDraft(latestTodayWeight ? String(latestTodayWeight.weightKg) : "");
    setWeightOpen(true);
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

    const finding = buildImmediateFinding(
      mealDraft.quantity,
      mealDraft.hungerBefore,
      mealDraft.afterMeal,
      mealDraft.snackingAfter,
      mealDraft.stopReason,
    );
    const entry: MealEntry = {
      id: createId("meal"),
      date: currentDate,
      time: currentTime(),
      kind: mealDraft.kind,
      freeText: mealDraft.freeText.trim(),
      quantity: mealDraft.quantity,
      hungerBefore: mealDraft.hungerBefore,
      afterMeal: mealDraft.afterMeal,
      stopReason: mealDraft.stopReason,
      snackingAfter: mealDraft.snackingAfter,
      components: mealDraft.components,
      finding,
      createdAt: new Date().toISOString(),
    };

    saveData(
      {
        ...data,
        meals: [...data.meals, entry],
      },
      "Observation ajoutée au carnet.",
    );
    setMealOpen(false);
    setMealStep(0);
    setMealDraft(emptyMealDraft);
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

  const renderToday = () => (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl leading-tight text-[#171512]">
            Jour {String(dayNumber).padStart(3, "0")}
          </h1>
          <p className="text-sm text-[#7A7166]">{formatLongDate(currentDate)}</p>
        </div>
      </header>

      <section className="rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_26px_rgba(23,21,18,0.045)]">
        <p className={annotationClass}>Priorité active</p>
        <p className="mt-2 text-base leading-6 text-[#171512]">
          {activePriorityText}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl leading-tight text-[#171512]">
          Aujourd’hui
        </h2>
        <div className="grid gap-3">
          <TodayTile
            actionLabel={latestTodayWeight ? "Modifier" : "Noter"}
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
              onClick={() => setMealOpen(true)}
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
        <div className="mt-4 space-y-3">
          {todayMeals.length === 0 ? (
            <p className="rounded-[18px] bg-[#FAF8F1]/75 px-4 py-3 text-sm leading-6 text-[#7A7166] shadow-[0_6px_18px_rgba(23,21,18,0.035)]">
              Aucune note repas pour aujourd’hui.
            </p>
          ) : (
            todayMeals.map((meal) => (
              <TodayChronologyMeal key={meal.id} meal={meal} />
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

  const renderProfile = () => (
    <div className="space-y-5">
      <PageTitle kicker="Profil" title="Paramètres du carnet">
        <p>Le carnet t’appartient. Tu peux exporter tes données à tout moment.</p>
      </PageTitle>
      {profileDraft ? (
        <form
          className="space-y-6"
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
          }}
        >
          <ProfileSection title="Identité">
            <TextInput
              label="Prénom"
              value={profileDraft.firstName}
              onChange={(value) =>
                setProfileDraft({ ...profileDraft, firstName: value })
              }
            />
            <NumberInput
              label="Âge"
              value={profileDraft.age}
              onChange={(value) => setProfileDraft({ ...profileDraft, age: value })}
            />
            <NumberInput
              label="Taille en cm"
              value={profileDraft.heightCm}
              onChange={(value) =>
                setProfileDraft({ ...profileDraft, heightCm: value })
              }
            />
          </ProfileSection>
          <ProfileSection title="Objectif">
            <NumberInput
              label="Poids actuel"
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
            <TextInput
              label="Date de début"
              type="date"
              value={profileDraft.startDate}
              onChange={(value) =>
                setProfileDraft({ ...profileDraft, startDate: value })
              }
            />
          </ProfileSection>
          <ProfileSection title="Contexte">
            <ChoiceLine
              options={frictionLabels}
              value={profileDraft.initialFriction}
              onChange={(value) =>
                setProfileDraft({ ...profileDraft, initialFriction: value })
              }
            />
          </ProfileSection>
          <ProfileSection title="Tabac">
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
          </ProfileSection>
          <Button type="submit">Ajouter au carnet</Button>
        </form>
      ) : null}

      <section className={sectionClass}>
        <p className={annotationClass}>Données</p>
        <div className="mt-4 grid gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C7D4D2] bg-[#E6EFED] px-5 text-sm font-semibold text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.08)] transition active:scale-[0.99]"
            href={cloudUserId ? "/account" : "/login"}
          >
            {cloudUserId ? "Compte cloud" : "Connexion cloud"}
          </Link>
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
              const message = cloudUserId
                ? "Réinitialiser le carnet cloud et local ?"
                : "Réinitialiser le carnet local ?";

              if (!window.confirm(message)) {
                return;
              }

              const supabase = getSupabaseBrowserClient();
              const reset =
                supabase && cloudUserId
                  ? await deleteUserApplicationData(supabase, cloudUserId)
                  : localDataStore.reset();

              localDataStore.reset();
              clearPendingSyncData();
              setData(reset);
              setProfileDraft(null);
              setMigrationData(null);
              setPendingSync(false);
              setOnboardingStep(0);
              setNotice("Carnet réinitialisé.");
            }}
            variant="signal"
          >
            <RefreshCw aria-hidden="true" size={17} />
            Réinitialiser le carnet
          </Button>
        </div>
      </section>
    </div>
  );

  const content = {
    today: renderToday,
    journal: renderJournal,
    insights: renderInsights,
    profile: renderProfile,
  }[activeTab]();

  return (
    <main className="min-h-dvh bg-[#F6F4EC] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 text-[#171512]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center justify-center">
          <LogoMark className="size-12 text-[#171512]" />
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
          onAdd={addMealToJournal}
          onChange={setMealDraft}
          onClose={() => {
            setMealOpen(false);
            setMealStep(0);
          }}
          onNext={() => {
            if (mealStep === MEAL_TEXT_STEP && mealDraft.freeText.trim().length < 2) {
              setError("Ajoute une observation courte avant de continuer.");
              return;
            }

            if (mealStep === MEAL_TEXT_STEP) {
              setMealDraft((current) => ({
                ...current,
                components: detectMealComponents(current.freeText),
              }));
            }

            setError(null);
            setMealStep((step) => Math.min(MEAL_LAST_STEP, step + 1));
          }}
          onPrevious={() => setMealStep((step) => Math.max(0, step - 1))}
        />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 bg-transparent px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2">
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
  onChange,
  onNext,
}: {
  draft: OnboardingDraft;
  error: string | null;
  step: number;
  onBack: () => void;
  onChange: (draft: OnboardingDraft) => void;
  onNext: () => void;
}) {
  return (
    <main className="min-h-dvh bg-[#F6F4EC] px-5 py-8 text-[#171512]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-between">
        <div>
          <LogoHorizontal
            markClassName="size-10 shrink-0 text-[#171512]"
            textClassName="whitespace-nowrap font-serif text-xl leading-none text-[#171512]"
          />
          {step === 0 ? (
            <div className="mt-24 space-y-6">
              <h1 className="font-serif text-4xl leading-tight">
                Un carnet pour observer les faits.
              </h1>
              <p className="text-xl text-[#3A3732]">Pas les calories.</p>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="mt-10 space-y-6">
              <h1 className="font-serif text-3xl leading-tight">Profil de base</h1>
              <p className="leading-7 text-[#3A3732]">
                Ces données servent uniquement à mesurer l’évolution. Elles ne
                définissent pas ta valeur.
              </p>
              <TextInput
                label="Prénom"
                value={draft.firstName}
                onChange={(value) => onChange({ ...draft, firstName: value })}
              />
              <NumberInput
                label="Âge"
                value={Number(draft.age)}
                onChange={(value) => onChange({ ...draft, age: String(value) })}
              />
              <NumberInput
                label="Taille en cm"
                value={Number(draft.heightCm)}
                onChange={(value) => onChange({ ...draft, heightCm: String(value) })}
              />
              <TextInput
                label="Poids actuel"
                type="number"
                value={draft.startWeightKg}
                onChange={(value) =>
                  onChange({ ...draft, startWeightKg: value })
                }
              />
              <TextInput
                label="Poids objectif"
                type="number"
                value={draft.goalWeightKg}
                onChange={(value) => onChange({ ...draft, goalWeightKg: value })}
              />
              <TextInput
                label="Date de début"
                type="date"
                value={draft.startDate}
                onChange={(value) => onChange({ ...draft, startDate: value })}
              />
            </div>
          ) : null}
          {step === 2 ? (
            <div className="mt-10 space-y-6">
              <h1 className="font-serif text-3xl leading-tight">
                Quel point semble le plus te freiner aujourd’hui ?
              </h1>
              <ChoiceLine
                options={frictionLabels}
                value={draft.initialFriction}
                onChange={(value) => onChange({ ...draft, initialFriction: value })}
              />
              <p className="leading-7 text-[#7A7166]">
                Ce choix n’est pas définitif. Les données pourront te contredire.
              </p>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="mt-10 space-y-6">
              <h1 className="font-serif text-3xl leading-tight">
                Fumez-vous actuellement ?
              </h1>
              <ChoiceLine
                options={smokingStatusLabels}
                value={draft.smokingStatus}
                onChange={(value) =>
                  onChange({
                    ...draft,
                    smokingStatus: value,
                    smokingGoal: needsSmokingGoal(value)
                      ? draft.smokingGoal
                      : "pas-maintenant",
                  })
                }
              />
              {needsSmokingGoal(draft.smokingStatus) ? (
                <>
                  <h2 className="font-serif text-2xl">
                    Quel objectif voulez-vous suivre ?
                  </h2>
                  <ChoiceLine
                    options={smokingGoalLabels}
                    value={draft.smokingGoal}
                    onChange={(value) => onChange({ ...draft, smokingGoal: value })}
                  />
                </>
              ) : null}
              <p className="leading-7 text-[#7A7166]">
                Le tabac sera suivi séparément de l’alimentation.
              </p>
            </div>
          ) : null}
          {step === 4 ? (
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
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button onClick={onBack} variant="line">
              <ChevronLeft aria-hidden="true" size={17} />
              Retour
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={onNext}>
            {step === 0 ? "Commencer" : step === 4 ? "Ouvrir la page du jour" : "Continuer"}
            <ChevronRight aria-hidden="true" size={17} />
          </Button>
        </div>
      </div>
    </main>
  );
}

function TodayTile({
  label,
  value,
  actionLabel,
  onClick,
  size = "compact",
  tone = "quiet",
}: {
  label: string;
  value: string;
  actionLabel: string;
  onClick: () => void;
  size?: "wide" | "compact" | "slim";
  tone?: "quiet" | "primary";
}) {
  const primary = tone === "primary";
  const slim = size === "slim";
  const sizeClass = slim ? "min-h-20" : size === "wide" ? "min-h-28" : "min-h-32";
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
        className={`inline-flex min-h-8 w-fit max-w-full shrink-0 items-center rounded-full px-3 text-xs font-semibold leading-4 shadow-[0_2px_8px_rgba(23,21,18,0.06)] ${slim ? "" : "mt-4"} ${actionClass}`}
      >
        {actionLabel}
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
    <div className="fixed inset-0 z-30 bg-[#F6F4EC] px-5 py-6 text-[#171512]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col">
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
  onAdd,
  onChange,
  onClose,
  onNext,
  onPrevious,
}: {
  draft: MealDraft;
  step: number;
  onAdd: () => void;
  onChange: (draft: MealDraft) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const finding = buildImmediateFinding(
    draft.quantity,
    draft.hungerBefore,
    draft.afterMeal,
    draft.snackingAfter,
    draft.stopReason,
  );
  const componentKeys = Object.keys(componentLabels) as Array<keyof MealComponents>;
  const detectedTags = componentKeys.filter((key) => draft.components[key]);
  const [editingTags, setEditingTags] = useState(false);
  const choose = (nextDraft: MealDraft) => {
    onChange(nextDraft);
    onNext();
  };
  const tagsToShow = editingTags ? componentKeys : detectedTags;

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-[#F6F4EC] px-5 py-6 text-[#171512]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
          <p className={annotationClass}>
            Observation {step + 1}/{MEAL_TUNNEL_STEPS}
          </p>
          <button className="text-sm font-semibold text-[#3A3732]" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-3">
          {step === 0 ? (
            <TunnelQuestion title="Type d'observation">
              <TunnelChoiceLine
                options={mealKindLabels}
                value={draft.kind}
                onPick={(value) => choose({ ...draft, kind: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6">
              <p className={annotationClass}>Contenu libre</p>
              <h1 className="font-serif text-3xl leading-tight">
                Note ce que tu as mangé, simplement.
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

          {step === 2 ? (
            <TunnelQuestion title="Quantité servie">
              <TunnelChoiceLine
                options={quantityLabels}
                value={draft.quantity}
                onPick={(value) => choose({ ...draft, quantity: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 3 ? (
            <TunnelQuestion title="Faim avant le repas">
              <TunnelChoiceLine
                options={hungerLabels}
                value={draft.hungerBefore}
                onPick={(value) => choose({ ...draft, hungerBefore: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 4 ? (
            <TunnelQuestion title="Après le repas">
              <TunnelChoiceLine
                options={afterLabels}
                value={draft.afterMeal}
                onPick={(value) => choose({ ...draft, afterMeal: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 5 ? (
            <TunnelQuestion title="Pourquoi l'arrêt ?">
              <TunnelChoiceLine
                options={stopLabels}
                value={draft.stopReason}
                onPick={(value) => choose({ ...draft, stopReason: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 6 ? (
            <TunnelQuestion title="Grignotage après le repas ?">
              <TunnelChoiceLine
                options={snackingLabels}
                value={draft.snackingAfter}
                onPick={(value) => choose({ ...draft, snackingAfter: value })}
              />
            </TunnelQuestion>
          ) : null}

          {step === 7 ? (
            <section className="space-y-4">
              <p className={annotationClass}>Étiquettes détectées</p>
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
            </section>
          ) : null}

          {step === 8 ? (
            <section className="space-y-6">
              <ConstatPart title="Constat" text={finding.fact} emphasized />
              <div className="space-y-5 rounded-[22px] bg-[#FAF8F1] p-4 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
                <ConstatPart title="Lecture" text={finding.reading} />
                <ConstatPart title="Prochaine action" text={finding.nextAction} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A7166]">
                Niveau de preuve : {finding.evidenceLevel}
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
          {step === 1 || step === 7 ? (
            <Button onClick={onNext}>
              {step === 7 ? "Voir le constat" : "Continuer"}
              <ChevronRight aria-hidden="true" size={17} />
            </Button>
          ) : null}
          {step === 8 ? (
            <Button onClick={onAdd}>
              <Archive aria-hidden="true" size={17} />
              Ajouter au carnet
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
  options: Record<T, string>;
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

function TodayChronologyMeal({ meal }: { meal: MealEntry }) {
  return (
    <article className="grid grid-cols-[3rem_1fr] gap-3 rounded-[18px] bg-[#FAF8F1]/80 p-3 shadow-[0_8px_20px_rgba(23,21,18,0.04)]">
      <p className="pt-1 text-xs font-semibold tabular-nums text-[#7A7166]">
        {meal.time}
      </p>
      <div className="flex min-w-0 gap-2">
        <span className="mt-2 size-2 shrink-0 rounded-full bg-[#3E6670]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#171512]">
            {mealKindLabels[meal.kind]}
          </p>
          <p className="mt-0.5 truncate text-sm text-[#171512]">{meal.freeText}</p>
          <p className="mt-1 truncate text-xs text-[#7A7166]">
            {quantityLabels[meal.quantity]} ·{" "}
            {hungerLabels[meal.hungerBefore].toLowerCase()} ·{" "}
            {afterLabels[meal.afterMeal].toLowerCase()}
          </p>
          <p className="mt-1 text-xs text-[#3A3732]">
            Signal : {meal.finding.frictionPoint}
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
        {quantityLabels[meal.quantity]} ·{" "}
        {hungerLabels[meal.hungerBefore].toLowerCase()} ·{" "}
        {afterLabels[meal.afterMeal].toLowerCase()}
      </p>
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

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={sectionClass}>
      <p className={annotationClass}>{title}</p>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
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
