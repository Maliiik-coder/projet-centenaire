"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  History,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Square,
  Timer,
} from "lucide-react";
import { getExerciseById, getVariantById } from "@/lib/sport/exerciseLibrary";
import { ExerciseIllustration } from "@/features/sport/ExerciseIllustration";
import bodyweightSquatControlledGuide from "@/features/sport/assets/bodyweight-squat-controlled-guide.png";
import bodyweightSquatDeeperGuide from "@/features/sport/assets/bodyweight-squat-deeper-guide.png";
import bodyweightSquatPartialGuide from "@/features/sport/assets/bodyweight-squat-partial-guide.png";
import plankFullGuide from "@/features/sport/assets/plank-full-guide.png";
import plankKneesGuide from "@/features/sport/assets/plank-knees-guide.png";
import plankWallGuide from "@/features/sport/assets/plank-wall-guide.png";
import pushFeetElevatedGuide from "@/features/sport/assets/push-feet-elevated-guide.png";
import pushKneesGuide from "@/features/sport/assets/push-knees-guide.png";
import pushStandardGuide from "@/features/sport/assets/push-standard-guide.png";
import pushWallGuide from "@/features/sport/assets/push-wall-guide.png";
import warmupMarchActiveGuide from "@/features/sport/assets/warmup-march-active-guide.png";
import warmupMarchEasyGuide from "@/features/sport/assets/warmup-march-easy-guide.png";
import { generateWorkout } from "@/lib/sport/workoutGenerator";
import {
  cancelTimer,
  createWorkoutTimer,
  extendCurrentRecovery,
  finishTimer,
  getTimerView,
  pauseTimer,
  resumeTimer,
  skipToNextStep,
  startTimer,
  stepsToTimerSteps,
  syncTimer,
} from "@/lib/sport/workoutTimer";
import type {
  BodyZone,
  CapabilityDimension,
  CapabilityLevel,
  FeedbackBodySignal,
  FeedbackCompletion,
  FeedbackDifficulty,
  GeneratedWorkoutSession,
  SportAssessmentLevelResults,
  SportAssessmentResults,
  SportActivity,
  SportFrequency,
  SportGoal,
  SportLocalData,
  SportLocation,
  SportOnboardingDraft,
  WorkoutTimerState,
} from "@/lib/sport/types";
import { SPORT_LOCAL_USER_ID } from "@/lib/sport/config";
import {
  Button,
  ChoiceCard,
  LoadingState,
  Surface,
  TextInput,
} from "@/components/ui";
import { cx } from "@/components/ui/styles";
import { loadSportLocalData, saveSportLocalData } from "@/services/sport/sportLocalStore";
import {
  createDefaultSportOnboardingDraft,
  createEmptySportData,
  createSportDataFromDraft,
} from "@/services/sport/sportProfileService";
import {
  addWorkoutFeedback,
  createWorkoutFeedback,
  saveProposedSession,
  updateSessionStatus,
} from "@/services/sport/workoutHistoryService";
import {
  applyAssessmentLevelResults,
  hasCompletedSportAssessment,
} from "@/services/sport/sportAssessmentService";

type SportView =
  | "access"
  | "home"
  | "onboarding"
  | "assessment"
  | "preview"
  | "active"
  | "feedback"
  | "history"
  | "settings";

const goalLabels: Record<SportGoal, string> = {
  restart_activity: "Reprendre une activite",
  support_weight_loss: "Accompagner une perte de poids",
  improve_endurance: "Ameliorer l'endurance",
  build_strength: "Se renforcer",
  general_conditioning: "Ameliorer la condition generale",
};

const activityLabels: Record<SportActivity, string> = {
  strength: "Renforcement musculaire",
  walk_run: "Marche/course",
  swim: "Natation",
};

const frequencyLabels: Record<SportFrequency, string> = {
  once_weekly: "Une fois par semaine",
  twice_weekly: "Deux fois",
  three_weekly: "Trois fois",
  four_plus_weekly: "Quatre fois ou plus",
  undefined: "Aucune frequence definie",
};

const zoneLabels: Record<BodyZone, string> = {
  shoulders: "Epaules",
  back: "Dos",
  knees: "Genoux",
  hips: "Hanches",
  wrists: "Poignets",
  ankles: "Chevilles",
  other: "Autre",
};

const durationChoices = [8, 15, 20, 30, 45];
const dashboardDurationChoices = [15, 20, 30, 45, 60];
const activityChoices: SportActivity[] = ["strength", "walk_run", "swim"];
const zoneChoices: BodyZone[] = [
  "shoulders",
  "back",
  "knees",
  "hips",
  "wrists",
  "ankles",
  "other",
];

function nowIso(): string {
  return new Date().toISOString();
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)} min`;
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function primaryLocation(profile: NonNullable<SportLocalData["profile"]>): SportLocation {
  return profile.availableLocations[0] ?? "home";
}

function isDoneSession(session: GeneratedWorkoutSession): boolean {
  return session.status === "completed" || session.status === "partially_completed";
}

function formatSessionDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function isSameLocalDay(isoDate: string, reference: Date): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function capabilityLevelFor(
  data: SportLocalData,
  dimension: CapabilityDimension,
): CapabilityLevel | null {
  return data.capabilities.find((capability) => capability.dimension === dimension)
    ?.level ?? null;
}

export function SportApp() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<SportLocalData>(() => createEmptySportData());
  const [view, setView] = useState<SportView>("home");
  const [draft, setDraft] = useState<SportOnboardingDraft>(() =>
    createDefaultSportOnboardingDraft(),
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [dashboardDurationSelected, setDashboardDurationSelected] =
    useState(false);
  const [activeSession, setActiveSession] =
    useState<GeneratedWorkoutSession | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [timer, setTimer] = useState<WorkoutTimerState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedbackDifficulty, setFeedbackDifficulty] =
    useState<FeedbackDifficulty>("right");
  const [feedbackCompletion, setFeedbackCompletion] =
    useState<FeedbackCompletion>("completed");
  const [feedbackBodySignal, setFeedbackBodySignal] =
    useState<FeedbackBodySignal>("none");
  const [feedbackZone, setFeedbackZone] = useState<BodyZone | "">("");
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = loadSportLocalData();
      setData(stored);
      setSelectedDuration(stored.profile?.usualDurationMinutes ?? 15);
      setView(stored.profile?.questionnaireCompleted ? "home" : "access");
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveSportLocalData(data);
    }
  }, [data, loaded]);

  useEffect(() => {
    if (view !== "active" || !timer) {
      return undefined;
    }

    const id = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      setTimer((previous) => (previous ? syncTimer(previous, current) : previous));
    }, 500);

    return () => window.clearInterval(id);
  }, [timer, view]);

  useEffect(() => {
    if (view === "active" && timer?.status === "finished" && activeSession) {
      const id = window.setTimeout(() => {
        const performed = getTimerView(timer, Date.now()).totalElapsedSeconds;
        setData((current) =>
          updateSessionStatus(
            current,
            activeSession.id,
            "completed",
            performed,
          ),
        );
        setFeedbackCompletion("completed");
        setView("feedback");
      }, 0);

      return () => window.clearTimeout(id);
    }

    return undefined;
  }, [activeSession, timer, view]);

  const timerView = timer ? getTimerView(timer, nowMs) : null;

  function persist(next: SportLocalData): void {
    setData(next);
  }

  function completeOnboarding(): void {
    const safeDraft: SportOnboardingDraft = {
      ...draft,
      goals: draft.goals,
      preferredActivities:
        draft.preferredActivities.length > 0 ? draft.preferredActivities : ["strength"],
      availableLocations: ["home"],
      equipment: ["none"],
      limitationKind: "none",
      limitationZone: null,
      limitationDescription: "",
      pullCapability: null,
    };
    const nextData = createSportDataFromDraft(safeDraft, nowIso());
    persist(nextData);
    setSelectedDuration(nextData.profile?.usualDurationMinutes ?? 15);
    setDashboardDurationSelected(false);
    setView("home");
  }

  function openSportProgram(): void {
    setOnboardingStep(0);
    setView(data.profile?.questionnaireCompleted ? "home" : "onboarding");
  }

  function completeAssessment(results: SportAssessmentLevelResults): void {
    const profile = data.profile;
    if (!profile) {
      return;
    }

    persist({
      ...data,
      capabilities: applyAssessmentLevelResults(
        data.capabilities,
        profile.userId,
        results,
        nowIso(),
      ),
    });
    setDashboardDurationSelected(false);
    setView("home");
  }

  function generateSession(): void {
    const profile = data.profile;
    if (!profile) {
      setView("access");
      return;
    }

    const result = generateWorkout({
      userId: profile.userId,
      activity: "strength",
      requestedDurationMinutes: selectedDuration,
      location: primaryLocation(profile),
      equipment: data.equipment,
      limitations: data.limitations,
      capabilities: data.capabilities,
      previousSessions: data.sessions,
      feedback: data.feedback,
      now: nowIso(),
      seed: "sport-isolated-route",
    });

    if (!result.session) {
      setGenerationError(
        result.reasons.at(-1)?.message ??
          "Impossible de proposer une seance compatible pour le moment.",
      );
      return;
    }

    setGenerationError(null);
    setActiveSession(result.session);
    persist(saveProposedSession(data, result.session));
    setView("preview");
  }

  function selectDashboardDuration(duration: number): void {
    setSelectedDuration(duration);
    setDashboardDurationSelected(true);
  }

  function startActiveSession(): void {
    if (!activeSession) {
      return;
    }

    const startedAt = Date.now();
    const timerState = startTimer(
      createWorkoutTimer(activeSession.id, stepsToTimerSteps(activeSession.steps)),
      startedAt,
    );
    setTimer(timerState);
    setNowMs(startedAt);
    persist(updateSessionStatus(data, activeSession.id, "started"));
    setView("active");
  }

  function finishActiveSession(completion: FeedbackCompletion): void {
    if (!timer || !activeSession) {
      return;
    }

    const current = Date.now();
    const finished =
      completion === "stopped" ? cancelTimer(timer, current) : finishTimer(timer, current);
    const viewState = getTimerView(finished, current);
    const status =
      completion === "completed"
        ? "completed"
        : completion === "partial"
          ? "partially_completed"
          : "abandoned";
    setTimer(finished);
    setFeedbackCompletion(completion);
    persist(
      updateSessionStatus(
        data,
        activeSession.id,
        status,
        viewState.totalElapsedSeconds,
      ),
    );
    setView("feedback");
  }

  function submitFeedback(): void {
    if (!activeSession || !data.profile) {
      return;
    }

    const feedback = createWorkoutFeedback({
      userId: data.profile.userId,
      sessionId: activeSession.id,
      difficulty: feedbackDifficulty,
      completion: feedbackCompletion,
      bodySignal: feedbackBodySignal,
      affectedZone: feedbackZone || null,
      comment: feedbackComment,
      createdAt: nowIso(),
    });
    const withFeedback = addWorkoutFeedback(data, feedback);
    persist(withFeedback);
    setFeedbackDifficulty("right");
    setFeedbackCompletion("completed");
    setFeedbackBodySignal("none");
    setFeedbackZone("");
    setFeedbackComment("");
    setTimer(null);
    setView("home");
  }

  if (!loaded) {
    return (
      <main className="pc-screen">
        <div className="pc-screen-inner flex items-center justify-center">
          <LoadingState label="Ouverture de Sport" />
        </div>
      </main>
    );
  }

  return (
    <main className="pc-screen">
      <div className="pc-screen-inner mx-auto flex w-full max-w-[var(--pc-content-max-width)] flex-col gap-5">
        <SportHeader view={view} onNavigate={setView} />
        {view === "access" ? (
          <SportAccessView onOpen={openSportProgram} />
        ) : null}
        {view === "onboarding" ? (
          <OnboardingView
            draft={draft}
            step={onboardingStep}
            onBack={() => setOnboardingStep((step) => Math.max(0, step - 1))}
            onChange={setDraft}
            onComplete={completeOnboarding}
            onNext={() => setOnboardingStep((step) => Math.min(2, step + 1))}
          />
        ) : null}
        {view === "assessment" && data.profile ? (
          <AssessmentView
            onComplete={completeAssessment}
            onSkip={() => setView("home")}
          />
        ) : null}
        {view === "home" && data.profile ? (
          <HomeView
            data={data}
            duration={selectedDuration}
            durationSelected={dashboardDurationSelected}
            generationError={generationError}
            hasAssessment={hasCompletedSportAssessment(data.capabilities)}
            onDurationChange={selectDashboardDuration}
            onAssessment={() => setView("assessment")}
            onGenerate={generateSession}
            onHistory={() => setView("history")}
          />
        ) : null}
        {view === "preview" && activeSession ? (
          <PreviewView
            session={activeSession}
            onBack={() => setView("home")}
            onStart={startActiveSession}
          />
        ) : null}
        {view === "active" && activeSession && timer && timerView ? (
          <ActiveWorkoutView
            session={activeSession}
            timer={timer}
            timerView={timerView}
            onExtendRecovery={() =>
              setTimer((current) =>
                current ? extendCurrentRecovery(current, 15) : current,
              )
            }
            onFinish={() => finishActiveSession("completed")}
            onPause={() =>
              setTimer((current) => (current ? pauseTimer(current, Date.now()) : current))
            }
            onResume={() =>
              setTimer((current) =>
                current ? resumeTimer(current, Date.now()) : current,
              )
            }
            onSkip={() =>
              setTimer((current) =>
                current ? skipToNextStep(current, Date.now()) : current,
              )
            }
            onStop={() => finishActiveSession("stopped")}
          />
        ) : null}
        {view === "feedback" && activeSession ? (
          <FeedbackView
            bodySignal={feedbackBodySignal}
            comment={feedbackComment}
            completion={feedbackCompletion}
            difficulty={feedbackDifficulty}
            session={activeSession}
            zone={feedbackZone}
            onBodySignalChange={setFeedbackBodySignal}
            onCommentChange={setFeedbackComment}
            onCompletionChange={setFeedbackCompletion}
            onDifficultyChange={setFeedbackDifficulty}
            onSubmit={submitFeedback}
            onZoneChange={setFeedbackZone}
          />
        ) : null}
        {view === "history" ? (
          <HistoryView sessions={data.sessions} onOpen={(session) => {
            setActiveSession(session);
            setView("preview");
          }} />
        ) : null}
        {view === "settings" && data.profile ? (
          <SettingsView
            data={data}
            onReset={() => {
              if (window.confirm("Reinitialiser le profil Sport local ?")) {
                const empty = createEmptySportData();
                persist(empty);
                setDraft(createDefaultSportOnboardingDraft());
                setOnboardingStep(0);
                setView("access");
              }
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function SportHeader({
  view,
  onNavigate,
}: {
  view: SportView;
  onNavigate: (view: SportView) => void;
}) {
  const shouldReturnToDashboard =
    view === "history" || view === "settings" || view === "preview";

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {shouldReturnToDashboard ? (
          <button
            aria-label="Retour au tableau de bord Sport"
            className="pc-focus-ring mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-surface)] text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
            type="button"
            onClick={() => onNavigate("home")}
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        ) : (
          <Link
            aria-label="Retour a l'accueil"
            className="pc-focus-ring mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-surface)] text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </Link>
        )}
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          Sport
        </h1>
      </div>
      {view !== "access" && view !== "onboarding" ? (
        <div className="flex shrink-0 gap-2">
          <Button
            aria-label="Historique Sport"
            className="min-h-12 px-3"
            variant="tertiary"
            onClick={() => onNavigate("history")}
          >
            <History aria-hidden="true" size={18} />
          </Button>
          <Button
            aria-label="Reglages Sport"
            className="min-h-12 px-3"
            variant="tertiary"
            onClick={() => onNavigate("settings")}
          >
            <Settings2 aria-hidden="true" size={18} />
          </Button>
        </div>
      ) : null}
    </header>
  );
}

function SportAccessView({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-4">
      <Surface className="grid gap-5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
            <Dumbbell aria-hidden="true" size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]">
              Acces Sport
            </p>
            <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-8 font-semibold text-[var(--pc-color-text)]">
              Service Sport payant
            </h2>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-muted)] p-4">
            <p className="text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]">
              Tarif prevu
            </p>
            <p className="mt-1 text-4xl font-bold leading-none text-[var(--pc-color-text)]">
              5 euros
            </p>
          </div>
          <p className="text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
            La page de paiement sera ajoutee avant son ouverture definitive.
            Pour cette version de travail, tu peux ouvrir le parcours de
            creation du profil sportif.
          </p>
        </div>

        <Button className="min-h-12" onClick={onOpen}>
          Acceder a mon programme sportif
        </Button>
      </Surface>
    </section>
  );
}

function OnboardingView({
  draft,
  step,
  onBack,
  onChange,
  onComplete,
  onNext,
}: {
  draft: SportOnboardingDraft;
  step: number;
  onBack: () => void;
  onChange: (draft: SportOnboardingDraft) => void;
  onComplete: () => void;
  onNext: () => void;
}) {
  const stepTitles = ["Objectifs", "Activites", "Rythme"];
  const canContinue =
    step === 0
      ? draft.goals.length > 0
      : step === 1
        ? draft.preferredActivities.length > 0
        : draft.usualDurationMinutes !== null &&
          draft.desiredFrequency !== null;

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div>
        <p className="text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-primary)]">
          {step + 1} / {stepTitles.length}
        </p>
        <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
          {stepTitles[step]}
        </h2>
      </div>
      {step === 0 ? (
        <div className="grid gap-3">
          {(Object.keys(goalLabels) as SportGoal[]).map((goal) => (
            <ChoiceCard
              checked={draft.goals.includes(goal)}
              key={goal}
              label={goalLabels[goal]}
              name="sport-goals"
              type="checkbox"
              value={goal}
              onChange={() =>
                onChange({
                  ...draft,
                  goals: toggleValue(draft.goals, goal),
                })
              }
            />
          ))}
        </div>
      ) : null}
      {step === 1 ? (
        <div className="grid gap-3">
          {activityChoices.map((activity) => (
            <ChoiceCard
              checked={draft.preferredActivities.includes(activity)}
              key={activity}
              label={activityLabels[activity]}
              name="sport-activities"
              type="checkbox"
              value={activity}
              onChange={() =>
                onChange({
                  ...draft,
                  preferredActivities: toggleValue(
                    draft.preferredActivities,
                    activity,
                  ),
                })
              }
            />
          ))}
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-4">
          <ChoiceSection title="Duree habituelle">
            <div className="grid grid-cols-2 gap-2">
              {durationChoices.map((duration) => (
                <button
                  className={cx(
                    "pc-focus-ring min-h-12 rounded-[var(--pc-radius-card)] border px-3 text-sm font-semibold",
                    draft.usualDurationMinutes === duration
                      ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                      : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]",
                  )}
                  key={duration}
                  type="button"
                  onClick={() =>
                    onChange({ ...draft, usualDurationMinutes: duration })
                  }
                >
                  {duration === 8 ? "5 a 10 min" : `${duration} min`}
                </button>
              ))}
            </div>
          </ChoiceSection>
          <ChoiceSection title="Frequence souhaitee">
            <div className="grid gap-2">
              {(Object.keys(frequencyLabels) as SportFrequency[]).map(
                (frequency) => (
                  <ChoiceCard
                    checked={draft.desiredFrequency === frequency}
                    key={frequency}
                    label={frequencyLabels[frequency]}
                    name="sport-frequency"
                    value={frequency}
                    onChange={() =>
                      onChange({ ...draft, desiredFrequency: frequency })
                    }
                  />
                ),
              )}
            </div>
          </ChoiceSection>
        </div>
      ) : null}
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-3 pt-2">
        <Button disabled={step === 0} variant="secondary" onClick={onBack}>
          Retour
        </Button>
        <Button
          disabled={!canContinue}
          onClick={step === stepTitles.length - 1 ? onComplete : onNext}
        >
          {step === stepTitles.length - 1 ? "Terminer" : "Continuer"}
        </Button>
      </div>
    </section>
  );
}

function ChoiceSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
        {title}
      </h3>
      {children}
    </div>
  );
}

const assessmentItems: Array<{
  key: keyof SportAssessmentResults;
  title: string;
  instruction: string;
  exerciseId: string;
  variants: string[];
}> = [
  {
    key: "upperPush",
    title: "Poussee douce",
    instruction:
      "Garde le corps solide, respiration libre, et arrete avant de compenser.",
    exerciseId: "push_up_family",
    variants: ["push_wall", "push_knees", "push_standard", "push_feet_elevated"],
  },
  {
    key: "legs",
    title: "Jambes",
    instruction:
      "Descends dans une amplitude confortable, genoux dans l'axe.",
    exerciseId: "bodyweight_squat",
    variants: [
      "bodyweight_squat_partial",
      "bodyweight_squat_controlled",
      "bodyweight_squat_deeper",
    ],
  },
  {
    key: "core",
    title: "Centre du corps",
    instruction:
      "Reste stable, respire, et stoppe si la position se degrade.",
    exerciseId: "plank_family",
    variants: ["plank_wall", "plank_knees", "plank_full"],
  },
  {
    key: "cardio",
    title: "Souffle",
    instruction:
      "Marche active sur place pendant 20 secondes, capable de ralentir a tout moment.",
    exerciseId: "warmup_march",
    variants: ["warmup_march_easy", "warmup_march_active"],
  },
];

type AssessmentPhase = "intro" | "countdown" | "effort" | "question";

const assessmentCountdownSeconds = 3;
const assessmentEffortSeconds = 20;

const assessmentGuideImages: Partial<
  Record<string, { alt: string; src: StaticImageData }>
> = {
  push_wall: {
    alt: "Guide illustre des pompes au mur, avec position de depart, fin du mouvement et consignes.",
    src: pushWallGuide,
  },
  push_knees: {
    alt: "Guide illustre des pompes sur les genoux, avec position de depart, fin du mouvement et consignes.",
    src: pushKneesGuide,
  },
  push_standard: {
    alt: "Guide illustre des pompes classiques, avec position de depart, fin du mouvement et consignes.",
    src: pushStandardGuide,
  },
  push_feet_elevated: {
    alt: "Guide illustre des pompes pieds sureleves, avec position de depart, fin du mouvement et consignes.",
    src: pushFeetElevatedGuide,
  },
  bodyweight_squat_partial: {
    alt: "Guide illustre du demi-squat tres court, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatPartialGuide,
  },
  bodyweight_squat_controlled: {
    alt: "Guide illustre du demi-squat controle, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatControlledGuide,
  },
  bodyweight_squat_deeper: {
    alt: "Guide illustre du squat poids du corps adapte, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatDeeperGuide,
  },
  plank_wall: {
    alt: "Guide illustre du gainage face au mur, avec position et consignes.",
    src: plankWallGuide,
  },
  plank_knees: {
    alt: "Guide illustre du gainage sur les genoux, avec position et consignes.",
    src: plankKneesGuide,
  },
  plank_full: {
    alt: "Guide illustre du gainage classique, avec position et consignes.",
    src: plankFullGuide,
  },
  warmup_march_easy: {
    alt: "Guide illustre de la marche lente sur place, avec position de depart, mouvement et consignes.",
    src: warmupMarchEasyGuide,
  },
  warmup_march_active: {
    alt: "Guide illustre de la marche active sur place, avec position de depart, mouvement et consignes.",
    src: warmupMarchActiveGuide,
  },
};

function normalizeAssessmentLevels(
  results: Partial<Record<keyof SportAssessmentResults, CapabilityLevel>>,
): SportAssessmentLevelResults | null {
  if (
    results.upperPush === undefined ||
    results.legs === undefined ||
    results.core === undefined ||
    results.cardio === undefined
  ) {
    return null;
  }

  return {
    upperPush: results.upperPush,
    legs: results.legs,
    core: results.core,
    cardio: results.cardio,
  };
}

function variantDifficulty(variantId: string): CapabilityLevel {
  return getVariantById(variantId)?.difficulty ?? 0;
}

function AssessmentView({
  onComplete,
  onSkip,
}: {
  onComplete: (results: SportAssessmentLevelResults) => void;
  onSkip: () => void;
}) {
  const [testIndex, setTestIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [phase, setPhase] = useState<AssessmentPhase>("intro");
  const [phaseStartedAtMs, setPhaseStartedAtMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [results, setResults] = useState<
    Partial<Record<keyof SportAssessmentResults, CapabilityLevel>>
  >({});

  const test = assessmentItems[testIndex] ?? assessmentItems[0];
  const variantId = test.variants[variantIndex] ?? test.variants[0];
  const variant = getVariantById(variantId);
  const elapsedSeconds =
    phaseStartedAtMs === null
      ? 0
      : Math.floor((clockMs - phaseStartedAtMs) / 1000);
  const countdownRemaining = Math.max(
    0,
    assessmentCountdownSeconds - elapsedSeconds,
  );
  const effortRemaining = Math.max(0, assessmentEffortSeconds - elapsedSeconds);

  useEffect(() => {
    if (
      phaseStartedAtMs === null ||
      (phase !== "countdown" && phase !== "effort")
    ) {
      return undefined;
    }

    const id = window.setInterval(() => {
      const current = Date.now();
      const elapsed = Math.floor((current - phaseStartedAtMs) / 1000);
      setClockMs(current);

      if (phase === "countdown" && elapsed >= assessmentCountdownSeconds) {
        setPhase("effort");
        setPhaseStartedAtMs(current);
        setClockMs(current);
      }

      if (phase === "effort" && elapsed >= assessmentEffortSeconds) {
        setPhase("question");
        setPhaseStartedAtMs(null);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [phase, phaseStartedAtMs]);

  function resetTimer(nextPhase: AssessmentPhase): void {
    const startedAt = Date.now();
    setPhase(nextPhase);
    setPhaseStartedAtMs(startedAt);
    setClockMs(startedAt);
  }

  function moveToNextTest(
    nextResults: Partial<Record<keyof SportAssessmentResults, CapabilityLevel>>,
  ): void {
    const normalized = normalizeAssessmentLevels(nextResults);
    if (testIndex >= assessmentItems.length - 1 && normalized) {
      onComplete(normalized);
      return;
    }

    setTestIndex((current) =>
      Math.min(assessmentItems.length - 1, current + 1),
    );
    setVariantIndex(0);
    setPhase("intro");
    setPhaseStartedAtMs(null);
  }

  function recordLevel(level: CapabilityLevel): Partial<
    Record<keyof SportAssessmentResults, CapabilityLevel>
  > {
    const nextResults = {
      ...results,
      [test.key]: level,
    };
    setResults(nextResults);
    return nextResults;
  }

  function handleHeld(): void {
    const nextResults = recordLevel(variantDifficulty(variantId));

    if (variantIndex < test.variants.length - 1) {
      setVariantIndex((current) => current + 1);
      setPhase("intro");
      setPhaseStartedAtMs(null);
      return;
    }

    moveToNextTest(nextResults);
  }

  function handleNotHeld(): void {
    const previousVariantId = test.variants[Math.max(0, variantIndex - 1)];
    const fallbackLevel =
      results[test.key] ?? variantDifficulty(previousVariantId ?? variantId);
    const nextResults = recordLevel(fallbackLevel);
    moveToNextTest(nextResults);
  }

  return (
    <section className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center">
      <Surface className="max-h-[calc(100vh-2rem)] w-full overflow-y-auto p-4 sm:max-w-3xl">
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
                Evaluation guidee
              </p>
              <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
                Test {testIndex + 1} / {assessmentItems.length}
              </h2>
            </div>
            <Button className="min-h-10 px-3" variant="tertiary" onClick={onSkip}>
              Plus tard
            </Button>
          </div>
          <AssessmentStepper currentIndex={testIndex} />
          <div>
            <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
              {variant?.name ?? test.title}
            </h3>
          </div>
          <AssessmentPoseStrip
            exerciseId={test.exerciseId}
            title={variant?.name ?? test.title}
            variantId={variantId}
          />
          {phase === "intro" ? (
            <div className="grid gap-3">
              <Button fullWidth onClick={() => resetTimer("countdown")}>
                Je suis pret
              </Button>
            </div>
          ) : null}
          {phase === "countdown" ? (
            <TimerPanel
              label="Prepare-toi"
              value={Math.max(1, countdownRemaining)}
            />
          ) : null}
          {phase === "effort" ? (
            <div className="grid gap-3">
              <TimerPanel label="Effort" value={effortRemaining} />
              <Button
                className="border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-hover)] text-[var(--pc-color-on-primary)] hover:bg-[var(--pc-color-primary)]"
                fullWidth
                onClick={handleNotHeld}
              >
                {"J'arrete ce test"}
              </Button>
            </div>
          ) : null}
          {phase === "question" ? (
            <div className="grid gap-3">
              <Surface className="p-4" variant="selected">
                <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
                  Tu as tenu les 20 secondes ?
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--pc-color-text-muted)]">
                  Oui fait tester la variante suivante quand elle existe. Non
                  passe au mouvement suivant.
                </p>
              </Surface>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={handleNotHeld}>
                  Non
                </Button>
                <Button onClick={handleHeld}>Oui</Button>
              </div>
            </div>
          ) : null}
        </div>
      </Surface>
    </section>
  );
}

function AssessmentStepper({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="grid grid-cols-4 gap-2" aria-label="Progression evaluation">
      {assessmentItems.map((item, index) => (
        <div
          className={cx(
            "h-2 rounded-full",
            index <= currentIndex
              ? "bg-[var(--pc-color-primary)]"
              : "bg-[var(--pc-color-border)]",
          )}
          key={item.key}
        />
      ))}
    </div>
  );
}

function AssessmentPoseStrip({
  exerciseId,
  title,
  variantId,
}: {
  exerciseId: string;
  title: string;
  variantId: string;
}) {
  const guide = assessmentGuideImages[variantId];

  if (guide) {
    return (
      <figure className="grid gap-2">
        <div className="overflow-hidden rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]">
          <Image
            alt={guide.alt}
            className="h-auto w-full"
            placeholder="blur"
            priority={variantId === "push_wall"}
            sizes="(min-width: 640px) 46rem, calc(100vw - 2rem)"
            src={guide.src}
          />
        </div>
      </figure>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-2">
        <ExerciseIllustration
          exerciseId={exerciseId}
          label={`${title} depart`}
          variantId={variantId}
        />
        <p className="text-center text-xs font-semibold uppercase text-[var(--pc-color-text-muted)]">
          Depart
        </p>
      </div>
      <div className="grid gap-2">
        <ExerciseIllustration
          exerciseId={exerciseId}
          label={`${title} fin`}
          variantId={variantId}
        />
        <p className="text-center text-xs font-semibold uppercase text-[var(--pc-color-text-muted)]">
          Fin
        </p>
      </div>
    </div>
  );
}

function TimerPanel({ label, value }: { label: string; value: number }) {
  return (
    <Surface className="grid min-h-48 place-items-center p-5 text-center" variant="selected">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--pc-color-primary)]">
          {label}
        </p>
        <p className="mt-3 text-[4rem] leading-none font-bold tabular-nums text-[var(--pc-color-text)]">
          {value}
        </p>
      </div>
    </Surface>
  );
}

function HomeView({
  data,
  duration,
  durationSelected,
  generationError,
  hasAssessment,
  onAssessment,
  onDurationChange,
  onGenerate,
  onHistory,
}: {
  data: SportLocalData;
  duration: number;
  durationSelected: boolean;
  generationError: string | null;
  hasAssessment: boolean;
  onAssessment: () => void;
  onDurationChange: (duration: number) => void;
  onGenerate: () => void;
  onHistory: () => void;
}) {
  const profile = data.profile;
  if (!profile) {
    return null;
  }

  const completedSessions = data.sessions.filter(isDoneSession);
  const recentCompletedSessions = completedSessions.slice(0, 3);
  const hasDoneToday = completedSessions.some((session) =>
    isSameLocalDay(session.scheduledAt, new Date()),
  );

  return (
    <section className="grid gap-4">
      <Surface className="grid gap-4 p-4" variant="selected">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]">
            <Dumbbell aria-hidden="true" size={23} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
              Tableau de bord
            </p>
          </div>
        </div>
        <SportActivityChooser />
      </Surface>
      {!hasAssessment ? (
        <Surface className="grid gap-3 p-4">
          <div>
            <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
              Premiere seance
            </h3>
          </div>
          <Button fullWidth onClick={onAssessment}>
            Commencer
          </Button>
        </Surface>
      ) : null}
      <Surface className="grid gap-3 p-4">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Duree de ma seance
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {dashboardDurationChoices.map((choice) => (
            <button
              className={cx(
                "pc-focus-ring min-h-11 rounded-[var(--pc-radius-control)] border px-1 text-sm font-semibold",
                duration === choice
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]",
              )}
              key={choice}
              type="button"
              onClick={() => onDurationChange(choice)}
            >
              {choice === 60 ? "1h" : choice}
            </button>
          ))}
        </div>
        {hasAssessment && durationSelected ? (
          <Button fullWidth onClick={onGenerate}>
            Commencer la seance
          </Button>
        ) : null}
        {generationError ? (
          <p className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-warning-soft)] p-3 text-sm text-[var(--pc-color-warning)]">
            {generationError}
          </p>
        ) : null}
      </Surface>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DashboardMetric label="Seances faites" value={completedSessions.length} />
        <DashboardMetric label="Aujourd'hui" value={hasDoneToday ? "Fait" : "Pas fait"} />
        <DashboardMetric label="Distance parcourue" value="A venir" />
      </div>
      <StrengthProgressOverview
        data={data}
        hasAssessment={hasAssessment}
        onAssessment={onAssessment}
      />
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
            Seances deja faites
          </h3>
          <Button className="min-h-10 px-3" variant="tertiary" onClick={onHistory}>
            Historique
          </Button>
        </div>
        {recentCompletedSessions.length > 0 ? (
          recentCompletedSessions.map((session) => (
            <button
              className="pc-focus-ring text-left"
              key={session.id}
              type="button"
              onClick={onHistory}
            >
              <Surface className="p-4" variant="interactive">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatMinutes(
                        session.performedDurationSeconds ??
                          session.plannedDurationSeconds,
                      )}
                    </p>
                    <p className="text-sm text-[var(--pc-color-text-muted)]">
                      {formatSessionDate(session.scheduledAt)}
                    </p>
                  </div>
                  <span className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-2 py-1 text-sm font-semibold text-[var(--pc-color-primary)]">
                    {session.status === "completed" ? "Terminee" : "Partielle"}
                  </span>
                </div>
              </Surface>
            </button>
          ))
        ) : (
          <Surface className="p-4" variant="subtle">
            <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
              Aucune seance terminee pour le moment.
            </p>
          </Surface>
        )}
      </section>
    </section>
  );
}

const progressDimensions: Array<{
  dimension: CapabilityDimension;
  label: string;
}> = [
  { dimension: "upper_push", label: "Poussee" },
  { dimension: "legs", label: "Jambes" },
  { dimension: "core", label: "Centre" },
  { dimension: "cardio_endurance", label: "Souffle" },
];

function StrengthProgressOverview({
  data,
  hasAssessment,
  onAssessment,
}: {
  data: SportLocalData;
  hasAssessment: boolean;
  onAssessment: () => void;
}) {
  const knownLevels = progressDimensions
    .map((item) => capabilityLevelFor(data, item.dimension))
    .filter((level): level is CapabilityLevel => level !== null);
  const average =
    hasAssessment && knownLevels.length > 0
      ? Math.round(
          (knownLevels.reduce<number>((total, level) => total + level, 0) /
            (knownLevels.length * 4)) *
            100,
        )
      : 0;

  return (
    <Surface className="grid gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
            Progression generale
          </h3>
          <p className="mt-1 text-sm leading-5 text-[var(--pc-color-text-muted)]">
            {"Vue d'ensemble des axes calibres par l'evaluation."}
          </p>
        </div>
        <span className="min-w-[5.5rem] whitespace-nowrap rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-3 py-2 text-center text-xs font-semibold text-[var(--pc-color-primary)]">
          {hasAssessment ? `${average}%` : "A evaluer"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--pc-color-surface-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--pc-color-primary)] transition-[width] duration-[var(--pc-motion-normal)]"
          style={{ width: `${average}%` }}
        />
      </div>
      <div className="grid gap-3">
        {progressDimensions.map((item) => {
          const level = capabilityLevelFor(data, item.dimension);
          return (
            <div className="grid gap-2" key={item.dimension}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="whitespace-nowrap text-xs font-semibold uppercase text-[var(--pc-color-text-muted)]">
                  {hasAssessment && level !== null
                    ? `Niveau ${level + 1}/5`
                    : "A evaluer"}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    className={cx(
                      "h-2 rounded-full",
                      hasAssessment && level !== null && index <= level
                        ? "bg-[var(--pc-color-primary)]"
                        : "bg-[var(--pc-color-border)]",
                    )}
                    key={index}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!hasAssessment ? (
        <Button fullWidth variant="secondary" onClick={onAssessment}>
          {"Lancer l'evaluation guidee"}
        </Button>
      ) : null}
    </Surface>
  );
}

function SportActivityChooser() {
  const [open, setOpen] = useState(false);
  const futureActivities: SportActivity[] = ["walk_run", "swim"];

  return (
    <div className="grid gap-2">
      <button
        aria-expanded={open}
        aria-label="Choisir un sport"
        className="pc-focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-surface)] px-3 py-2 text-left"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate font-semibold">
          Renforcement musculaire
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cx(
            "shrink-0 transition-transform duration-[var(--pc-motion-fast)]",
            open && "rotate-180",
          )}
          size={18}
        />
      </button>
      {open ? (
        <div className="grid gap-2">
          {futureActivities.map((activity) => (
            <button
              className="flex min-h-12 w-full cursor-not-allowed items-center justify-between gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] px-3 py-2 text-left opacity-80"
              disabled
              key={activity}
              type="button"
            >
              <span className="font-semibold">{activityLabels[activity]}</span>
              <span className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface)] px-2 py-1 text-xs font-semibold text-[var(--pc-color-text-muted)]">
                En developpement
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Surface className="p-4">
      <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </Surface>
  );
}

function PreviewView({
  session,
  onBack,
  onStart,
}: {
  session: GeneratedWorkoutSession;
  onBack: () => void;
  onStart: () => void;
}) {
  const effortSteps = session.steps.filter((step) => step.type === "effort");
  return (
    <section className="grid gap-4">
      <Surface className="p-4" variant="selected">
        <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
          Aperçu
        </p>
        <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
          {formatMinutes(session.plannedDurationSeconds)} de renforcement
        </h2>
        <p className="mt-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {session.generalReason}
        </p>
      </Surface>
      <Surface className="grid gap-3 p-4">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Mouvements
        </h3>
        {effortSteps.map((step) => {
          const exercise = step.exerciseId ? getExerciseById(step.exerciseId) : null;
          const variant = step.variantId ? getVariantById(step.variantId) : null;
          return (
            <div
              className="grid gap-2 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] p-3"
              key={step.id}
            >
              <div className="flex gap-3">
                <ExerciseIllustration
                  className="w-16 shrink-0"
                  exerciseId={step.exerciseId}
                  label={variant?.name ?? step.title}
                  variantId={step.variantId}
                />
                <div className="min-w-0">
                  <p className="font-semibold">{variant?.name ?? step.title}</p>
                  <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
                    {exercise?.primaryCue ?? step.instruction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </Surface>
      <Surface className="grid gap-2 p-4" variant="subtle">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Raisons du moteur
        </h3>
        {session.reasons.slice(-5).map((reason) => (
          <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]" key={`${reason.code}-${reason.message}`}>
            <span className="font-semibold text-[var(--pc-color-text)]">
              {reason.code}
            </span>{" "}
            {reason.message}
          </p>
        ))}
      </Surface>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button variant="secondary" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={onStart}>Commencer</Button>
      </div>
    </section>
  );
}

function ActiveWorkoutView({
  timer,
  timerView,
  onExtendRecovery,
  onFinish,
  onPause,
  onResume,
  onSkip,
  onStop,
}: {
  session: GeneratedWorkoutSession;
  timer: WorkoutTimerState;
  timerView: ReturnType<typeof getTimerView>;
  onExtendRecovery: () => void;
  onFinish: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onStop: () => void;
}) {
  const current = timerView.currentStep;
  const next = timerView.nextStep;
  const isPaused = timer.status === "paused";

  return (
    <section className="grid flex-1 gap-4">
      <Surface className="grid min-h-[23rem] content-center gap-5 p-5 text-center" variant="selected">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]">
          <Timer aria-hidden="true" size={34} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--pc-color-primary)]">
            {timerView.status}
          </p>
          <h2 className="mt-1 text-[2.75rem] leading-none font-bold tabular-nums">
            {formatDuration(timerView.activeStepRemainingSeconds)}
          </h2>
          <p className="mt-3 text-xl font-semibold">
            {current?.title ?? "Seance terminee"}
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
            {current?.instruction ?? "Tu peux renseigner ton retour."}
          </p>
        </div>
        {next ? (
          <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface)] p-3 text-left">
            <p className="text-xs font-semibold uppercase text-[var(--pc-color-text-muted)]">
              Suite
            </p>
            <p className="font-semibold">{next.title}</p>
          </div>
        ) : null}
      </Surface>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={isPaused ? onResume : onPause}>
          {isPaused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
          {isPaused ? "Reprise" : "Pause"}
        </Button>
        <Button variant="secondary" onClick={onSkip}>
          <SkipForward aria-hidden="true" size={18} />
          Passer
        </Button>
        <Button variant="secondary" onClick={onFinish}>
          <CheckCircle2 aria-hidden="true" size={18} />
          Fin
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={current?.type !== "recovery"}
          variant="tertiary"
          onClick={onExtendRecovery}
        >
          +15 s recup
        </Button>
        <Button variant="danger" onClick={onStop}>
          <Square aria-hidden="true" size={16} />
          Arreter
        </Button>
      </div>
    </section>
  );
}

function FeedbackView({
  bodySignal,
  comment,
  completion,
  difficulty,
  zone,
  onBodySignalChange,
  onCommentChange,
  onCompletionChange,
  onDifficultyChange,
  onSubmit,
  onZoneChange,
}: {
  bodySignal: FeedbackBodySignal;
  comment: string;
  completion: FeedbackCompletion;
  difficulty: FeedbackDifficulty;
  session: GeneratedWorkoutSession;
  zone: BodyZone | "";
  onBodySignalChange: (value: FeedbackBodySignal) => void;
  onCommentChange: (value: string) => void;
  onCompletionChange: (value: FeedbackCompletion) => void;
  onDifficultyChange: (value: FeedbackDifficulty) => void;
  onSubmit: () => void;
  onZoneChange: (value: BodyZone | "") => void;
}) {
  return (
    <section className="grid gap-4">
      <Surface className="p-4" variant="selected">
        <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
          Retour de seance
        </h2>
        <p className="mt-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
          Ces informations serviront a adapter la prochaine seance, sans jugement.
        </p>
      </Surface>
      <FeedbackChoices
        name="difficulty"
        title="Difficulte generale"
        value={difficulty}
        choices={[
          ["too_easy", "Trop facile"],
          ["right", "Adaptee"],
          ["too_hard", "Trop difficile"],
        ]}
        onChange={onDifficultyChange}
      />
      <FeedbackChoices
        name="completion"
        title="Realisation"
        value={completion}
        choices={[
          ["completed", "Seance terminee"],
          ["partial", "Realisee en partie"],
          ["stopped", "Arretee"],
        ]}
        onChange={onCompletionChange}
      />
      <FeedbackChoices
        name="body-signal"
        title="Ressenti physique"
        value={bodySignal}
        choices={[
          ["none", "Aucune douleur particuliere"],
          ["mild_discomfort", "Gene legere"],
          ["unusual_pain", "Douleur anormale"],
        ]}
        onChange={onBodySignalChange}
      />
      {bodySignal !== "none" ? (
        <Surface className="grid gap-3 p-4">
          <h3 className="font-semibold">Zone concernee</h3>
          <div className="grid grid-cols-2 gap-2">
            {zoneChoices.map((choice) => (
              <button
                className={cx(
                  "pc-focus-ring min-h-11 rounded-[var(--pc-radius-control)] border px-3 text-sm font-semibold",
                  zone === choice
                    ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                    : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]",
                )}
                key={choice}
                type="button"
                onClick={() => onZoneChange(choice)}
              >
                {zoneLabels[choice]}
              </button>
            ))}
          </div>
          <p className="text-sm leading-5 text-[var(--pc-color-warning)]">
            {"En cas de douleur inhabituelle, arrete l'activite et demande un avis professionnel adapte."}
          </p>
        </Surface>
      ) : null}
      <TextInput
        placeholder="Commentaire facultatif"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <Button fullWidth onClick={onSubmit}>
        Enregistrer le retour
      </Button>
    </section>
  );
}

function FeedbackChoices<T extends string>({
  choices,
  name,
  title,
  value,
  onChange,
}: {
  choices: Array<[T, string]>;
  name: string;
  title: string;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Surface className="grid gap-3 p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid gap-2">
        {choices.map(([choice, label]) => (
          <ChoiceCard
            checked={value === choice}
            key={choice}
            label={label}
            name={name}
            value={choice}
            onChange={() => onChange(choice)}
          />
        ))}
      </div>
    </Surface>
  );
}

function HistoryView({
  sessions,
  onOpen,
}: {
  sessions: GeneratedWorkoutSession[];
  onOpen: (session: GeneratedWorkoutSession) => void;
}) {
  return (
    <section className="grid gap-4">
      <h2 className="text-[length:var(--pc-font-size-section-title)] font-semibold">
        Historique Sport
      </h2>
      {sessions.length === 0 ? (
        <Surface className="p-4" variant="subtle">
          <p className="text-sm text-[var(--pc-color-text-muted)]">
            Aucune seance enregistree pour le moment.
          </p>
        </Surface>
      ) : (
        sessions.map((session) => (
          <button
            className="pc-focus-ring text-left"
            key={session.id}
            type="button"
            onClick={() => onOpen(session)}
          >
            <Surface className="p-4" variant="interactive">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {formatMinutes(session.plannedDurationSeconds)}
                  </p>
                  <p className="text-sm text-[var(--pc-color-text-muted)]">
                    {new Date(session.scheduledAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-2 py-1 text-sm font-semibold text-[var(--pc-color-primary)]">
                  {session.status}
                </span>
              </div>
            </Surface>
          </button>
        ))
      )}
    </section>
  );
}

function SettingsView({
  data,
  onReset,
}: {
  data: SportLocalData;
  onReset: () => void;
}) {
  const profile = data.profile;
  if (!profile) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <Surface className="grid gap-3 p-4">
        <h2 className="text-[length:var(--pc-font-size-section-title)] font-semibold">
          Profil sportif
        </h2>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          Objectifs : {profile.goals.map((goal) => goalLabels[goal]).join(", ")}
        </p>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          Duree habituelle : {profile.usualDurationMinutes} min
        </p>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          Frequence : {frequencyLabels[profile.desiredFrequency]}
        </p>
      </Surface>
      <Button variant="danger" onClick={onReset}>
        <RotateCcw aria-hidden="true" size={18} />
        Reinitialiser Sport
      </Button>
      <p className="text-xs leading-5 text-[var(--pc-color-text-subtle)]">
        Stockage temporaire isole pour la route /sport : {SPORT_LOCAL_USER_ID}.
      </p>
    </section>
  );
}
