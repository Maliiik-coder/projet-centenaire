import type { Database } from "@/lib/supabase/database.types";
import { dedupeDailyWeights } from "@/lib/dataStabilization";
import type { WeightEntry } from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type WeightRow = Database["public"]["Tables"]["weight_entries"]["Row"];

function timeFromTimestamp(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function fromWeightRow(row: WeightRow): WeightEntry {
  return {
    id: row.id,
    date: row.entry_date,
    time: timeFromTimestamp(row.created_at),
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
  };
}

export async function listWeightEntries(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  throwIfSupabaseError(error);

  return (data ?? []).map(fromWeightRow);
}

export async function upsertWeightEntries(
  supabase: AppSupabaseClient,
  userId: string,
  weights: WeightEntry[],
): Promise<void> {
  if (weights.length === 0) {
    return;
  }

  const { error } = await supabase.from("weight_entries").upsert(
    dedupeDailyWeights(weights).map((entry) => ({
      user_id: userId,
      entry_date: entry.date,
      weight_kg: entry.weightKg,
      created_at: entry.createdAt,
    })),
    { onConflict: "user_id,entry_date" },
  );

  throwIfSupabaseError(error);
}

export async function upsertWeightEntry(
  supabase: AppSupabaseClient,
  userId: string,
  entry: WeightEntry,
  signal?: AbortSignal,
): Promise<void> {
  const query = supabase.from("weight_entries").upsert(
    {
      user_id: userId,
      entry_date: entry.date,
      weight_kg: entry.weightKg,
      created_at: entry.createdAt,
    },
    { onConflict: "user_id,entry_date" },
  );
  const { error } = signal ? await query.abortSignal(signal) : await query;

  throwIfSupabaseError(error);
}

export async function deleteWeightEntries(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("user_id", userId);

  throwIfSupabaseError(error);
}
