import { describe, expect, it } from "vitest";
import {
  buildBirthDateValue,
  getDaysInMonth,
} from "@/components/ui/DateWheelPicker";

describe("DateWheelPicker", () => {
  it("assemble une date ISO seulement lorsque les trois parties existent", () => {
    expect(
      buildBirthDateValue({ day: "7", month: "11", year: "1988" }),
    ).toBe("1988-11-07");
    expect(buildBirthDateValue({ day: "", month: "11", year: "1988" })).toBe(
      "",
    );
  });

  it("respecte le nombre de jours du mois", () => {
    expect(getDaysInMonth("02", "2000")).toBe(29);
    expect(getDaysInMonth("02", "2001")).toBe(28);
    expect(
      buildBirthDateValue({ day: "31", month: "04", year: "1988" }),
    ).toBe("");
  });
});
