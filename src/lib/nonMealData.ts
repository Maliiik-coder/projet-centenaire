import { normalizeData } from "@/lib/storage";
import { canonicalizeTimestamp } from "@/lib/timestamps";
import type {
  AppData,
  AppDataWithoutMeals,
  NonMealMutationDraft,
  Profile,
  ProfilePatch,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function profileToPatch(profile: Profile): ProfilePatch {
  return {
    firstName: profile.firstName,
    age: profile.age,
    heightCm: profile.heightCm,
    startWeightKg: profile.startWeightKg,
    goalWeightKg: profile.goalWeightKg,
    startDate: profile.startDate,
    initialFriction: profile.initialFriction,
    ...(profile.initialBehaviorAssessment
      ? { initialBehaviorAssessment: profile.initialBehaviorAssessment }
      : {}),
    smokingStatus: profile.smokingStatus,
    smokingGoal: profile.smokingGoal ?? null,
    showActiveMission: profile.showActiveMission,
    darkMode: profile.darkMode,
    weeklyActivityGoal: profile.weeklyActivityGoal,
    createdAt: profile.createdAt,
  };
}

export function buildProfilePatch(
  previous: Profile,
  next: Profile,
): ProfilePatch {
  const patch: ProfilePatch = {};

  if (previous.firstName !== next.firstName) patch.firstName = next.firstName;
  if (previous.age !== next.age) patch.age = next.age;
  if (previous.heightCm !== next.heightCm) patch.heightCm = next.heightCm;
  if (previous.startWeightKg !== next.startWeightKg) {
    patch.startWeightKg = next.startWeightKg;
  }
  if (previous.goalWeightKg !== next.goalWeightKg) {
    patch.goalWeightKg = next.goalWeightKg;
  }
  if (previous.startDate !== next.startDate) patch.startDate = next.startDate;
  if (previous.initialFriction !== next.initialFriction) {
    patch.initialFriction = next.initialFriction;
  }
  if (
    JSON.stringify(previous.initialBehaviorAssessment) !==
    JSON.stringify(next.initialBehaviorAssessment)
  ) {
    patch.initialBehaviorAssessment = next.initialBehaviorAssessment;
  }
  if (previous.smokingStatus !== next.smokingStatus) {
    patch.smokingStatus = next.smokingStatus;
  }
  if (previous.smokingGoal !== next.smokingGoal) {
    patch.smokingGoal = next.smokingGoal ?? null;
  }
  if (previous.showActiveMission !== next.showActiveMission) {
    patch.showActiveMission = next.showActiveMission;
  }
  if (previous.darkMode !== next.darkMode) patch.darkMode = next.darkMode;
  if (previous.weeklyActivityGoal !== next.weeklyActivityGoal) {
    patch.weeklyActivityGoal = next.weeklyActivityGoal;
  }
  if (previous.createdAt !== next.createdAt) patch.createdAt = next.createdAt;

  return patch;
}

export function hasProfilePatch(patch: ProfilePatch): boolean {
  return Object.keys(patch).length > 0;
}

export function normalizeProfilePatch(value: unknown): ProfilePatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const normalized = normalizeData({ profile: value }).profile;
  if (!normalized) {
    return null;
  }

  const patch: ProfilePatch = {};
  const assign = <K extends keyof ProfilePatch>(key: K, nextValue: ProfilePatch[K]) => {
    Object.assign(patch, { [key]: nextValue });
  };

  if (hasOwn(value, "firstName") && typeof value.firstName === "string") {
    assign("firstName", normalized.firstName);
  }
  if (hasOwn(value, "age") && typeof value.age === "number") {
    assign("age", normalized.age);
  }
  if (hasOwn(value, "heightCm") && typeof value.heightCm === "number") {
    assign("heightCm", normalized.heightCm);
  }
  if (hasOwn(value, "startWeightKg") && typeof value.startWeightKg === "number") {
    assign("startWeightKg", normalized.startWeightKg);
  }
  if (hasOwn(value, "goalWeightKg") && typeof value.goalWeightKg === "number") {
    assign("goalWeightKg", normalized.goalWeightKg);
  }
  if (hasOwn(value, "startDate") && typeof value.startDate === "string") {
    assign("startDate", normalized.startDate);
  }
  if (hasOwn(value, "initialFriction")) {
    assign("initialFriction", normalized.initialFriction);
  }
  if (
    hasOwn(value, "initialBehaviorAssessment") &&
    normalized.initialBehaviorAssessment
  ) {
    assign(
      "initialBehaviorAssessment",
      normalized.initialBehaviorAssessment,
    );
  }
  if (hasOwn(value, "smokingStatus")) {
    assign("smokingStatus", normalized.smokingStatus);
  }
  if (hasOwn(value, "smokingGoal")) {
    if (value.smokingGoal === null) {
      assign("smokingGoal", null);
    } else if (normalized.smokingGoal) {
      assign("smokingGoal", normalized.smokingGoal);
    }
  }
  if (
    hasOwn(value, "showActiveMission") &&
    typeof value.showActiveMission === "boolean"
  ) {
    assign("showActiveMission", normalized.showActiveMission);
  }
  if (hasOwn(value, "darkMode") && typeof value.darkMode === "boolean") {
    assign("darkMode", normalized.darkMode);
  }
  if (
    hasOwn(value, "weeklyActivityGoal") &&
    typeof value.weeklyActivityGoal === "number"
  ) {
    assign("weeklyActivityGoal", normalized.weeklyActivityGoal);
  }
  if (hasOwn(value, "createdAt") && typeof value.createdAt === "string") {
    assign("createdAt", normalized.createdAt);
  }

  return hasProfilePatch(patch) ? patch : null;
}

export function applyProfilePatch(
  profile: Profile | null,
  patch: ProfilePatch,
): Profile | null {
  const smokingGoal = hasOwn(patch, "smokingGoal")
    ? patch.smokingGoal ?? undefined
    : profile?.smokingGoal;
  return normalizeData({
    profile: {
      ...profile,
      ...patch,
      smokingGoal,
    },
  }).profile;
}

export function createProfileMutationDraft(
  profile: Profile,
): NonMealMutationDraft {
  return {
    entity: "profile",
    action: "create",
    entityKey: "profile",
    patch: profileToPatch(profile),
  };
}

export function createProfilePatchMutationDraft(
  patch: ProfilePatch,
): NonMealMutationDraft | null {
  return hasProfilePatch(patch)
    ? {
        entity: "profile",
        action: "patch",
        entityKey: "profile",
        patch,
      }
    : null;
}

export function createWeightMutationDraft(
  entry: WeightEntry,
): NonMealMutationDraft {
  return {
    entity: "weight",
    action: "upsert",
    entityKey: entry.date,
    payload: entry,
  };
}

export function createSmokingMutationDraft(
  entry: SmokingEntry,
): NonMealMutationDraft {
  const createdAt = canonicalizeTimestamp(entry.createdAt);

  return {
    entity: "smoking",
    action: "upsert",
    entityKey: createdAt,
    payload: { ...entry, createdAt },
  };
}

export function toAppDataWithoutMeals(data: AppData): AppDataWithoutMeals {
  const normalized = normalizeData(data);

  return {
    profile: normalized.profile,
    weights: normalized.weights,
    activities: normalized.activities,
    smokingEntries: normalized.smokingEntries,
  };
}

export function normalizeAppDataWithoutMeals(
  value: unknown,
): AppDataWithoutMeals {
  return toAppDataWithoutMeals(normalizeData(value));
}

export function normalizeDirtyDomains(value: unknown): {
  profile: boolean;
  weights: boolean;
  smokingEntries: boolean;
} {
  if (!isRecord(value)) {
    return { profile: false, weights: false, smokingEntries: false };
  }

  return {
    profile: value.profile === true,
    weights: value.weights === true,
    smokingEntries: value.smokingEntries === true,
  };
}
