import { roundOne } from "@/lib/analytics";
import type {
  ISODate,
  SmokingDayState,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";

export type WeightDraftResult =
  | { entry: WeightEntry; error: null }
  | { entry: null; error: string };

export function weightEntryFromDraft(
  date: ISODate,
  draft: string,
): WeightDraftResult {
  const value = Number(draft.replace(",", "."));

  if (!Number.isFinite(value) || value < 40 || value > 300) {
    return {
      entry: null,
      error: "La mesure doit être comprise entre 40 et 300 kg.",
    };
  }

  return {
    entry: {
      id: createTrackingId("weight"),
      date,
      time: currentTrackingTime(),
      weightKg: roundOne(value),
      createdAt: new Date().toISOString(),
    },
    error: null,
  };
}

export function smokingEntryFromValues(
  date: ISODate,
  state: SmokingDayState,
  note: string,
): SmokingEntry {
  return {
    id: createTrackingId("smoking"),
    date,
    time: currentTrackingTime(),
    state,
    note: note.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

function createTrackingId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentTrackingTime(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
