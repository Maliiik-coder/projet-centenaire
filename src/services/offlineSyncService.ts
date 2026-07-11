import { normalizeData } from "@/lib/storage";
import type { AppData } from "@/lib/types";
import { saveCloudData } from "@/services/cloudDataService";
import type { AppSupabaseClient } from "@/services/serviceTypes";

const PENDING_SYNC_KEY = "projet-centenaire-pending-cloud-sync-v05";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPendingSyncData(): AppData | null {
  if (!isBrowser()) {
    return null;
  }

  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(PENDING_SYNC_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    return normalizeData(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasPendingSyncData(): boolean {
  return getPendingSyncData() !== null;
}

export function storePendingSyncData(data: AppData): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(normalizeData(data)));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearPendingSyncData(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export async function syncPendingLocalData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData | null> {
  const pendingData = getPendingSyncData();

  if (!pendingData) {
    return null;
  }

  await saveCloudData(supabase, userId, pendingData);
  clearPendingSyncData();

  return pendingData;
}
