import { describe, expect, it } from "vitest";
import { STRENGTH_EXERCISES } from "@/lib/sport/exerciseLibrary";
import {
  activeSportLimitationZones,
  defaultExerciseCatalogFilters,
  getExerciseCatalogDetail,
  getVariantNavigation,
  hasNoEquipmentVariant,
  listExerciseCatalogEntries,
} from "@/lib/sport/exerciseCatalog";
import type { UserLimitation } from "@/lib/sport/types";

const NOW = "2026-07-21T09:00:00.000Z";

describe("exerciseCatalog", () => {
  it("rend visible le catalogue enrichi par defaut en sans materiel", () => {
    const entries = listExerciseCatalogEntries(defaultExerciseCatalogFilters);

    expect(entries.length).toBeGreaterThanOrEqual(25);
    expect(entries.every((entry) => hasNoEquipmentVariant(entry.exercise))).toBe(
      true,
    );
    expect(entries.every((entry) => entry.matchingVariantIds.length > 0)).toBe(
      true,
    );
  });

  it("ouvre une fiche exercice avec intention, precautions et variantes", () => {
    const detail = getExerciseCatalogDetail("push_up_family");

    expect(detail?.exercise.name).toBe("Pompes adaptees");
    expect(detail?.exercise.shortDescription).toContain("Poussee");
    expect(detail?.exercise.cautionZones).toContain("wrists");
    expect(detail?.variants.map((variant) => variant.id)).toContain("push_wall");
  });

  it("filtre par zone, intention, niveau et sans materiel", () => {
    const entries = listExerciseCatalogEntries({
      ...defaultExerciseCatalogFilters,
      zone: "hips",
      intention: "bridge",
      level: 2,
      noEquipmentOnly: true,
    });

    expect(entries.length).toBeGreaterThan(0);
    expect(
      entries.every(
        (entry) =>
          entry.exercise.targetZones.includes("hips") &&
          entry.exercise.movementPattern === "bridge",
      ),
    ).toBe(true);
    expect(
      entries.every((entry) =>
        entry.matchingVariantIds.every((variantId) => {
          const variant = entry.exercise.variants.find(
            (item) => item.id === variantId,
          );
          return variant?.difficulty === 2 && variant.requiredEquipment.length === 0;
        }),
      ),
    ).toBe(true);
  });

  it("navigue entre regression et progression via les liens du catalogue", () => {
    const detail = getExerciseCatalogDetail("push_up_family");
    expect(detail).not.toBeNull();

    const navigation = detail
      ? getVariantNavigation(detail, "push_knees")
      : null;

    expect(navigation?.current.name).toBe("Pompes sur les genoux");
    expect(navigation?.easier?.id).toBe("push_wall");
    expect(navigation?.harder?.id).toBe("push_standard");
  });

  it("identifie les exercices sans materiel reellement disponibles", () => {
    const noEquipmentEntries = listExerciseCatalogEntries({
      ...defaultExerciseCatalogFilters,
      noEquipmentOnly: true,
    });
    const equipmentRequired = STRENGTH_EXERCISES.find(
      (exercise) => exercise.id === "band_row",
    );

    expect(noEquipmentEntries.map((entry) => entry.exercise.id)).not.toContain(
      "band_row",
    );
    expect(equipmentRequired ? hasNoEquipmentVariant(equipmentRequired) : false).toBe(
      false,
    );
  });

  it("masque les mouvements incompatibles avec les zones sensibles connues", () => {
    const limitations: UserLimitation[] = [
      {
        id: "limitation-wrists",
        userId: "user-sport",
        kind: "pain",
        zone: "wrists",
        active: true,
        declaredAt: NOW,
        resolvedAt: null,
        description: null,
      },
    ];
    const entries = listExerciseCatalogEntries({
      ...defaultExerciseCatalogFilters,
      activeLimitationZones: activeSportLimitationZones(limitations),
    });

    expect(entries.map((entry) => entry.exercise.id)).not.toContain(
      "push_up_family",
    );
    expect(
      entries.every((entry) => !entry.exercise.cautionZones.includes("wrists")),
    ).toBe(true);
  });

  it("garde un etat neutre possible pour les exercices sans illustration dediee", () => {
    const detail = getExerciseCatalogDetail("single_leg_balance");

    expect(detail?.exercise.media.every((media) => media.placeholder)).toBe(true);
    expect(detail?.exercise.media[0]?.license).toContain("A fournir");
  });
});
