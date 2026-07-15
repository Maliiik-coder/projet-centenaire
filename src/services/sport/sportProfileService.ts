import { SPORT_LOCAL_USER_ID } from "@/lib/sport/config";
import type {
  CapabilityDimension,
  CapabilityLevel,
  EquipmentType,
  LimitationKind,
  SportLocalData,
  SportOnboardingDraft,
  SportProfile,
  UserCapability,
  UserEquipment,
  UserLimitation,
} from "@/lib/sport/types";

function idFor(prefix: string, userId: string, key: string): string {
  return `${prefix}-${userId}-${key}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function createEmptySportData(): SportLocalData {
  return {
    profile: null,
    equipment: [],
    limitations: [],
    capabilities: [],
    sessions: [],
    feedback: [],
  };
}

export function createDefaultSportOnboardingDraft(): SportOnboardingDraft {
  return {
    goal: "restart_activity",
    preferredActivities: ["strength"],
    usualDurationMinutes: 15,
    desiredFrequency: "twice_weekly",
    availableLocations: ["home"],
    equipment: ["none"],
    limitationKind: "none",
    limitationZone: null,
    limitationDescription: "",
    pushCapability: 0,
    pullCapability: null,
    legsCapability: 1,
    coreCapability: 0,
  };
}

export function createSportProfile(
  draft: SportOnboardingDraft,
  now: string,
  userId = SPORT_LOCAL_USER_ID,
): SportProfile {
  return {
    id: idFor("sport-profile", userId, "profile"),
    userId,
    goal: draft.goal,
    preferredActivities: [...draft.preferredActivities],
    desiredFrequency: draft.desiredFrequency,
    usualDurationMinutes: draft.usualDurationMinutes,
    availableLocations: [...draft.availableLocations],
    questionnaireCompleted: true,
    createdAt: now,
    updatedAt: now,
    walkRunReadiness: {
      comfortableWalkMinutes: null,
      canRunShortBursts: false,
      runsRegularly: false,
      prefersWalkOnly: draft.preferredActivities.includes("walk") &&
        !draft.preferredActivities.includes("run"),
    },
    swimReadiness: {
      hasPoolAccess: draft.availableLocations.includes("pool"),
      poolLengthMeters: null,
      knownStrokes: [],
      continuousDistanceMeters: null,
      waterConfidence: null,
      supervisedOnly: false,
    },
  };
}

export function updateSportProfile(
  profile: SportProfile,
  patch: Partial<
    Pick<
      SportProfile,
      | "goal"
      | "preferredActivities"
      | "desiredFrequency"
      | "usualDurationMinutes"
      | "availableLocations"
      | "questionnaireCompleted"
    >
  >,
  now: string,
): SportProfile {
  return {
    ...profile,
    ...patch,
    preferredActivities:
      patch.preferredActivities ?? profile.preferredActivities,
    availableLocations: patch.availableLocations ?? profile.availableLocations,
    updatedAt: now,
  };
}

export function upsertEquipment(
  equipment: UserEquipment[],
  userId: string,
  type: EquipmentType,
  available: boolean,
  now: string,
  details: string | null = null,
): UserEquipment[] {
  const existing = equipment.find((item) => item.type === type);
  const next: UserEquipment = {
    id: existing?.id ?? idFor("sport-equipment", userId, type),
    userId,
    type,
    available,
    details,
    updatedAt: now,
  };

  return [...equipment.filter((item) => item.type !== type), next].sort((a, b) =>
    a.type.localeCompare(b.type),
  );
}

export function equipmentFromDraft(
  draft: SportOnboardingDraft,
  now: string,
  userId = SPORT_LOCAL_USER_ID,
): UserEquipment[] {
  const selected = new Set<EquipmentType>(["none", ...draft.equipment]);
  const allTypes: EquipmentType[] = [
    "none",
    "mat",
    "stable_chair",
    "resistance_band",
    "dumbbells",
    "pull_up_bar",
    "gym_equipment",
    "kickboard",
    "pull_buoy",
    "fins",
  ];

  return allTypes.map((type) => ({
    id: idFor("sport-equipment", userId, type),
    userId,
    type,
    available: selected.has(type),
    details: null,
    updatedAt: now,
  }));
}

export function limitationsFromDraft(
  draft: SportOnboardingDraft,
  now: string,
  userId = SPORT_LOCAL_USER_ID,
): UserLimitation[] {
  if (draft.limitationKind === "none") {
    return [];
  }

  return [
    {
      id: idFor(
        "sport-limitation",
        userId,
        `${draft.limitationKind}-${draft.limitationZone ?? "unknown"}`,
      ),
      userId,
      kind: draft.limitationKind,
      zone: draft.limitationZone,
      description: draft.limitationDescription.trim() || null,
      active: true,
      declaredAt: now,
      resolvedAt: null,
    },
  ];
}

export function upsertLimitation(
  limitations: UserLimitation[],
  userId: string,
  kind: LimitationKind,
  zone: UserLimitation["zone"],
  active: boolean,
  now: string,
  description: string | null = null,
): UserLimitation[] {
  const key = `${kind}-${zone ?? "unknown"}`;
  const existing = limitations.find(
    (item) => item.kind === kind && item.zone === zone,
  );
  const next: UserLimitation = {
    id: existing?.id ?? idFor("sport-limitation", userId, key),
    userId,
    kind,
    zone,
    description,
    active,
    declaredAt: existing?.declaredAt ?? now,
    resolvedAt: active ? null : now,
  };

  return [...limitations.filter((item) => item.id !== next.id), next];
}

function capability(
  userId: string,
  dimension: CapabilityDimension,
  level: CapabilityLevel,
  now: string,
): UserCapability {
  return {
    id: idFor("sport-capability", userId, dimension),
    userId,
    dimension,
    level,
    source: "initial_declaration",
    updatedAt: now,
  };
}

export function capabilitiesFromDraft(
  draft: SportOnboardingDraft,
  now: string,
  userId = SPORT_LOCAL_USER_ID,
): UserCapability[] {
  const capabilities = [
    capability(userId, "upper_push", draft.pushCapability, now),
    capability(userId, "legs", draft.legsCapability, now),
    capability(userId, "posterior_chain", draft.legsCapability, now),
    capability(userId, "core", draft.coreCapability, now),
    capability(userId, "mobility", 1, now),
    capability(userId, "cardio_endurance", 1, now),
    capability(userId, "swimming", 0, now),
  ];

  if (draft.pullCapability !== null) {
    capabilities.push(
      capability(userId, "upper_pull", draft.pullCapability, now),
    );
  }

  return capabilities;
}

export function upsertCapability(
  capabilities: UserCapability[],
  userId: string,
  dimension: CapabilityDimension,
  level: CapabilityLevel,
  now: string,
  source: UserCapability["source"] = "manual_adjustment",
): UserCapability[] {
  const existing = capabilities.find((item) => item.dimension === dimension);
  const next: UserCapability = {
    id: existing?.id ?? idFor("sport-capability", userId, dimension),
    userId,
    dimension,
    level,
    source,
    updatedAt: now,
  };

  return [
    ...capabilities.filter((item) => item.dimension !== dimension),
    next,
  ].sort((a, b) => a.dimension.localeCompare(b.dimension));
}

export function createSportDataFromDraft(
  draft: SportOnboardingDraft,
  now: string,
  userId = SPORT_LOCAL_USER_ID,
): SportLocalData {
  return {
    profile: createSportProfile(draft, now, userId),
    equipment: equipmentFromDraft(draft, now, userId),
    limitations: limitationsFromDraft(draft, now, userId),
    capabilities: capabilitiesFromDraft(draft, now, userId),
    sessions: [],
    feedback: [],
  };
}
