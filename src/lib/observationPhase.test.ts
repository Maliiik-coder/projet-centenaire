import { describe, expect, it } from "vitest";
import {
  INITIAL_OBSERVATION_DAYS,
  INITIAL_OBSERVATION_MEAL_MESSAGE,
  isInitialObservationDay,
} from "@/lib/observationPhase";

describe("initial observation phase", () => {
  it("couvre uniquement les sept premiers jours", () => {
    expect(INITIAL_OBSERVATION_DAYS).toBe(7);
    expect(isInitialObservationDay(1)).toBe(true);
    expect(isInitialObservationDay(7)).toBe(true);
    expect(isInitialObservationDay(0)).toBe(false);
    expect(isInitialObservationDay(8)).toBe(false);
  });

  it("reste descriptive sans proposer de correction immédiate", () => {
    expect(INITIAL_OBSERVATION_MEAL_MESSAGE).toContain("rejoint ton carnet");
    expect(INITIAL_OBSERVATION_MEAL_MESSAGE).toContain("observer");
    expect(INITIAL_OBSERVATION_MEAL_MESSAGE).not.toContain("Prochaine fois");
  });
});
