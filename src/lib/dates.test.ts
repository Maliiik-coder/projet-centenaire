import { describe, expect, it } from "vitest";
import { shouldUpdateCurrentDate } from "@/lib/dates";

describe("current date refresh", () => {
  it("detecte le passage à une nouvelle date", () => {
    expect(shouldUpdateCurrentDate("2026-07-11", "2026-07-12")).toBe(true);
  });

  it("ne force pas de mise à jour quand la date est identique", () => {
    expect(shouldUpdateCurrentDate("2026-07-11", "2026-07-11")).toBe(false);
  });
});
