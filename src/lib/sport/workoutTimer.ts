import type {
  TimerStatus,
  TimerStep,
  WorkoutStep,
  WorkoutTimerState,
  WorkoutTimerView,
} from "@/lib/sport/types";

function stepStatus(step: TimerStep | null): TimerStatus {
  if (!step) {
    return "finished";
  }

  if (
    step.type === "preparation" ||
    step.type === "warmup" ||
    step.type === "effort" ||
    step.type === "recovery" ||
    step.type === "transition" ||
    step.type === "cooldown"
  ) {
    return step.type;
  }

  return "effort";
}

function durationMs(step: TimerStep): number {
  return Math.max(0, step.durationSeconds) * 1000;
}

function remainingFutureMs(state: WorkoutTimerState): number {
  return state.steps
    .slice(state.currentStepIndex + 1)
    .reduce((total, step) => total + durationMs(step), 0);
}

function elapsedInCurrentStepMs(
  state: WorkoutTimerState,
  nowMs: number,
): number {
  if (state.status === "paused") {
    return state.pausedElapsedInStepMs;
  }

  if (state.currentStepStartedAtMs === null) {
    return 0;
  }

  return Math.max(0, nowMs - state.currentStepStartedAtMs);
}

function isRunningStatus(status: TimerStatus): boolean {
  return (
    status === "preparation" ||
    status === "warmup" ||
    status === "effort" ||
    status === "recovery" ||
    status === "transition" ||
    status === "cooldown"
  );
}

export function stepsToTimerSteps(steps: WorkoutStep[]): TimerStep[] {
  return steps
    .filter((step) => typeof step.durationSeconds === "number")
    .map((step) => ({
      id: step.id,
      type: step.type,
      title: step.title,
      instruction: step.instruction,
      durationSeconds: step.durationSeconds ?? 0,
    }));
}

export function createWorkoutTimer(
  workoutId: string,
  steps: TimerStep[],
): WorkoutTimerState {
  return {
    workoutId,
    steps: steps.filter((step) => step.durationSeconds > 0),
    status: "idle",
    currentStepIndex: 0,
    startedAtMs: null,
    currentStepStartedAtMs: null,
    elapsedBeforeCurrentStepMs: 0,
    pausedAtMs: null,
    pausedElapsedInStepMs: 0,
    totalPausedMs: 0,
    finishedAtMs: null,
    canceledAtMs: null,
  };
}

export function startTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  if (state.steps.length === 0) {
    return {
      ...state,
      status: "finished",
      startedAtMs: nowMs,
      finishedAtMs: nowMs,
    };
  }

  return {
    ...state,
    status: stepStatus(state.steps[0] ?? null),
    currentStepIndex: 0,
    startedAtMs: nowMs,
    currentStepStartedAtMs: nowMs,
    elapsedBeforeCurrentStepMs: 0,
    pausedAtMs: null,
    pausedElapsedInStepMs: 0,
    finishedAtMs: null,
    canceledAtMs: null,
  };
}

export function syncTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  if (!isRunningStatus(state.status)) {
    return state;
  }

  let currentStepIndex = state.currentStepIndex;
  let currentStepStartedAtMs = state.currentStepStartedAtMs ?? nowMs;
  let elapsedBeforeCurrentStepMs = state.elapsedBeforeCurrentStepMs;
  let currentStep = state.steps[currentStepIndex] ?? null;

  while (currentStep) {
    const elapsedMs = nowMs - currentStepStartedAtMs;
    const currentDurationMs = durationMs(currentStep);

    if (elapsedMs < currentDurationMs) {
      return {
        ...state,
        status: stepStatus(currentStep),
        currentStepIndex,
        currentStepStartedAtMs,
        elapsedBeforeCurrentStepMs,
      };
    }

    elapsedBeforeCurrentStepMs += currentDurationMs;
    currentStepStartedAtMs += currentDurationMs;
    currentStepIndex += 1;
    currentStep = state.steps[currentStepIndex] ?? null;
  }

  return {
    ...state,
    status: "finished",
    currentStepIndex: state.steps.length,
    currentStepStartedAtMs: null,
    elapsedBeforeCurrentStepMs,
    finishedAtMs: nowMs,
  };
}

export function pauseTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  const synced = syncTimer(state, nowMs);
  if (!isRunningStatus(synced.status)) {
    return synced;
  }

  return {
    ...synced,
    status: "paused",
    pausedAtMs: nowMs,
    pausedElapsedInStepMs: elapsedInCurrentStepMs(synced, nowMs),
  };
}

export function resumeTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  if (state.status !== "paused") {
    return state;
  }

  const currentStep = state.steps[state.currentStepIndex] ?? null;
  if (!currentStep) {
    return {
      ...state,
      status: "finished",
      pausedAtMs: null,
      finishedAtMs: nowMs,
    };
  }

  const pausedDurationMs =
    state.pausedAtMs === null ? 0 : Math.max(0, nowMs - state.pausedAtMs);

  return {
    ...state,
    status: stepStatus(currentStep),
    currentStepStartedAtMs: nowMs - state.pausedElapsedInStepMs,
    pausedAtMs: null,
    totalPausedMs: state.totalPausedMs + pausedDurationMs,
  };
}

export function skipToNextStep(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  const synced = syncTimer(state, nowMs);
  if (!isRunningStatus(synced.status) && synced.status !== "paused") {
    return synced;
  }

  const elapsedMs = elapsedInCurrentStepMs(synced, nowMs);
  const nextIndex = synced.currentStepIndex + 1;
  const nextStep = synced.steps[nextIndex] ?? null;

  if (!nextStep) {
    return {
      ...synced,
      status: "finished",
      currentStepIndex: synced.steps.length,
      currentStepStartedAtMs: null,
      elapsedBeforeCurrentStepMs:
        synced.elapsedBeforeCurrentStepMs + elapsedMs,
      pausedAtMs: null,
      finishedAtMs: nowMs,
    };
  }

  return {
    ...synced,
    status: stepStatus(nextStep),
    currentStepIndex: nextIndex,
    currentStepStartedAtMs: nowMs,
    elapsedBeforeCurrentStepMs:
      synced.elapsedBeforeCurrentStepMs + elapsedMs,
    pausedAtMs: null,
    pausedElapsedInStepMs: 0,
  };
}

export function goToPreviousStep(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  const synced = syncTimer(state, nowMs);
  if (synced.currentStepIndex <= 0) {
    return synced;
  }

  const previousIndex = synced.currentStepIndex - 1;
  const previousStep = synced.steps[previousIndex] ?? null;
  if (!previousStep) {
    return synced;
  }

  return {
    ...synced,
    status: stepStatus(previousStep),
    currentStepIndex: previousIndex,
    currentStepStartedAtMs: nowMs,
    elapsedBeforeCurrentStepMs: Math.max(
      0,
      synced.elapsedBeforeCurrentStepMs - durationMs(previousStep),
    ),
    pausedAtMs: null,
    pausedElapsedInStepMs: 0,
  };
}

export function extendCurrentRecovery(
  state: WorkoutTimerState,
  extraSeconds: number,
): WorkoutTimerState {
  const currentStep = state.steps[state.currentStepIndex] ?? null;
  if (!currentStep || currentStep.type !== "recovery") {
    return state;
  }

  const steps = state.steps.map((step, index) =>
    index === state.currentStepIndex
      ? { ...step, durationSeconds: step.durationSeconds + extraSeconds }
      : step,
  );

  return { ...state, steps };
}

export function finishTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  const synced = syncTimer(state, nowMs);
  return {
    ...synced,
    status: "finished",
    currentStepIndex: synced.steps.length,
    currentStepStartedAtMs: null,
    pausedAtMs: null,
    finishedAtMs: nowMs,
  };
}

export function cancelTimer(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerState {
  const synced = syncTimer(state, nowMs);
  return {
    ...synced,
    status: "canceled",
    currentStepStartedAtMs: null,
    pausedAtMs: null,
    canceledAtMs: nowMs,
  };
}

export function getTimerView(
  state: WorkoutTimerState,
  nowMs: number,
): WorkoutTimerView {
  const synced = syncTimer(state, nowMs);
  const currentStep = synced.steps[synced.currentStepIndex] ?? null;
  const elapsedMs = elapsedInCurrentStepMs(synced, nowMs);
  const currentDurationMs = currentStep ? durationMs(currentStep) : 0;
  const activeStepRemainingMs = Math.max(0, currentDurationMs - elapsedMs);

  return {
    status: synced.status,
    currentStep,
    currentStepIndex: Math.min(
      synced.currentStepIndex,
      synced.steps.length,
    ),
    totalSteps: synced.steps.length,
    activeStepElapsedSeconds: Math.floor(elapsedMs / 1000),
    activeStepRemainingSeconds: Math.ceil(activeStepRemainingMs / 1000),
    totalElapsedSeconds: Math.floor(
      (synced.elapsedBeforeCurrentStepMs + elapsedMs) / 1000,
    ),
    totalRemainingSeconds: Math.ceil(
      (activeStepRemainingMs + remainingFutureMs(synced)) / 1000,
    ),
    nextStep: synced.steps[synced.currentStepIndex + 1] ?? null,
  };
}
