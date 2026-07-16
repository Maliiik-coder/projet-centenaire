import { SPORT_LOCAL_STORAGE_KEY } from "@/lib/sport/config";
import type { SportGoal, SportLocalData, SportProfile } from "@/lib/sport/types";
import { createEmptySportData } from "@/services/sport/sportProfileService";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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

export function loadSportLocalData(): SportLocalData {
  if (!isBrowser()) {
    return createEmptySportData();
  }

  const raw = window.localStorage.getItem(SPORT_LOCAL_STORAGE_KEY);
  if (!raw) {
    return createEmptySportData();
  }

  try {
    return normalizeSportData(JSON.parse(raw));
  } catch {
    return createEmptySportData();
  }
}

export function saveSportLocalData(data: SportLocalData): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SPORT_LOCAL_STORAGE_KEY, JSON.stringify(data));
}

export function clearSportLocalData(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SPORT_LOCAL_STORAGE_KEY);
}
