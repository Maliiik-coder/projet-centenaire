import { describe, expect, it } from "vitest";
import { buildNumericWheelOptions } from "@/components/ui/WheelPicker";

describe("buildNumericWheelOptions", () => {
  it("conserve toute la plage et insère une position vide près de la suggestion", () => {
    const options = buildNumericWheelOptions(16, 20, 18);

    expect(options).toEqual([16, 17, null, 18, 19, 20]);
  });

  it("borne la position suggérée dans la plage", () => {
    expect(buildNumericWheelOptions(100, 102, 999)).toEqual([
      100,
      101,
      null,
      102,
    ]);
  });
});
