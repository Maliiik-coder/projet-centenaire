import type {
  AssessmentFeeling,
  CapabilityLevel,
  SportAssessmentResults,
  UserCapability,
} from "@/lib/sport/types";
import { upsertCapability } from "@/services/sport/sportProfileService";

function levelFromFeeling(feeling: AssessmentFeeling): CapabilityLevel {
  if (feeling === "too_easy") {
    return 2;
  }

  if (feeling === "right") {
    return 1;
  }

  return 0;
}

export function applyAssessmentResults(
  capabilities: UserCapability[],
  userId: string,
  results: SportAssessmentResults,
  now: string,
): UserCapability[] {
  let next = capabilities;

  next = upsertCapability(
    next,
    userId,
    "upper_push",
    levelFromFeeling(results.upperPush),
    now,
    "calibration",
  );
  next = upsertCapability(
    next,
    userId,
    "legs",
    levelFromFeeling(results.legs),
    now,
    "calibration",
  );
  next = upsertCapability(
    next,
    userId,
    "posterior_chain",
    levelFromFeeling(results.legs),
    now,
    "calibration",
  );
  next = upsertCapability(
    next,
    userId,
    "core",
    levelFromFeeling(results.core),
    now,
    "calibration",
  );
  next = upsertCapability(
    next,
    userId,
    "cardio_endurance",
    levelFromFeeling(results.cardio),
    now,
    "calibration",
  );

  return next;
}

export function hasCompletedSportAssessment(
  capabilities: UserCapability[],
): boolean {
  return capabilities.some((capability) => capability.source === "calibration");
}
