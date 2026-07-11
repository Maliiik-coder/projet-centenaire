import type { SmokingEntry, WeightEntry } from "@/lib/types";

function compareCreatedAtAsc<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export function dedupeDailyWeights(weights: WeightEntry[]): WeightEntry[] {
  const byDate = new Map<string, WeightEntry>();

  [...weights].sort(compareCreatedAtAsc).forEach((entry) => {
    if (!entry.date) {
      return;
    }

    byDate.set(entry.date, entry);
  });

  return [...byDate.values()].sort(compareCreatedAtAsc);
}

export function upsertDailyWeightEntry(
  weights: WeightEntry[],
  entry: WeightEntry,
): WeightEntry[] {
  const existing = dedupeDailyWeights(weights).find(
    (weight) => weight.date === entry.date,
  );

  const officialEntry: WeightEntry = existing
    ? {
        ...entry,
        id: existing.id,
        createdAt: existing.createdAt,
      }
    : entry;

  return dedupeDailyWeights([
    ...weights.filter((weight) => weight.date !== entry.date),
    officialEntry,
  ]);
}

export function stabilizeSmokingEntries(entries: SmokingEntry[]): SmokingEntry[] {
  const eventDates = new Set(
    entries
      .filter((entry) => entry.state === "envie" || entry.state === "cigarette")
      .map((entry) => entry.date),
  );
  const explicitNoneByDate = new Map<string, SmokingEntry>();
  const events: SmokingEntry[] = [];

  [...entries].sort(compareCreatedAtAsc).forEach((entry) => {
    if (!entry.date) {
      return;
    }

    if (entry.state === "aucun") {
      if (!eventDates.has(entry.date)) {
        explicitNoneByDate.set(entry.date, entry);
      }
      return;
    }

    events.push(entry);
  });

  return [...events, ...explicitNoneByDate.values()].sort(compareCreatedAtAsc);
}

export function upsertSmokingEntry(
  entries: SmokingEntry[],
  entry: SmokingEntry,
): SmokingEntry[] {
  return stabilizeSmokingEntries([...entries, entry]);
}
