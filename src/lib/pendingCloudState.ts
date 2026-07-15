import {
  dedupeDailyWeights,
  stabilizeSmokingEntries,
} from "@/lib/dataStabilization";
import { mergeMealsByCreatedAt } from "@/lib/mealMutations";
import { applyProfilePatch } from "@/lib/nonMealData";
import { normalizeData } from "@/lib/storage";
import { canonicalizeTimestamp, tryCanonicalizeTimestamp } from "@/lib/timestamps";
import type {
  AppData,
  SmokingEntry,
  StoredCloudMutation,
} from "@/lib/types";

function mergeSmokingEntries(
  baseEntries: SmokingEntry[],
  pendingEntries: SmokingEntry[],
): SmokingEntry[] {
  const entries = new Map<string, SmokingEntry>();

  [...baseEntries, ...pendingEntries].forEach((entry) => {
    const key = tryCanonicalizeTimestamp(entry.createdAt) ?? entry.id;
    entries.set(key, entry);
  });

  return stabilizeSmokingEntries([...entries.values()]);
}

function sortMutations(mutations: StoredCloudMutation[]): StoredCloudMutation[] {
  return mutations.slice().sort(
    (left, right) =>
      left.queuedAt.localeCompare(right.queuedAt) || left.id.localeCompare(right.id),
  );
}

export function materializePendingCloudState(
  baseData: AppData,
  pendingMutations: StoredCloudMutation[],
): AppData {
  return normalizeData(
    sortMutations(pendingMutations).reduce<AppData>((data, mutation) => {
      if (mutation.kind === "meal") {
        if (mutation.payload.action === "upsert") {
          return {
            ...data,
            meals: mergeMealsByCreatedAt(data.meals, [mutation.payload.payload]),
          };
        }

        const entityKey = canonicalizeTimestamp(mutation.payload.entityKey);
        return {
          ...data,
          meals: data.meals.filter(
            (meal) => canonicalizeTimestamp(meal.createdAt) !== entityKey,
          ),
        };
      }

      const payload = mutation.payload;
      if (payload.entity === "profile") {
        if (payload.action === "create" && data.profile) return data;
        return {
          ...data,
          profile: applyProfilePatch(data.profile, payload.patch),
        };
      }

      if (payload.entity === "weight") {
        return {
          ...data,
          weights: dedupeDailyWeights([
            ...data.weights.filter((entry) => entry.date !== payload.entityKey),
            payload.payload,
          ]),
        };
      }

      return {
        ...data,
        smokingEntries: mergeSmokingEntries(data.smokingEntries, [
          payload.payload,
        ]),
      };
    }, normalizeData(baseData)),
  );
}
