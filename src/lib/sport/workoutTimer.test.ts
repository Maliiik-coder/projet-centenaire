import { describe, expect, it } from "vitest";
import type { TimerStep } from "@/lib/sport/types";
import {
  cancelTimer,
  createWorkoutTimer,
  extendCurrentRecovery,
  finishTimer,
  getTimerView,
  goToPreviousStep,
  pauseTimer,
  resumeTimer,
  skipToNextStep,
  startTimer,
  syncTimer,
} from "@/lib/sport/workoutTimer";

const steps: TimerStep[] = [
  {
    id: "prep",
    type: "preparation",
    title: "Preparation",
    instruction: "Installe-toi.",
    durationSeconds: 10,
  },
  {
    id: "effort",
    type: "effort",
    title: "Effort",
    instruction: "Bouge doucement.",
    durationSeconds: 30,
  },
  {
    id: "recovery",
    type: "recovery",
    title: "Recuperation",
    instruction: "Respire.",
    durationSeconds: 20,
  },
];

describe("workoutTimer", () => {
  it("demarre sur la preparation", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const view = getTimerView(timer, 1_000);

    expect(view.status).toBe("preparation");
    expect(view.activeStepRemainingSeconds).toBe(10);
  });

  it("passe automatiquement a l'etape suivante avec les horodatages", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const synced = syncTimer(timer, 12_000);
    const view = getTimerView(synced, 12_000);

    expect(view.status).toBe("effort");
    expect(view.currentStep?.id).toBe("effort");
    expect(view.activeStepRemainingSeconds).toBe(29);
  });

  it("met en pause et reprend sans perdre le temps deja ecoule", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const paused = pauseTimer(timer, 6_000);
    const resumed = resumeTimer(paused, 20_000);
    const view = getTimerView(resumed, 20_000);

    expect(paused.status).toBe("paused");
    expect(view.status).toBe("preparation");
    expect(view.activeStepRemainingSeconds).toBe(5);
    expect(resumed.totalPausedMs).toBe(14_000);
  });

  it("reprend correctement apres une mise en arriere-plan simulee", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const view = getTimerView(syncTimer(timer, 52_000), 52_000);

    expect(view.status).toBe("recovery");
    expect(view.currentStep?.id).toBe("recovery");
    expect(view.activeStepRemainingSeconds).toBe(9);
  });

  it("termine automatiquement quand le temps reel depasse la seance", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const synced = syncTimer(timer, 70_000);

    expect(synced.status).toBe("finished");
    expect(getTimerView(synced, 70_000).totalRemainingSeconds).toBe(0);
  });

  it("permet de passer a l'etape suivante", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const skipped = skipToNextStep(timer, 3_000);

    expect(skipped.currentStepIndex).toBe(1);
    expect(getTimerView(skipped, 3_000).currentStep?.id).toBe("effort");
  });

  it("prolonge uniquement une recuperation", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const recovery = syncTimer(timer, 41_000);
    const extended = extendCurrentRecovery(recovery, 15);

    expect(getTimerView(extended, 41_000).activeStepRemainingSeconds).toBe(35);
  });

  it("sait terminer ou annuler explicitement", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);

    expect(finishTimer(timer, 4_000).status).toBe("finished");
    expect(cancelTimer(timer, 4_000).status).toBe("canceled");
  });

  it("permet un retour a l'etape precedente", () => {
    const timer = startTimer(createWorkoutTimer("workout", steps), 1_000);
    const effort = syncTimer(timer, 12_000);
    const previous = goToPreviousStep(effort, 12_000);

    expect(previous.currentStepIndex).toBe(0);
    expect(getTimerView(previous, 12_000).currentStep?.id).toBe("prep");
  });
});
