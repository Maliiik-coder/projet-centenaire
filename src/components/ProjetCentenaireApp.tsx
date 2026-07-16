"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  Download,
  Dumbbell,
  LineChart,
  PenLine,
  Settings2,
} from "lucide-react";
import {
  calculateWeeklyAnalysis,
  getLatestWeight,
  isSmokingTrackingEnabled,
  roundOne,
} from "@/lib/analytics";
import { daysBetween, shouldUpdateCurrentDate, todayISO } from "@/lib/dates";
import {
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
import { isCurrentCloudAttempt } from "@/lib/cloudAttempt";
import {
  CLOUD_RECOVERY_DELAY_MS,
  withCloudReadTimeout,
} from "@/lib/cloudRead";
import {
  deleteMealEntry,
  updateMealEntry,
} from "@/lib/mealMutations";
import { shouldShowActiveMission } from "@/lib/mission";
import { isInitialObservationDay } from "@/lib/observationPhase";
import {
  APP_RESUME_PARAM,
  APP_RESUME_TAB_PARAM,
  appResumePath,
  clearLocalEntryMode,
  isLocalEntryModeSelected,
  onboardingEntryPath,
  ONBOARDING_START_PARAM,
} from "@/lib/entryMode";
import { legacyFrictionFromAssessment } from "@/lib/onboarding";
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
import { AppHeader } from "@/components/centenaire/AppHeader";
import { BottomNav } from "@/components/centenaire/BottomNav";
import {
  LAUNCH_LOADING_DURATION_MS,
  LAUNCH_READY_DELAY_MS,
  LaunchScreen,
  type LaunchStage,
} from "@/components/centenaire/LaunchScreen";
import { StartupStateLayout } from "@/components/centenaire/StartupStateLayout";
import { TodayScreen } from "@/components/centenaire/TodayScreen";
import { InsightsScreen } from "@/features/insights/InsightsScreen";
import { JournalScreen } from "@/features/journal/JournalScreen";
import type { JournalViewMode } from "@/features/journal/journalModel";
import { MealTunnelScreen } from "@/features/meal/MealTunnelScreen";
import {
  createEmptyMealDraft,
  fullnessFromAfterMeal,
  fullnessLabels,
  getMealSubmitError,
  hungerLabels,
  mealDraftFromEntry,
  mealEntryFromDraft,
  mealSectionQuantity,
  quantitySummary,
  reserviceHungerLabels,
  servingPatternFromQuantity,
  servingPatternLabels,
  snackContextLabels,
  snackTriggerLabels,
  type MealDraft,
} from "@/features/meal/mealDraftModel";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { BehaviorProfileEditor } from "@/features/onboarding/BehaviorProfileEditor";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import {
  onboardingNameStep,
  onboardingWelcomeStep,
} from "@/features/onboarding/onboardingModel";
import {
  Button as UIButton,
  ErrorState,
  Surface,
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
  FrictionChoice,
  ISODate,
  MealEntry,
  MealMutation,
  NonMealMutationDraft,
  Profile,
  SmokingEntry,
  SmokingDayState,
  WeightEntry,
} from "@/lib/types";

type TabId = "today" | "journal" | "insights" | "profile";
type NavigationTabId = TabId | "sport";

interface TabDefinition {
  accessibleLabel?: string;
  id: NavigationTabId;
  label: string;
  icon: LucideIcon;
}

const tabs: TabDefinition[] = [
  { id: "today", label: "Jour", accessibleLabel: "Page du jour", icon: PenLine },
  { id: "journal", label: "Carnet", icon: BookOpen },
  { id: "insights", label: "Constats", icon: LineChart },
  { id: "sport", label: "Sport", icon: Dumbbell },
  { id: "profile", label: "Profil", icon: Settings2 },
];

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

  const today = todayISO();
const emptyMigrationSources: LocalMigrationSources = {
  guest: null,
  legacy: null,
};

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";
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
  const [mealOpen, setMealOpen] = useState(false);
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

  if (!profile || onboardingPreview) {
    return (
      <OnboardingFlow
        error={error}
        initialStep={
          onboardingEntryRequested ||
          cloudUserId ||
          isLocalEntryModeSelected()
            ? onboardingNameStep
            : onboardingWelcomeStep
        }
        preview={onboardingPreview}
        startDate={today}
        onComplete={(nextProfile) => {
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
        onError={setError}
        onExit={() => {
          window.location.assign(
            onboardingPreview ? "/?onboarding-preview=1" : "/",
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
    setMealOpen(true);
  };

  const closeMealPanel = () => {
    setMealOpen(false);
    setEditingMealId(null);
    setMealDraft(createEmptyMealDraft(currentDate));
  };

  const openMealEditor = (meal: MealEntry) => {
    setOpenMealActionId(null);
    setEditingMealId(meal.id);
    setMealDraft(mealDraftFromEntry(meal));
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
    const validationError = getMealSubmitError(mealDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const editedMeal = editingMealId
      ? data.meals.find((meal) => meal.id === editingMealId)
      : null;
    const entry = mealEntryFromDraft(mealDraft, editedMeal ?? null);

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

  const renderJournal = () => (
    <JournalScreen
      currentDate={currentDate}
      data={data}
      date={journalDate}
      formatKg={formatKg}
      formatSmokingEntry={smokingEntryLine}
      pendingSync={pendingSync}
      profile={profile}
      smokingEnabled={smokingEnabled}
      view={journalView}
      weekDate={journalWeekDate}
      onDateChange={setJournalDate}
      onDeleteMeal={deleteMealFromJournal}
      onEditMeal={openMealEditor}
      onViewChange={setJournalView}
      onWeekDateChange={setJournalWeekDate}
    />
  );

  const renderInsights = () => (
    <InsightsScreen
      analysis={analysis}
      formatKg={formatKg}
      smokingEnabled={smokingEnabled}
      weights={data.weights}
    />
  );

  const saveProfileChanges = (nextProfile: Profile) => {
    const patch = buildProfilePatch(profile, nextProfile);
    const mutation = createProfilePatchMutationDraft(patch);

    saveData(
      { ...data, profile: nextProfile },
      "Profil mis à jour.",
      mutation ? [mutation] : [],
    );
    setProfileEditorOpen(false);
  };

  const importProfileData = async (file: File) => {
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
    }
  };

  const resetProfileData = async () => {
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
        const cloudData = await resetConnectedLocalData(supabase, cloudUserId);
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
    setMigrationSources((current) => ({
      ...current,
      guest: null,
    }));
    setPendingSync(false);
    setNotice("Carnet local réinitialisé.");
  };

  const renderProfile = () => (
    <ProfileScreen
      cloudEmail={cloudEmail}
      cloudUserId={cloudUserId}
      currentDate={currentDate}
      data={data}
      editorOpen={profileEditorOpen}
      formatKg={formatKg}
      profile={profile}
      profileDraft={profileDraft}
      onChangeDraft={setProfileDraft}
      onChangeEditorOpen={setProfileEditorOpen}
      onImportFile={importProfileData}
      onOpenBehaviorEditor={() => setBehaviorEditorOpen(true)}
      onPreferencesChange={updateProfilePreferences}
      onResetData={resetProfileData}
      onSaveProfile={saveProfileChanges}
      onSignOut={signOut}
      onValidationError={setError}
    />
  );

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
        <MealTunnelScreen
          draft={mealDraft}
          initialObservationActive={isInitialObservationDay(dayNumber)}
          submitLabel={editingMealId ? "Mettre à jour" : "Ajouter au carnet"}
          onAdd={addMealToJournal}
          onChange={setMealDraft}
          onClose={closeMealPanel}
          onError={setError}
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
