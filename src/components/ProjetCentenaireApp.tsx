"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Dumbbell,
  LineChart,
  PenLine,
  Settings2,
} from "lucide-react";
import {
  calculateWeeklyAnalysis,
  getLatestWeight,
  isSmokingTrackingEnabled,
} from "@/lib/analytics";
import { daysBetween, shouldUpdateCurrentDate, todayISO } from "@/lib/dates";
import {
  upsertDailyWeightEntry,
  upsertSmokingEntry,
} from "@/lib/dataStabilization";
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
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AppHeader } from "@/components/centenaire/AppHeader";
import { BottomNav } from "@/components/centenaire/BottomNav";
import {
  LAUNCH_LOADING_DURATION_MS,
  LAUNCH_READY_DELAY_MS,
  LaunchScreen,
  type LaunchStage,
} from "@/components/centenaire/LaunchScreen";
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
import { SmokingPanel } from "@/features/tracking/SmokingPanel";
import {
  smokingEntryFromValues,
  weightEntryFromDraft,
} from "@/features/tracking/dailyTrackingModel";
import {
  ConnectedResetScreen,
  LoadingScreen,
  MigrationDecisionScreen,
} from "@/features/startup/StartupScreens";
import { useAppDataSession } from "@/features/session/useAppDataSession";
import { isMigrationOperationStarted } from "@/services/localMigrationService";
import {
  createMealDeleteMutation,
  createMealUpsertMutation,
} from "@/services/offlineSyncService";
import type {
  AppData,
  FrictionChoice,
  ISODate,
  MealEntry,
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

const today = todayISO();
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

export function ProjetCentenaireApp() {
  const [currentDate, setCurrentDate] = useState<ISODate>(() => todayISO());
  const {
    attachLocalDataToAccount,
    cloudEmail,
    cloudSnapshot,
    cloudUserId,
    connectedResetStatus,
    data,
    error,
    exportMigrationData,
    migrationBusy,
    migrationCandidate,
    migrationDecisionRequired,
    migrationOperation,
    notice,
    pendingSync,
    resetProfileData,
    saveData,
    setError,
    signOut,
    startFromCloudData,
  } = useAppDataSession(currentDate);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [launchStage, setLaunchStage] = useState<LaunchStage>("loading");
  const [launchAcknowledged, setLaunchAcknowledged] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [mealDraft, setMealDraft] = useState<MealDraft>(() =>
    createEmptyMealDraft(currentDate),
  );
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [openMealActionId, setOpenMealActionId] = useState<string | null>(null);
  const mealLongPressTimeoutRef = useRef<number | null>(null);
  const [smokingOpen, setSmokingOpen] = useState(false);
  const [journalView, setJournalView] = useState<JournalViewMode>("days");
  const [journalDate, setJournalDate] = useState<ISODate>(() => todayISO());
  const [journalWeekDate, setJournalWeekDate] = useState<ISODate>(() =>
    todayISO(),
  );
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [behaviorEditorOpen, setBehaviorEditorOpen] = useState(false);

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

  const addWeight = (draft: string) => {
    const result = weightEntryFromDraft(currentDate, draft);

    if (!result.entry) {
      setError(result.error);
      return false;
    }
    const entry = result.entry;

    saveData(
      {
        ...data,
        weights: upsertDailyWeightEntry(data.weights, entry),
      },
      latestTodayWeight ? "Mesure mise à jour." : "Mesure ajoutée au carnet.",
      [createWeightMutationDraft(entry)],
    );
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

  const addSmokingEntry = (state: SmokingDayState, note: string) => {
    const entry = smokingEntryFromValues(currentDate, state, note);

    saveData(
      {
        ...data,
        smokingEntries: upsertSmokingEntry(data.smokingEntries, entry),
      },
      "Tabac ajouté au carnet.",
      [createSmokingMutationDraft(entry)],
    );
    setSmokingOpen(false);
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
      weightFallbackKg={profile.startWeightKg}
      onCloseMealActionMenu={() => setOpenMealActionId(null)}
      onDeleteMeal={deleteMealFromJournal}
      onEditMeal={openMealEditor}
      onLongPressMealCancel={clearMealLongPress}
      onLongPressMealStart={startMealLongPress}
      onOpenMeal={openMealPanel}
      onOpenMealActionMenu={setOpenMealActionId}
      onOpenSmoking={() => setSmokingOpen(true)}
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
    setProfileDraft(null);
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

  const renderProfile = () => (
    <ProfileScreen
      cloudEmail={cloudEmail}
      cloudUserId={cloudUserId}
      currentDate={currentDate}
      data={data}
      editorOpen={profileEditorOpen}
      formatKg={formatKg}
      profile={profile}
      profileDraft={profileDraft ?? profile}
      onChangeDraft={setProfileDraft}
      onChangeEditorOpen={(open) => {
        setProfileDraft(open ? profile : null);
        setProfileEditorOpen(open);
      }}
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
          onClose={() => setSmokingOpen(false)}
          onSubmit={addSmokingEntry}
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
