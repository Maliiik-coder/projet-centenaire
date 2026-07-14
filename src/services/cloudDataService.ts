import { calculateWeeklyAnalysis } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import { createEmptyData, normalizeData } from "@/lib/storage";
import type { AppData } from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { deleteMealObservations, listMealObservations, upsertMealObservations } from "@/services/mealService";
import { deleteProfile, getProfile, upsertProfile } from "@/services/profileService";
import { deleteWeeklyReports, upsertWeeklyReport } from "@/services/reportService";
import { deleteTobaccoEvents, listTobaccoEvents, upsertTobaccoEvents } from "@/services/tobaccoService";
import { deleteWeightEntries, listWeightEntries, upsertWeightEntries } from "@/services/weightService";

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

export async function saveCloudData(
  supabase: AppSupabaseClient,
  userId: string,
  data: AppData,
): Promise<void> {
  const normalized = normalizeData(data);

  if (normalized.profile) {
    await upsertProfile(supabase, userId, normalized.profile);
  }

  await Promise.all([
    upsertWeightEntries(supabase, userId, normalized.weights),
    (async () => {
      await deleteMealObservations(supabase, userId);
      await upsertMealObservations(supabase, userId, normalized.meals);
    })(),
    upsertTobaccoEvents(supabase, userId, normalized.smokingEntries),
  ]);

  if (normalized.profile) {
    await upsertWeeklyReport(
      supabase,
      userId,
      calculateWeeklyAnalysis(normalized, todayISO()),
    );
  }
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
