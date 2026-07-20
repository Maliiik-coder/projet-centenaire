import { describe, expect, it } from "vitest";
import {
  STRENGTH_EXERCISES,
  getExerciseById,
  getVariantById,
} from "@/lib/sport/exerciseLibrary";
import type {
  EquipmentType,
  Exercise,
  ExerciseVariant,
} from "@/lib/sport/types";

const knownEquipment = new Set<EquipmentType>([
  "mat",
  "stable_chair",
  "resistance_band",
  "dumbbells",
  "pull_up_bar",
  "gym_equipment",
  "kickboard",
  "pull_buoy",
  "fins",
]);

function allVariants(): ExerciseVariant[] {
  return STRENGTH_EXERCISES.flatMap((exercise) => exercise.variants);
}

function exerciseText(exercise: Exercise): string {
  return [
    exercise.id,
    exercise.name,
    exercise.shortDescription,
    exercise.primaryCue,
    exercise.breathing,
    ...exercise.teachingSteps,
    ...exercise.commonMistakes,
    ...exercise.variants.flatMap((variant) => [
      variant.id,
      variant.name,
      variant.guidance,
      variant.primaryCue,
    ]),
  ].join(" ");
}

describe("exerciseLibrary", () => {
  it("decrit une progression de pompes sans materiel obligatoire", () => {
    const push = getExerciseById("push_up_family");
    const progressionIds = [
      "push_wall",
      "push_knees",
      "push_standard",
      "push_feet_elevated",
    ];

    expect(push).not.toBeNull();
    expect(progressionIds.map((id) => getVariantById(id)?.name)).toEqual([
      "Pompes contre un mur",
      "Pompes sur les genoux",
      "Pompes classiques",
      "Pompes pieds sureleves",
    ]);
    expect(getVariantById("push_wall")?.harderVariantId).toBe("push_knees");
    expect(getVariantById("push_knees")?.harderVariantId).toBe("push_standard");
    expect(getVariantById("push_standard")?.harderVariantId).toBe(
      "push_feet_elevated",
    );
    expect(
      progressionIds.every(
        (variantId) => getVariantById(variantId)?.requiredEquipment.length === 0,
      ),
    ).toBe(true);
  });

  it("propose un catalogue renforcement etendu et majoritairement sans materiel", () => {
    const variants = allVariants();
    const noEquipmentFamilies = STRENGTH_EXERCISES.filter(
      (exercise) => exercise.requiredEquipment.length === 0,
    );
    const noEquipmentVariants = variants.filter(
      (variantItem) => variantItem.requiredEquipment.length === 0,
    );

    expect(STRENGTH_EXERCISES.length).toBeGreaterThanOrEqual(25);
    expect(variants.length).toBeGreaterThanOrEqual(60);
    expect(noEquipmentFamilies.length).toBeGreaterThanOrEqual(22);
    expect(noEquipmentVariants.length).toBeGreaterThanOrEqual(55);
  });

  it("garde des identifiants uniques pour exercices, variantes et medias", () => {
    const exerciseIds = STRENGTH_EXERCISES.map((exercise) => exercise.id);
    const variantIds = allVariants().map((variantItem) => variantItem.id);
    const mediaIds = STRENGTH_EXERCISES.flatMap((exercise) =>
      exercise.media.map((mediaItem) => mediaItem.id),
    );

    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);
    expect(new Set(variantIds).size).toBe(variantIds.length);
    expect(new Set(mediaIds).size).toBe(mediaIds.length);
  });

  it("relie les variantes a leur famille et a des niveaux coherents", () => {
    for (const exercise of STRENGTH_EXERCISES) {
      expect(exercise.variants.length).toBeGreaterThan(0);

      for (const variantItem of exercise.variants) {
        expect(variantItem.exerciseId).toBe(exercise.id);
        expect(variantItem.difficulty).toBeGreaterThanOrEqual(0);
        expect(variantItem.difficulty).toBeLessThanOrEqual(4);

        if (variantItem.easierVariantId) {
          const easier = getVariantById(variantItem.easierVariantId);
          expect(easier).not.toBeNull();
          expect(easier?.difficulty).toBeLessThanOrEqual(variantItem.difficulty);
        }

        if (variantItem.harderVariantId) {
          const harder = getVariantById(variantItem.harderVariantId);
          expect(harder).not.toBeNull();
          expect(harder?.difficulty).toBeGreaterThanOrEqual(variantItem.difficulty);
        }
      }
    }
  });

  it("renseigne le materiel, les zones et les limites sans fausse promesse", () => {
    for (const exercise of STRENGTH_EXERCISES) {
      expect(exercise.targetZones.length).toBeGreaterThan(0);
      expect(exercise.cautionZones.length).toBeGreaterThan(0);

      for (const equipment of exercise.requiredEquipment) {
        expect(knownEquipment.has(equipment)).toBe(true);
      }

      for (const variantItem of exercise.variants) {
        for (const equipment of variantItem.requiredEquipment) {
          expect(knownEquipment.has(equipment)).toBe(true);
        }
      }
    }
  });

  it("couvre les familles attendues dont tirage sans materiel et faible impact", () => {
    const movementPatterns = new Set(
      STRENGTH_EXERCISES.map((exercise) => exercise.movementPattern),
    );
    const noEquipmentPullFamilies = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.movementPattern === "pull" &&
        exercise.variants.some(
          (variantItem) => variantItem.requiredEquipment.length === 0,
        ),
    );
    const lowImpactFamilies = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.movementPattern === "locomotion" &&
        exercise.requiredEquipment.length === 0,
    );

    expect(movementPatterns).toEqual(
      new Set([
        "bridge",
        "core",
        "hinge",
        "locomotion",
        "mobility",
        "pull",
        "push",
        "squat",
      ]),
    );
    expect(noEquipmentPullFamilies.length).toBeGreaterThanOrEqual(4);
    expect(lowImpactFamilies.length).toBeGreaterThanOrEqual(3);
  });

  it("reste dans un vocabulaire Haru neutre et non medical", () => {
    const forbiddenPattern =
      /\b(calorie|calories|brulees|bruler|compensation|diagnostic|lafay|competition|classement)\b/i;

    for (const exercise of STRENGTH_EXERCISES) {
      expect(exerciseText(exercise)).not.toMatch(forbiddenPattern);
    }
  });
});
