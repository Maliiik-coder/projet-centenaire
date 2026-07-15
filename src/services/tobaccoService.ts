import type { Database } from "@/lib/supabase/database.types";
import { stabilizeSmokingEntries } from "@/lib/dataStabilization";
import type { SmokingDayState, SmokingEntry } from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type TobaccoRow = Database["public"]["Tables"]["tobacco_events"]["Row"];

function timeFromTimestamp(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeState(value: string): SmokingDayState {
  return value === "aucun" || value === "envie" || value === "cigarette"
    ? value
    : "aucun";
}

function fromTobaccoRow(row: TobaccoRow): SmokingEntry {
  return {
    id: row.id,
    date: row.event_date,
    time: timeFromTimestamp(row.created_at),
    state: normalizeState(row.event_type),
    note: row.trigger ?? row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listTobaccoEvents(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<SmokingEntry[]> {
  const { data, error } = await supabase
    .from("tobacco_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  throwIfSupabaseError(error);

  return (data ?? []).map(fromTobaccoRow);
}

export async function upsertTobaccoEvents(
  supabase: AppSupabaseClient,
  userId: string,
  entries: SmokingEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const stabilizedEntries = stabilizeSmokingEntries(entries);
  const datesToReplaceExplicitNone = [
    ...new Set(entries.map((entry) => entry.date).filter(Boolean)),
  ];

  if (datesToReplaceExplicitNone.length > 0) {
    const { error: deleteExplicitNoneError } = await supabase
      .from("tobacco_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_type", "aucun")
      .in("event_date", datesToReplaceExplicitNone);

    throwIfSupabaseError(deleteExplicitNoneError);
  }

  if (stabilizedEntries.length === 0) {
    return;
  }

  const { error } = await supabase.from("tobacco_events").upsert(
    stabilizedEntries.map((entry) => ({
      user_id: userId,
      event_date: entry.date,
      event_type: entry.state,
      trigger: entry.note ?? null,
      note: entry.note ?? null,
      created_at: entry.createdAt,
    })),
    { onConflict: "user_id,created_at" },
  );

  throwIfSupabaseError(error);
}

export async function upsertTobaccoEvent(
  supabase: AppSupabaseClient,
  userId: string,
  entry: SmokingEntry,
  signal?: AbortSignal,
): Promise<void> {
  if (entry.state === "aucun") {
    const readQuery = supabase
      .from("tobacco_events")
      .select("event_type")
      .eq("user_id", userId)
      .eq("event_date", entry.date);
    const { data: existingEvents, error: readError } = signal
      ? await readQuery.abortSignal(signal)
      : await readQuery;

    throwIfSupabaseError(readError);

    const hasActualEvent = (existingEvents ?? []).some(
      (event) => event.event_type === "envie" || event.event_type === "cigarette",
    );

    if (hasActualEvent) {
      return;
    }
  }

  const deleteQuery = supabase
    .from("tobacco_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_type", "aucun")
    .eq("event_date", entry.date);
  const { error: deleteExplicitNoneError } = signal
    ? await deleteQuery.abortSignal(signal)
    : await deleteQuery;

  throwIfSupabaseError(deleteExplicitNoneError);

  const upsertQuery = supabase.from("tobacco_events").upsert(
    {
      user_id: userId,
      event_date: entry.date,
      event_type: entry.state,
      trigger: entry.note ?? null,
      note: entry.note ?? null,
      created_at: entry.createdAt,
    },
    { onConflict: "user_id,created_at" },
  );
  const { error } = signal
    ? await upsertQuery.abortSignal(signal)
    : await upsertQuery;

  throwIfSupabaseError(error);
}

export async function deleteTobaccoEvents(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("tobacco_events")
    .delete()
    .eq("user_id", userId);

  throwIfSupabaseError(error);
}
