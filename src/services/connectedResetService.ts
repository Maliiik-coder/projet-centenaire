import {
  localDataStore,
  userStorageScope,
} from "@/lib/storage";
import type { AppData } from "@/lib/types";
import { withUserCloudLock } from "@/lib/userCloudLock";
import { loadCloudData } from "@/services/cloudDataService";
import { clearMigrationOperationDuringConnectedReset } from "@/services/localMigrationService";
import {
  rotatePendingGeneration,
  waitForCloudWorkToSettle,
} from "@/services/offlineSyncService";
import type { AppSupabaseClient } from "@/services/serviceTypes";

export async function resetConnectedLocalData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData> {
  try {
    await waitForCloudWorkToSettle(userId);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    // An explicit reset abandons a failed queued attempt before clearing it.
  }

  return withUserCloudLock(userId, async (handle) => {
    const scope = userStorageScope(userId);

    await handle.assertOwned();
    await rotatePendingGeneration(userId);
    localDataStore.reset(scope);
    clearMigrationOperationDuringConnectedReset(userId);

    const cloudData = await loadCloudData(supabase, userId);
    localDataStore.save(scope, cloudData);
    return cloudData;
  });
}
