import { localDataStore, normalizeData } from "@/lib/storage";
import type { AppData } from "@/lib/types";
import { loadCloudData, saveCloudData } from "@/services/cloudDataService";
import type { AppSupabaseClient } from "@/services/serviceTypes";

export function hasLocalData(data: AppData): boolean {
  return Boolean(
    data.profile ||
      data.weights.length > 0 ||
      data.meals.length > 0 ||
      data.smokingEntries.length > 0,
  );
}

export async function migrateLocalDataToSupabase(
  supabase: AppSupabaseClient,
  userId: string,
  localData: AppData = localDataStore.load(),
  options: { clearLocalAfter?: boolean } = {},
): Promise<AppData> {
  const normalized = normalizeData(localData);

  if (!hasLocalData(normalized)) {
    return loadCloudData(supabase, userId);
  }

  await saveCloudData(supabase, userId, normalized);

  if (options.clearLocalAfter !== false) {
    localDataStore.reset();
  }

  return loadCloudData(supabase, userId);
}
