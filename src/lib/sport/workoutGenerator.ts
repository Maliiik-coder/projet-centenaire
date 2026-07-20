import {
  SPORT_ENGINE_VERSION,
  STRENGTH_WORKOUT_CONFIG,
  clampWorkoutDuration,
} from "@/lib/sport/config";
import { STRENGTH_EXERCISES } from "@/lib/sport/exerciseLibrary";
import { deriveProgressionAdjustment } from "@/lib/sport/progression";
import type {
  CapabilityDimension,
  CapabilityLevel,
  EquipmentType,
  Exercise,
  ExerciseVariant,
  GeneratedWorkoutSession,
  MovementPattern,
  SportEngineReason,
  SportGenerationInput,
  SportGenerationSnapshot,
  SportLocation,
  WorkoutStep,
} from "@/lib/sport/types";

export interface SportGenerationResult {
  session: GeneratedWorkoutSession | null;
  reasons: SportEngineReason[];
}

interface SelectedMovement {
  exercise: Exercise;
  variant: ExerciseVariant;
  capabilityLevel: CapabilityLevel;
}

const MAIN_MOVEMENT_ORDER: MovementPattern[] = [
  "mobility",
  "squat",
  "push",
  "hinge",
  "bridge",
  "core",
  "pull",
  "locomotion",
];

function hashNumber(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function hashText(value: string): string {
  return hashNumber(value).toString(36);
}

function rotationOffset(
  input: SportGenerationInput,
  pattern: MovementPattern,
  itemCount: number,
): number {
  if (itemCount <= 1) {
    return 0;
  }

  return (
    hashNumber(
      JSON.stringify({
        userId: input.userId,
        requestedDurationMinutes: input.requestedDurationMinutes,
        now: input.now,
        seed: input.seed ?? "",
        pattern,
      }),
    ) % itemCount
  );
}

function rotateByOffset<T>(items: T[], offset: number): T[] {
  if (items.length <= 1 || offset === 0) {
    return items;
  }

  return [...items.slice(offset), ...items.slice(0, offset)];
}

function stepId(sessionId: string, order: number, type: string): string {
  return `${sessionId}-step-${String(order).padStart(2, "0")}-${type}`;
}

function seconds(minutes: number): number {
  return minutes * 60;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function equipmentSet(equipment: SportGenerationInput["equipment"]): Set<EquipmentType> {
  const available = new Set<EquipmentType>(["none"]);
  for (const item of equipment) {
    if (item.available) {
      available.add(item.type);
    }
  }
  return available;
}

function hasRequiredEquipment(
  requiredEquipment: EquipmentType[],
  availableEquipment: Set<EquipmentType>,
): boolean {
  return requiredEquipment.every(
    (item) => item === "none" || availableEquipment.has(item),
  );
}

function capabilityMap(
  capabilities: SportGenerationInput["capabilities"],
): Partial<Record<CapabilityDimension, CapabilityLevel>> {
  const map: Partial<Record<CapabilityDimension, CapabilityLevel>> = {};
  for (const capability of capabilities) {
    map[capability.dimension] = capability.level;
  }
  return map;
}

function locationSupportsStrength(location: SportLocation): boolean {
  return location === "home" || location === "gym" || location === "outdoor";
}

function isExcludedByLimitation(
  exercise: Exercise,
  input: SportGenerationInput,
  reasons: SportEngineReason[],
): boolean {
  const activeLimitations = input.limitations.filter(
    (limitation) => limitation.active && limitation.kind !== "none" && limitation.zone,
  );

  for (const limitation of activeLimitations) {
    if (limitation.zone && exercise.cautionZones.includes(limitation.zone)) {
      reasons.push({
        code: "limitation_excluded",
        message: `${exercise.name} exclu car une zone sensible declaree peut etre sollicitee.`,
        severity: "caution",
        exerciseId: exercise.id,
        details: { zone: limitation.zone, kind: limitation.kind },
      });
      return true;
    }
  }

  return false;
}

function adjustedCapabilityLevel(
  level: CapabilityLevel,
  dimension: CapabilityDimension,
  adjustment = deriveProgressionAdjustment([], []),
): CapabilityLevel {
  if (adjustment.variable !== "variant_difficulty") {
    return level;
  }

  if (adjustment.dimension && adjustment.dimension !== dimension) {
    return level;
  }

  if (adjustment.direction === "decrease") {
    return Math.max(0, level - adjustment.value) as CapabilityLevel;
  }

  if (adjustment.direction === "increase") {
    return Math.min(4, level + adjustment.value) as CapabilityLevel;
  }

  return level;
}

function chooseVariant(args: {
  exercise: Exercise;
  availableEquipment: Set<EquipmentType>;
  capabilityLevel: CapabilityLevel;
  reasons: SportEngineReason[];
  allowFallback?: boolean;
  recordReason?: boolean;
}): ExerciseVariant | null {
  const compatibleVariants = args.exercise.variants.filter((variant) =>
    hasRequiredEquipment(variant.requiredEquipment, args.availableEquipment),
  );

  if (compatibleVariants.length === 0) {
    args.reasons.push({
      code: "equipment_excluded",
      message: `${args.exercise.name} exclu car le materiel requis n'est pas disponible.`,
      severity: "info",
      exerciseId: args.exercise.id,
      details: { requiredEquipment: args.exercise.requiredEquipment.join(",") },
    });
    return null;
  }

  const safeVariants = compatibleVariants
    .filter((variant) => variant.difficulty <= args.capabilityLevel)
    .sort((a, b) => b.difficulty - a.difficulty || a.id.localeCompare(b.id));

  const selected =
    safeVariants[0] ??
    (args.allowFallback === false
      ? null
      : compatibleVariants.sort(
          (a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id),
        )[0] ?? null);

  if (selected && args.recordReason !== false) {
    args.reasons.push({
      code: "capability_variant",
      message: `${selected.name} choisi selon la capacite declaree pour ${args.exercise.capabilityDimension}.`,
      severity: "info",
      exerciseId: args.exercise.id,
      variantId: selected.id,
      details: {
        capabilityLevel: args.capabilityLevel,
        variantDifficulty: selected.difficulty,
      },
    });
  }

  return selected;
}

function selectMovements(
  input: SportGenerationInput,
  reasons: SportEngineReason[],
): SelectedMovement[] {
  const availableEquipment = equipmentSet(input.equipment);
  const capabilities = capabilityMap(input.capabilities);
  const adjustment = deriveProgressionAdjustment(
    input.previousSessions,
    input.feedback,
  );

  const selected: SelectedMovement[] = [];

  for (const pattern of MAIN_MOVEMENT_ORDER) {
    const sortedExercisesForPattern = STRENGTH_EXERCISES.filter(
      (exercise) => exercise.active && exercise.movementPattern === pattern,
    ).sort((a, b) => a.id.localeCompare(b.id));
    const exercisesForPattern = rotateByOffset(
      sortedExercisesForPattern,
      rotationOffset(input, pattern, sortedExercisesForPattern.length),
    );

    let foundForPattern: SelectedMovement | null = null;
    let fallbackForPattern: SelectedMovement | null = null;

    for (const exercise of exercisesForPattern) {
      if (!hasRequiredEquipment(exercise.requiredEquipment, availableEquipment)) {
        reasons.push({
          code: "equipment_excluded",
          message: `${exercise.name} exclu car le materiel requis n'est pas disponible.`,
          severity: "info",
          exerciseId: exercise.id,
          details: { requiredEquipment: exercise.requiredEquipment.join(",") },
        });
        if (pattern === "pull") {
          reasons.push({
            code: "pull_skipped_without_equipment",
            message:
              "Le tirage est ignore quand aucun mouvement compatible et prudent n'est disponible.",
            severity: "info",
            details: { pattern },
          });
        }
        continue;
      }

      if (isExcludedByLimitation(exercise, input, reasons)) {
        continue;
      }

      const declaredLevel = capabilities[exercise.capabilityDimension];
      const baseLevel = declaredLevel ?? 0;
      if (declaredLevel === undefined) {
        reasons.push({
          code: "missing_capability_prudent_default",
          message: `${exercise.name} utilise un niveau prudent faute de capacite connue.`,
          severity: "info",
          exerciseId: exercise.id,
          details: { dimension: exercise.capabilityDimension },
        });
      }

      const capabilityLevel = adjustedCapabilityLevel(
        baseLevel,
        exercise.capabilityDimension,
        adjustment,
      );
      const variant = chooseVariant({
        exercise,
        availableEquipment,
        capabilityLevel,
        reasons,
        allowFallback: false,
      });

      if (variant) {
        foundForPattern = { exercise, variant, capabilityLevel };
        break;
      }

      if (!fallbackForPattern) {
        const fallbackVariant = chooseVariant({
          exercise,
          availableEquipment,
          capabilityLevel,
          reasons,
          recordReason: false,
        });

        if (fallbackVariant) {
          fallbackForPattern = {
            exercise,
            variant: fallbackVariant,
            capabilityLevel,
          };
        }
      }
    }

    if (foundForPattern) {
      selected.push(foundForPattern);
    } else if (fallbackForPattern) {
      reasons.push({
        code: "capability_variant",
        message: `${fallbackForPattern.variant.name} choisi en variante minimale disponible pour ${fallbackForPattern.exercise.capabilityDimension}.`,
        severity: "caution",
        exerciseId: fallbackForPattern.exercise.id,
        variantId: fallbackForPattern.variant.id,
        details: {
          capabilityLevel: fallbackForPattern.capabilityLevel,
          variantDifficulty: fallbackForPattern.variant.difficulty,
        },
      });
      selected.push(fallbackForPattern);
    }
  }

  return selected;
}

function applyTimingAdjustment(
  effortSeconds: number,
  recoverySeconds: number,
  rounds: number,
  input: SportGenerationInput,
): { effortSeconds: number; recoverySeconds: number; rounds: number } {
  const adjustment = deriveProgressionAdjustment(
    input.previousSessions,
    input.feedback,
  );

  if (adjustment.variable === "effort_duration") {
    return {
      effortSeconds:
        adjustment.direction === "increase"
          ? effortSeconds + adjustment.value
          : Math.max(10, effortSeconds - adjustment.value),
      recoverySeconds,
      rounds,
    };
  }

  if (adjustment.variable === "recovery_duration") {
    return {
      effortSeconds,
      recoverySeconds:
        adjustment.direction === "decrease"
          ? Math.max(20, recoverySeconds - adjustment.value)
          : recoverySeconds + adjustment.value,
      rounds,
    };
  }

  if (adjustment.variable === "round_count") {
    return {
      effortSeconds,
      recoverySeconds,
      rounds:
        adjustment.direction === "increase"
          ? rounds + adjustment.value
          : Math.max(1, rounds - adjustment.value),
    };
  }

  return { effortSeconds, recoverySeconds, rounds };
}

function plannedMainSeconds(
  movementCount: number,
  effortSeconds: number,
  recoverySeconds: number,
  transitionSeconds: number,
  rounds: number,
): number {
  if (movementCount === 0) {
    return 0;
  }

  const oneRound =
    movementCount * (effortSeconds + recoverySeconds) +
    Math.max(0, movementCount - 1) * transitionSeconds;

  return oneRound * rounds;
}

function fitMovementsToDuration(args: {
  selected: SelectedMovement[];
  requestedSeconds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
  effortSeconds: number;
  recoverySeconds: number;
  rounds: number;
}): { selected: SelectedMovement[]; rounds: number } {
  let fitted = [...args.selected];
  let rounds = args.rounds;

  while (fitted.length > 0) {
    const total =
      STRENGTH_WORKOUT_CONFIG.preparationSeconds +
      args.warmupSeconds +
      args.cooldownSeconds +
      plannedMainSeconds(
        fitted.length,
        args.effortSeconds,
        args.recoverySeconds,
        STRENGTH_WORKOUT_CONFIG.transitionSeconds,
        rounds,
      );

    if (total <= args.requestedSeconds) {
      return { selected: fitted, rounds };
    }

    if (rounds > 1) {
      rounds -= 1;
    } else {
      fitted = fitted.slice(0, -1);
    }
  }

  return { selected: [], rounds: 1 };
}

function totalStepSeconds(steps: WorkoutStep[]): number {
  return steps.reduce((total, step) => total + (step.durationSeconds ?? 0), 0);
}

function buildSteps(args: {
  sessionId: string;
  selected: SelectedMovement[];
  rounds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
  effortSeconds: number;
  recoverySeconds: number;
}): WorkoutStep[] {
  const steps: WorkoutStep[] = [];

  function push(step: Omit<WorkoutStep, "id" | "order" | "sessionId">): void {
    const order = steps.length + 1;
    steps.push({
      ...step,
      id: stepId(args.sessionId, order, step.type),
      sessionId: args.sessionId,
      order,
    });
  }

  push({
    type: "preparation",
    title: "Preparation",
    instruction: "Installe ton espace, garde de quoi respirer et commence doucement.",
    durationSeconds: STRENGTH_WORKOUT_CONFIG.preparationSeconds,
    skippable: true,
  });

  push({
    type: "warmup",
    exerciseId: "warmup_march",
    variantId: "warmup_march_easy",
    title: "Echauffement doux",
    instruction: "Marche sur place a un rythme confortable.",
    durationSeconds: Math.max(20, Math.round(args.warmupSeconds * 0.6)),
    skippable: false,
  });

  if (args.warmupSeconds > 55) {
    push({
      type: "warmup",
      exerciseId: "mobility_shoulders",
      variantId: "mobility_shoulders_small",
      title: "Mobilite tranquille",
      instruction: "Mobilise les epaules dans une amplitude confortable.",
      durationSeconds:
        args.warmupSeconds - Math.max(20, Math.round(args.warmupSeconds * 0.6)),
      skippable: true,
    });
  }

  for (let round = 1; round <= args.rounds; round += 1) {
    args.selected.forEach((movement, index) => {
      const effortDuration = clamp(
        args.effortSeconds,
        movement.variant.effortSecondsMin,
        movement.variant.effortSecondsMax,
      );

      push({
        type: "effort",
        exerciseId: movement.exercise.id,
        variantId: movement.variant.id,
        title:
          args.rounds > 1
            ? `${movement.variant.name} - tour ${round}`
            : movement.variant.name,
        instruction: movement.variant.primaryCue,
        durationSeconds: effortDuration,
        skippable: true,
      });

      push({
        type: "recovery",
        title: "Recuperation",
        instruction: "Respire, relache les epaules et prepare la suite.",
        durationSeconds: args.recoverySeconds,
        skippable: true,
        nextPreparation:
          index < args.selected.length - 1
            ? args.selected[index + 1]?.variant.name
            : round < args.rounds
              ? args.selected[0]?.variant.name
              : "Retour au calme",
      });

      if (index < args.selected.length - 1) {
        push({
          type: "transition",
          title: "Transition",
          instruction: `Prepare ${args.selected[index + 1]?.variant.name ?? "la suite"}.`,
          durationSeconds: STRENGTH_WORKOUT_CONFIG.transitionSeconds,
          skippable: true,
          nextPreparation: args.selected[index + 1]?.variant.name ?? null,
        });
      }
    });
  }

  push({
    type: "cooldown",
    title: "Retour au calme",
    instruction: "Ralentis, marche doucement et observe tes sensations.",
    durationSeconds: args.cooldownSeconds,
    skippable: false,
  });

  return steps;
}

function plannedDifficulty(selected: SelectedMovement[]): CapabilityLevel {
  if (selected.length === 0) {
    return 0;
  }

  const average =
    selected.reduce((sum, item) => sum + item.variant.difficulty, 0) /
    selected.length;

  return Math.min(4, Math.max(0, Math.round(average))) as CapabilityLevel;
}

export function generateWorkout(
  input: SportGenerationInput,
): SportGenerationResult {
  if (input.activity !== "strength") {
    return {
      session: null,
      reasons: [
        {
          code: "activity_not_implemented",
          message:
            "Marche/course et natation sont modelisees, mais non generees dans cette tranche.",
          severity: "info",
          details: { activity: input.activity },
        },
      ],
    };
  }

  return generateStrengthWorkout(input);
}

export function generateStrengthWorkout(
  input: SportGenerationInput,
): SportGenerationResult {
  const reasons: SportEngineReason[] = [
    {
      code: "activity_supported",
      message: "Generation renforcement activee pour cette tranche verticale.",
      severity: "info",
      details: { activity: input.activity },
    },
  ];

  if (!locationSupportsStrength(input.location)) {
    return {
      session: null,
      reasons: [
        ...reasons,
        {
          code: "activity_not_implemented",
          message:
            "Le renforcement est propose a domicile, dehors ou en salle dans cette tranche.",
          severity: "caution",
          details: { location: input.location },
        },
      ],
    };
  }

  const requestedDurationMinutes = clampWorkoutDuration(
    input.requestedDurationMinutes,
  );
  const requestedSeconds = seconds(requestedDurationMinutes);
  const selected = selectMovements(input, reasons);

  if (selected.length === 0) {
    return {
      session: null,
      reasons: [
        ...reasons,
        {
          code: "no_compatible_exercise",
          message:
            "Aucun exercice de renforcement musculaire compatible avec les contraintes connues.",
          severity: "caution",
        },
      ],
    };
  }

  const baseDifficulty = plannedDifficulty(selected);
  const baseTiming = STRENGTH_WORKOUT_CONFIG.levelTiming[baseDifficulty];
  const timing = applyTimingAdjustment(
    baseTiming.effortSeconds,
    baseTiming.recoverySeconds,
    baseTiming.rounds,
    input,
  );
  const adjustment = deriveProgressionAdjustment(
    input.previousSessions,
    input.feedback,
  );

  if (adjustment.variable === "none") {
    reasons.push({
      code: "adaptation_deferred",
      message: adjustment.reason,
      severity: "info",
    });
  } else {
    reasons.push({
      code: "adaptation_applied",
      message: adjustment.reason,
      severity: adjustment.direction === "increase" ? "info" : "caution",
      details: {
        variable: adjustment.variable,
        direction: adjustment.direction,
        value: adjustment.value,
      },
    });
  }

  const warmupSeconds = clamp(
    requestedSeconds * STRENGTH_WORKOUT_CONFIG.warmupShare,
    STRENGTH_WORKOUT_CONFIG.minWarmupSeconds,
    STRENGTH_WORKOUT_CONFIG.maxWarmupSeconds,
  );
  const cooldownSeconds = clamp(
    requestedSeconds * STRENGTH_WORKOUT_CONFIG.cooldownShare,
    STRENGTH_WORKOUT_CONFIG.minCooldownSeconds,
    STRENGTH_WORKOUT_CONFIG.maxCooldownSeconds,
  );

  const fitted = fitMovementsToDuration({
    selected,
    requestedSeconds,
    warmupSeconds,
    cooldownSeconds,
    effortSeconds: timing.effortSeconds,
    recoverySeconds: timing.recoverySeconds,
    rounds: timing.rounds,
  });

  if (fitted.selected.length === 0) {
    return {
      session: null,
      reasons: [
        ...reasons,
        {
          code: "no_compatible_exercise",
          message:
            "La duree demandee est trop courte pour construire une seance prudente.",
          severity: "caution",
          details: { requestedDurationMinutes },
        },
      ],
    };
  }

  const sessionId = `sport-session-${hashText(
    JSON.stringify({
      userId: input.userId,
      activity: input.activity,
      requestedDurationMinutes,
      now: input.now,
      seed: input.seed ?? "",
      equipment: input.equipment.map((item) => [item.type, item.available]),
      limitations: input.limitations.map((item) => [item.kind, item.zone, item.active]),
      capabilities: input.capabilities.map((item) => [item.dimension, item.level]),
      adjustment,
    }),
  )}`;

  const steps = buildSteps({
    sessionId,
    selected: fitted.selected,
    rounds: fitted.rounds,
    warmupSeconds,
    cooldownSeconds,
    effortSeconds: timing.effortSeconds,
    recoverySeconds: timing.recoverySeconds,
  });
  const plannedDurationSeconds = totalStepSeconds(steps);
  const generationInputSnapshot: SportGenerationSnapshot = {
    activity: input.activity,
    requestedDurationMinutes,
    location: input.location,
    equipment: Array.from(equipmentSet(input.equipment)).sort(),
    activeLimitations: input.limitations
      .filter((limitation) => limitation.active)
      .map((limitation) => ({
        kind: limitation.kind,
        zone: limitation.zone,
      })),
    capabilities: capabilityMap(input.capabilities),
    appliedAdjustment: adjustment,
  };

  reasons.push(
    {
      code: "time_distribution",
      message: "La seance repartit le temps entre echauffement, bloc principal et retour au calme.",
      severity: "info",
      details: {
        warmupSeconds,
        cooldownSeconds,
        rounds: fitted.rounds,
        movementCount: fitted.selected.length,
      },
    },
    {
      code: "duration_respected",
      message: "La duree planifiee ne depasse pas la duree demandee.",
      severity: "info",
      details: {
        requestedSeconds,
        plannedDurationSeconds,
      },
    },
  );

  return {
    session: {
      id: sessionId,
      userId: input.userId,
      activity: "strength",
      requestedDurationMinutes,
      plannedDurationSeconds,
      performedDurationSeconds: null,
      status: "proposed",
      scheduledAt: input.now,
      generationEngineVersion: SPORT_ENGINE_VERSION,
      plannedDifficulty: plannedDifficulty(fitted.selected),
      generalReason: `${requestedDurationMinutes} min de renforcement musculaire adaptees a l'evaluation et aux retours connus.`,
      reasons,
      generationInputSnapshot,
      steps,
    },
    reasons,
  };
}
