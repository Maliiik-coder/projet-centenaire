import { STRENGTH_EXERCISES } from "@/lib/sport/exerciseLibrary";
import type {
  BodyZone,
  CapabilityLevel,
  Exercise,
  ExerciseVariant,
  MovementPattern,
  UserLimitation,
} from "@/lib/sport/types";

export type ExerciseCatalogZoneFilter = BodyZone | "all";
export type ExerciseCatalogIntentionFilter = MovementPattern | "all";
export type ExerciseCatalogLevelFilter = CapabilityLevel | "all";

export interface ExerciseCatalogFilters {
  zone: ExerciseCatalogZoneFilter;
  intention: ExerciseCatalogIntentionFilter;
  level: ExerciseCatalogLevelFilter;
  noEquipmentOnly: boolean;
  activeLimitationZones: BodyZone[];
}

export interface ExerciseCatalogEntry {
  exercise: Exercise;
  matchingVariantIds: string[];
}

export interface ExerciseCatalogDetail {
  exercise: Exercise;
  variants: ExerciseVariant[];
}

export interface VariantNavigation {
  current: ExerciseVariant;
  easier: ExerciseVariant | null;
  harder: ExerciseVariant | null;
}

export const defaultExerciseCatalogFilters: ExerciseCatalogFilters = {
  zone: "all",
  intention: "all",
  level: "all",
  noEquipmentOnly: true,
  activeLimitationZones: [],
};

export const movementPatternLabels: Record<MovementPattern, string> = {
  bridge: "Hanches",
  core: "Gainage",
  hinge: "Chaine posterieure",
  locomotion: "Faible impact",
  mobility: "Mobilite",
  pull: "Dos / tirage",
  push: "Poussee",
  squat: "Jambes",
};

export function activeSportLimitationZones(
  limitations: UserLimitation[],
): BodyZone[] {
  return Array.from(
    new Set(
      limitations
        .filter(
          (limitation) =>
            limitation.active &&
            limitation.kind !== "none" &&
            limitation.zone !== null,
        )
        .map((limitation) => limitation.zone as BodyZone),
    ),
  );
}

export function hasNoEquipmentVariant(exercise: Exercise): boolean {
  return exercise.variants.some(
    (variant) => variant.requiredEquipment.length === 0,
  );
}

export function isExerciseCompatibleWithLimitations(
  exercise: Exercise,
  activeLimitationZones: BodyZone[],
): boolean {
  if (activeLimitationZones.length === 0) {
    return true;
  }

  return !activeLimitationZones.some((zone) =>
    exercise.cautionZones.includes(zone),
  );
}

export function variantMatchesCatalogFilters(
  variant: ExerciseVariant,
  filters: Pick<ExerciseCatalogFilters, "level" | "noEquipmentOnly">,
): boolean {
  if (filters.noEquipmentOnly && variant.requiredEquipment.length > 0) {
    return false;
  }

  if (filters.level !== "all" && variant.difficulty !== filters.level) {
    return false;
  }

  return true;
}

export function exerciseMatchesCatalogFilters(
  exercise: Exercise,
  filters: ExerciseCatalogFilters,
): boolean {
  if (
    !isExerciseCompatibleWithLimitations(
      exercise,
      filters.activeLimitationZones,
    )
  ) {
    return false;
  }

  if (filters.zone !== "all" && !exercise.targetZones.includes(filters.zone)) {
    return false;
  }

  if (
    filters.intention !== "all" &&
    exercise.movementPattern !== filters.intention
  ) {
    return false;
  }

  return exercise.variants.some((variant) =>
    variantMatchesCatalogFilters(variant, filters),
  );
}

export function listExerciseCatalogEntries(
  filters: ExerciseCatalogFilters,
  exercises: Exercise[] = STRENGTH_EXERCISES,
): ExerciseCatalogEntry[] {
  return exercises
    .filter((exercise) => exerciseMatchesCatalogFilters(exercise, filters))
    .map((exercise) => ({
      exercise,
      matchingVariantIds: exercise.variants
        .filter((variant) => variantMatchesCatalogFilters(variant, filters))
        .map((variant) => variant.id),
    }));
}

export function getExerciseCatalogDetail(
  exerciseId: string,
  exercises: Exercise[] = STRENGTH_EXERCISES,
): ExerciseCatalogDetail | null {
  const exercise = exercises.find((item) => item.id === exerciseId) ?? null;
  return exercise ? { exercise, variants: exercise.variants } : null;
}

export function getVariantNavigation(
  detail: ExerciseCatalogDetail,
  variantId: string,
): VariantNavigation | null {
  const current =
    detail.variants.find((variant) => variant.id === variantId) ?? null;
  if (!current) {
    return null;
  }

  const easier =
    current.easierVariantId === null || current.easierVariantId === undefined
      ? null
      : detail.variants.find(
          (variant) => variant.id === current.easierVariantId,
        ) ?? null;
  const harder =
    current.harderVariantId === null || current.harderVariantId === undefined
      ? null
      : detail.variants.find(
          (variant) => variant.id === current.harderVariantId,
        ) ?? null;

  return { current, easier, harder };
}
