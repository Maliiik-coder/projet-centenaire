import {
  SPORT_LOCAL_STORAGE_KEY,
  SPORT_SCOPED_LOCAL_STORAGE_PREFIX,
} from "@/lib/sport/config";
import type { SportGoal, SportLocalData, SportProfile } from "@/lib/sport/types";
import { createEmptySportData } from "@/services/sport/sportProfileService";

export type SportStorageScope =
  | { kind: "guest" }
  | { kind: "user"; userId: string };

type SportLocalDataEnvelope = {
  version: 1;
  ownerUserId: string | null;
  updatedAt: string;
  data: SportLocalData;
};

export const guestSportStorageScope: SportStorageScope = { kind: "guest" };

export function userSportStorageScope(userId: string): SportStorageScope {
  return { kind: "user", userId };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getLocalStorage(): Storage | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSportData(value: unknown): SportLocalData {
  if (!isRecord(value)) {
    return createEmptySportData();
  }

  return {
    profile: normalizeProfile(value.profile),
    equipment: Array.isArray(value.equipment)
      ? (value.equipment as SportLocalData["equipment"])
      : [],
    limitations: Array.isArray(value.limitations)
      ? (value.limitations as SportLocalData["limitations"])
      : [],
    capabilities: Array.isArray(value.capabilities)
      ? (value.capabilities as SportLocalData["capabilities"])
      : [],
    sessions: Array.isArray(value.sessions)
      ? (value.sessions as SportLocalData["sessions"])
      : [],
    feedback: Array.isArray(value.feedback)
      ? (value.feedback as SportLocalData["feedback"])
      : [],
  };
}

function normalizeGoals(value: Record<string, unknown>): SportGoal[] {
  if (Array.isArray(value.goals)) {
    return value.goals.filter((goal): goal is SportGoal =>
      goal === "restart_activity" ||
      goal === "support_weight_loss" ||
      goal === "improve_endurance" ||
      goal === "build_strength" ||
      goal === "general_conditioning",
    );
  }

  const legacyGoal = value.goal;
  return legacyGoal === "restart_activity" ||
    legacyGoal === "support_weight_loss" ||
    legacyGoal === "improve_endurance" ||
    legacyGoal === "build_strength" ||
    legacyGoal === "general_conditioning"
    ? [legacyGoal]
    : [];
}

function normalizeProfile(value: unknown): SportProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    ...(value as unknown as SportProfile),
    goals: normalizeGoals(value),
  };
}

function storageKey(scope: SportStorageScope): string {
  return scope.kind === "guest"
    ? `${SPORT_SCOPED_LOCAL_STORAGE_PREFIX}:guest`
    : `${SPORT_SCOPED_LOCAL_STORAGE_PREFIX}:user:${encodeURIComponent(scope.userId)}`;
}

function ownerUserId(scope: SportStorageScope): string | null {
  return scope.kind === "user" ? scope.userId : null;
}

function normalizeEnvelope(
  value: unknown,
  scope: SportStorageScope,
): SportLocalData | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.data)) {
    return null;
  }

  if (value.ownerUserId !== ownerUserId(scope)) {
    return null;
  }

  return normalizeSportData(value.data);
}

export function loadSportLocalData(scope: SportStorageScope): SportLocalData {
  const storage = getLocalStorage();
  if (!storage) {
    return createEmptySportData();
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(storageKey(scope));
  } catch {
    return createEmptySportData();
  }

  if (!raw) {
    return createEmptySportData();
  }

  try {
    return normalizeEnvelope(JSON.parse(raw), scope) ?? createEmptySportData();
  } catch {
    return createEmptySportData();
  }
}

export function saveSportLocalData(
  scope: SportStorageScope,
  data: SportLocalData,
): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const envelope: SportLocalDataEnvelope = {
      version: 1,
      ownerUserId: ownerUserId(scope),
      updatedAt: new Date().toISOString(),
      data,
    };
    storage.setItem(storageKey(scope), JSON.stringify(envelope));
  } catch {
    // The Sport slice remains usable even when browser storage is unavailable.
  }
}

export function clearSportLocalData(scope: SportStorageScope): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(storageKey(scope));
  } catch {
    // Clearing is best-effort for the isolated local mirror.
  }
}

export function loadLegacySportLocalData(): SportLocalData | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SPORT_LOCAL_STORAGE_KEY);
    return raw ? normalizeSportData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
