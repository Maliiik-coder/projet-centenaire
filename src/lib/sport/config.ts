import type {
  CapabilityLevel,
  ProgressionAdjustment,
} from "@/lib/sport/types";

export const SPORT_ENGINE_VERSION = "sport-strength-mvp-2026-07-15.1";

export const SPORT_LOCAL_STORAGE_KEY = "haru-sport-isolated-v1";

export const SPORT_SCOPED_LOCAL_STORAGE_PREFIX = "haru-sport-isolated-v2";

export const SPORT_LOCAL_USER_ID = "local-sport-user";

export const STRENGTH_WORKOUT_CONFIG = {
  minDurationMinutes: 5,
  maxDurationMinutes: 45,
  preparationSeconds: 10,
  transitionSeconds: 15,
  warmupShare: 0.16,
  cooldownShare: 0.12,
  minWarmupSeconds: 45,
  maxWarmupSeconds: 150,
  minCooldownSeconds: 40,
  maxCooldownSeconds: 120,
  targetMovementOrder: [
    "mobility",
    "squat",
    "push",
    "hinge",
    "bridge",
    "core",
    "pull",
  ],
  levelTiming: {
    0: { effortSeconds: 20, recoverySeconds: 45, rounds: 1 },
    1: { effortSeconds: 25, recoverySeconds: 45, rounds: 1 },
    2: { effortSeconds: 30, recoverySeconds: 35, rounds: 2 },
    3: { effortSeconds: 35, recoverySeconds: 30, rounds: 2 },
    4: { effortSeconds: 40, recoverySeconds: 25, rounds: 2 },
  } satisfies Record<
    CapabilityLevel,
    { effortSeconds: number; recoverySeconds: number; rounds: number }
  >,
  progression: {
    coherentFeedbackCount: 2,
    effortStepSeconds: 5,
    recoveryStepSeconds: 5,
    maxRoundIncrease: 1,
  },
};

export const NO_PROGRESSION_ADJUSTMENT: ProgressionAdjustment = {
  variable: "none",
  direction: "maintain",
  reason: "Aucun ajustement applique pour cette generation.",
  value: 0,
};

export function clampWorkoutDuration(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return 15;
  }

  return Math.min(
    STRENGTH_WORKOUT_CONFIG.maxDurationMinutes,
    Math.max(STRENGTH_WORKOUT_CONFIG.minDurationMinutes, Math.round(minutes)),
  );
}
