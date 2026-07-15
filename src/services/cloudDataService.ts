import { createEmptyData, normalizeData } from "@/lib/storage";
import type {
  AppData,
  NonMealMutationDraft,
} from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import {
  deleteMealObservations,
  listMealObservations,
} from "@/services/mealService";
import {
  createProfileIfMissing,
  deleteProfile,
  getProfile,
  patchProfile,
} from "@/services/profileService";
import { deleteWeeklyReports } from "@/services/reportService";
import {
  deleteTobaccoEvents,
  listTobaccoEvents,
  upsertTobaccoEvent,
} from "@/services/tobaccoService";
import {
  deleteWeightEntries,
  listWeightEntries,
  upsertWeightEntry,
} from "@/services/weightService";

export async function loadCloudData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData> {
  const [profile, weights, meals, smokingEntries] = await Promise.all([
    getProfile(supabase, userId),
    listWeightEntries(supabase, userId),
    listMealObservations(supabase, userId),
    listTobaccoEvents(supabase, userId),
  ]);

  return normalizeData({
    profile,
    weights,
    meals,
    activities: [],
    smokingEntries,
  });
}

export async function applyNonMealMutation(
  supabase: AppSupabaseClient,
  userId: string,
  mutation: NonMealMutationDraft,
  signal?: AbortSignal,
): Promise<void> {
  if (mutation.entity === "profile") {
    if (mutation.action === "create") {
      await createProfileIfMissing(
        supabase,
        userId,
        mutation.patch,
        signal,
      );
      return;
    }

    await patchProfile(supabase, userId, mutation.patch, signal);
    return;
  }

  if (mutation.entity === "weight") {
    await upsertWeightEntry(
      supabase,
      userId,
      mutation.payload,
      signal,
    );
    return;
  }

  await upsertTobaccoEvent(
    supabase,
    userId,
    mutation.payload,
    signal,
  );
}

export async function exportCloudData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData> {
  return loadCloudData(supabase, userId);
}

export async function deleteUserApplicationData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData> {
  await Promise.all([
    deleteWeeklyReports(supabase, userId),
    deleteTobaccoEvents(supabase, userId),
    deleteMealObservations(supabase, userId),
    deleteWeightEntries(supabase, userId),
  ]);
  await deleteProfile(supabase, userId);

  return createEmptyData();
}
