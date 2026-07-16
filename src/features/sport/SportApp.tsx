"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
  AssessmentFeeling,
  BodyZone,
  FeedbackBodySignal,
  FeedbackCompletion,
  FeedbackDifficulty,
  GeneratedWorkoutSession,
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
  applyAssessmentResults,
  hasCompletedSportAssessment,
} from "@/services/sport/sportAssessmentService";

type SportView =
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

export function SportApp() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<SportLocalData>(() => createEmptySportData());
  const [view, setView] = useState<SportView>("home");
  const [draft, setDraft] = useState<SportOnboardingDraft>(() =>
    createDefaultSportOnboardingDraft(),
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(15);
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
  const [assessmentResults, setAssessmentResults] = useState<
    Partial<Record<keyof SportAssessmentResults, AssessmentFeeling>>
  >({});

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = loadSportLocalData();
      setData(stored);
      setSelectedDuration(stored.profile?.usualDurationMinutes ?? 15);
      setView(
        stored.profile?.questionnaireCompleted
          ? hasCompletedSportAssessment(stored.capabilities)
            ? "home"
            : "assessment"
          : "onboarding",
      );
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

  const latestSession = data.sessions[0] ?? null;
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
    setAssessmentResults({});
    setView("assessment");
  }

  function completeAssessment(): void {
    const profile = data.profile;
    const results = normalizeAssessmentResults(assessmentResults);
    if (!profile || !results) {
      return;
    }

    persist({
      ...data,
      capabilities: applyAssessmentResults(
        data.capabilities,
        profile.userId,
        results,
        nowIso(),
      ),
    });
    setView("home");
  }

  function generateSession(): void {
    const profile = data.profile;
    if (!profile) {
      setView("onboarding");
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
            results={assessmentResults}
            onChange={setAssessmentResults}
            onComplete={completeAssessment}
            onSkip={() => setView("home")}
          />
        ) : null}
        {view === "home" && data.profile ? (
          <HomeView
            data={data}
            duration={selectedDuration}
            generationError={generationError}
            hasAssessment={hasCompletedSportAssessment(data.capabilities)}
            latestSession={latestSession}
            onDurationChange={setSelectedDuration}
            onAssessment={() => setView("assessment")}
            onGenerate={generateSession}
            onHistory={() => setView("history")}
            onSettings={() => setView("settings")}
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
                setView("onboarding");
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
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Link
          className="pc-focus-ring mb-2 inline-flex items-center gap-2 rounded-[var(--pc-radius-control)] text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-primary)]"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Accueil
        </Link>
        <p className="text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]">
          Onglet isole
        </p>
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          Sport
        </h1>
      </div>
      {view !== "onboarding" ? (
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

const assessmentLabels: Record<AssessmentFeeling, string> = {
  too_easy: "Trop facile",
  right: "Adapte",
  too_hard: "Trop difficile",
  discomfort: "Gene ou douleur",
};

const assessmentItems: Array<{
  key: keyof SportAssessmentResults;
  title: string;
  instruction: string;
}> = [
  {
    key: "upperPush",
    title: "Poussee douce",
    instruction:
      "Pompes contre un mur pendant 20 secondes, sans chercher l'echec.",
  },
  {
    key: "legs",
    title: "Jambes",
    instruction:
      "Demi-squats courts pendant 20 secondes, amplitude confortable.",
  },
  {
    key: "core",
    title: "Centre du corps",
    instruction:
      "Gainage debout contre un mur pendant 20 secondes, respiration libre.",
  },
  {
    key: "cardio",
    title: "Souffle",
    instruction:
      "Marche active sur place pendant 45 secondes, capable de ralentir a tout moment.",
  },
];

function normalizeAssessmentResults(
  results: Partial<Record<keyof SportAssessmentResults, AssessmentFeeling>>,
): SportAssessmentResults | null {
  if (
    !results.upperPush ||
    !results.legs ||
    !results.core ||
    !results.cardio
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

function AssessmentView({
  results,
  onChange,
  onComplete,
  onSkip,
}: {
  results: Partial<Record<keyof SportAssessmentResults, AssessmentFeeling>>;
  onChange: (
    results: Partial<Record<keyof SportAssessmentResults, AssessmentFeeling>>,
  ) => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const complete = normalizeAssessmentResults(results) !== null;

  return (
    <section className="grid gap-4">
      <Surface className="p-4" variant="selected">
        <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
          Evaluation proposee
        </p>
        <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
          Caler la premiere seance
        </h2>
        <p className="mt-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
          Quelques mouvements courts permettent de proposer une seance prudente,
          sans test maximal.
        </p>
      </Surface>
      {assessmentItems.map((item) => (
        <Surface className="grid gap-3 p-4" key={item.key}>
          <div>
            <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
              {item.title}
            </h3>
            <p className="mt-1 text-sm leading-5 text-[var(--pc-color-text-muted)]">
              {item.instruction}
            </p>
          </div>
          <div className="grid gap-2">
            {(Object.keys(assessmentLabels) as AssessmentFeeling[]).map(
              (feeling) => (
                <ChoiceCard
                  checked={results[item.key] === feeling}
                  key={`${item.key}-${feeling}`}
                  label={assessmentLabels[feeling]}
                  name={`assessment-${item.key}`}
                  value={feeling}
                  onChange={() =>
                    onChange({
                      ...results,
                      [item.key]: feeling,
                    })
                  }
                />
              ),
            )}
          </div>
        </Surface>
      ))}
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button variant="tertiary" onClick={onSkip}>
          Plus tard
        </Button>
        <Button disabled={!complete} onClick={onComplete}>
          {"Enregistrer l'evaluation"}
        </Button>
      </div>
    </section>
  );
}

function HomeView({
  data,
  duration,
  generationError,
  hasAssessment,
  latestSession,
  onAssessment,
  onDurationChange,
  onGenerate,
  onHistory,
  onSettings,
}: {
  data: SportLocalData;
  duration: number;
  generationError: string | null;
  hasAssessment: boolean;
  latestSession: GeneratedWorkoutSession | null;
  onAssessment: () => void;
  onDurationChange: (duration: number) => void;
  onGenerate: () => void;
  onHistory: () => void;
  onSettings: () => void;
}) {
  const profile = data.profile;
  if (!profile) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <Surface className="p-4" variant="selected">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]">
            <Dumbbell aria-hidden="true" size={23} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
              Seance de renforcement musculaire
            </h2>
            <p className="mt-1 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
              {"Proposee selon le temps disponible, l'evaluation et les retours de seance."}
            </p>
          </div>
        </div>
      </Surface>
      {!hasAssessment ? (
        <Surface className="grid gap-3 p-4">
          <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
            Evaluation conseillee
          </h3>
          <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
            Elle prend quelques minutes et aide a choisir des variantes
            realistes des le depart.
          </p>
          <Button variant="secondary" onClick={onAssessment}>
            {"Faire l'evaluation"}
          </Button>
        </Surface>
      ) : null}
      <Surface className="grid gap-3 p-4">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          {"Duree aujourd'hui"}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {durationChoices.map((choice) => (
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
              {choice === 8 ? "8" : choice}
            </button>
          ))}
        </div>
        <Button fullWidth onClick={onGenerate}>
          {"Generer l'aperçu"}
        </Button>
        {generationError ? (
          <p className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-warning-soft)] p-3 text-sm text-[var(--pc-color-warning)]">
            {generationError}
          </p>
        ) : null}
      </Surface>
      <div className="grid grid-cols-2 gap-3">
        <Surface className="p-4">
          <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
            Derniere seance
          </p>
          <p className="mt-2 text-lg font-semibold">
            {latestSession ? formatMinutes(latestSession.plannedDurationSeconds) : "Aucune"}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
            Retours
          </p>
          <p className="mt-2 text-lg font-semibold">{data.feedback.length}</p>
        </Surface>
      </div>
      <Surface className="grid gap-3 p-4" variant="subtle">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Activites prevues
        </h3>
        <div className="flex flex-wrap gap-2">
          {profile.preferredActivities.map((activity) => (
            <span
              className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface)] px-3 py-2 text-sm font-semibold"
              key={activity}
            >
              {activityLabels[activity]}
            </span>
          ))}
        </div>
      </Surface>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onHistory}>
          Historique
        </Button>
        <Button variant="tertiary" onClick={onSettings}>
          Profil sportif
        </Button>
      </div>
    </section>
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
                <div className="flex aspect-square w-16 shrink-0 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface-subtle)] text-center text-xs font-semibold text-[var(--pc-color-text-muted)]">
                  Media
                </div>
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
