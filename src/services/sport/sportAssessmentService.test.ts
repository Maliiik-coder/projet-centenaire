import { describe, expect, it } from "vitest";
import {
  applyAssessmentLevelResults,
  applyAssessmentResults,
  hasCompletedSportAssessment,
} from "@/services/sport/sportAssessmentService";
import {
  capabilitiesFromDraft,
  createDefaultSportOnboardingDraft,
} from "@/services/sport/sportProfileService";

const NOW = "2026-07-16T10:00:00.000Z";
const USER_ID = "user-assessment";

describe("sportAssessmentService", () => {
  it("calibre les capacites a partir d'une seance d'evaluation", () => {
    const initial = capabilitiesFromDraft(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );
    const calibrated = applyAssessmentResults(
      initial,
      USER_ID,
      {
        upperPush: "too_easy",
        legs: "right",
        core: "too_hard",
        cardio: "discomfort",
      },
      "2026-07-16T10:05:00.000Z",
    );

    expect(
      calibrated.find((item) => item.dimension === "upper_push"),
    ).toMatchObject({ level: 2, source: "calibration" });
    expect(calibrated.find((item) => item.dimension === "legs")).toMatchObject(
      { level: 1, source: "calibration" },
    );
    expect(calibrated.find((item) => item.dimension === "core")).toMatchObject(
      { level: 0, source: "calibration" },
    );
    expect(
      calibrated.find((item) => item.dimension === "cardio_endurance"),
    ).toMatchObject({ level: 0, source: "calibration" });
    expect(hasCompletedSportAssessment(calibrated)).toBe(true);
  });

  it("detecte une evaluation absente", () => {
    const initial = capabilitiesFromDraft(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );

    expect(hasCompletedSportAssessment(initial)).toBe(false);
  });

  it("calibre les capacites depuis les niveaux reussis par variante", () => {
    const initial = capabilitiesFromDraft(
      createDefaultSportOnboardingDraft(),
      NOW,
      USER_ID,
    );
    const calibrated = applyAssessmentLevelResults(
      initial,
      USER_ID,
      {
        upperPush: 3,
        legs: 2,
        core: 1,
        cardio: 0,
      },
      "2026-07-16T10:08:00.000Z",
    );

    expect(
      calibrated.find((item) => item.dimension === "upper_push"),
    ).toMatchObject({ level: 3, source: "calibration" });
    expect(calibrated.find((item) => item.dimension === "legs")).toMatchObject(
      { level: 2, source: "calibration" },
    );
    expect(
      calibrated.find((item) => item.dimension === "posterior_chain"),
    ).toMatchObject({ level: 2, source: "calibration" });
    expect(calibrated.find((item) => item.dimension === "core")).toMatchObject(
      { level: 1, source: "calibration" },
    );
    expect(
      calibrated.find((item) => item.dimension === "cardio_endurance"),
    ).toMatchObject({ level: 0, source: "calibration" });
    expect(hasCompletedSportAssessment(calibrated)).toBe(true);
  });
});
