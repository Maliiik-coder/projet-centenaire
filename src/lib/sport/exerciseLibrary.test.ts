import { describe, expect, it } from "vitest";
import { getExerciseById, getVariantById } from "@/lib/sport/exerciseLibrary";

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
});
