import { describe, expect, it } from "vitest";
import { calculateAgeOnDate, shouldUpdateCurrentDate } from "@/lib/dates";

describe("current date refresh", () => {
  it("detecte le passage à une nouvelle date", () => {
    expect(shouldUpdateCurrentDate("2026-07-11", "2026-07-12")).toBe(true);
  });

  it("ne force pas de mise à jour quand la date est identique", () => {
    expect(shouldUpdateCurrentDate("2026-07-11", "2026-07-11")).toBe(false);
  });
});

describe("age à une date donnée", () => {
  it("tient compte du passage de l’anniversaire", () => {
    expect(calculateAgeOnDate("1988-07-14", "2026-07-15")).toBe(38);
    expect(calculateAgeOnDate("1988-07-16", "2026-07-15")).toBe(37);
  });
});
