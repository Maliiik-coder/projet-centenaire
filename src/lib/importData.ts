import {
  dedupeDailyWeights,
  stabilizeSmokingEntries,
} from "@/lib/dataStabilization";
import { mergeMealsByCreatedAt } from "@/lib/mealMutations";
import {
  createProfileMutationDraft,
  createSmokingMutationDraft,
  createWeightMutationDraft,
} from "@/lib/nonMealData";
import {
  normalizeImportedData,
  unwrapImportedPayload,
} from "@/lib/storage";
import { canonicalizeTimestamp } from "@/lib/timestamps";
import type {
  AppData,
  MealEntry,
  NonMealMutationDraft,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";

export type ImportedDataMerge = {
  data: AppData;
  nonMealMutations: NonMealMutationDraft[];
  mealUpserts: MealEntry[];
  recognizedContributionCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareRecency(
  left: { createdAt: string },
  right: { createdAt: string },
): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function selectImportedWeights(
  existing: WeightEntry[],
  imported: WeightEntry[],
): WeightEntry[] {
  const existingByDate = new Map(existing.map((entry) => [entry.date, entry]));

  return imported.filter((entry) => {
    const current = existingByDate.get(entry.date);
    return !current || compareRecency(entry, current) > 0;
  });
}

function selectImportedSmokingEntries(
  existing: SmokingEntry[],
  imported: SmokingEntry[],
): SmokingEntry[] {
  const existingKeys = new Set(
    existing.map((entry) => canonicalizeTimestamp(entry.createdAt)),
  );
  const byKey = new Map<string, SmokingEntry>();

  imported.forEach((entry) => {
    byKey.set(canonicalizeTimestamp(entry.createdAt), entry);
  });
  existing.forEach((entry) => {
    byKey.set(canonicalizeTimestamp(entry.createdAt), entry);
  });

  return stabilizeSmokingEntries([...byKey.values()]).filter(
    (entry) => !existingKeys.has(canonicalizeTimestamp(entry.createdAt)),
  );
}

function selectImportedMeals(
  existing: MealEntry[],
  imported: MealEntry[],
): MealEntry[] {
  const existingKeys = new Set(
    existing.map((meal) => canonicalizeTimestamp(meal.createdAt)),
  );

  return imported.filter(
    (meal) => !existingKeys.has(canonicalizeTimestamp(meal.createdAt)),
  );
}

export function mergeImportedData(
  currentData: AppData,
  importValue: unknown,
): ImportedDataMerge {
  const payload = unwrapImportedPayload(importValue);
  const imported = normalizeImportedData(payload);
  const payloadRecord = isRecord(payload) ? payload : null;
  const profileAccepted =
    !currentData.profile &&
    payloadRecord !== null &&
    "profile" in payloadRecord &&
    imported.profile !== null;
  const weightsAccepted =
    payloadRecord && Array.isArray(payloadRecord.weights)
      ? selectImportedWeights(currentData.weights, imported.weights)
      : [];
  const smokingAccepted =
    payloadRecord && Array.isArray(payloadRecord.smokingEntries)
      ? selectImportedSmokingEntries(
          currentData.smokingEntries,
          imported.smokingEntries,
        )
      : [];
  const mealsAccepted =
    payloadRecord && Array.isArray(payloadRecord.meals)
      ? selectImportedMeals(currentData.meals, imported.meals)
      : [];
  const nonMealMutations: NonMealMutationDraft[] = [
    ...(profileAccepted && imported.profile
      ? [createProfileMutationDraft(imported.profile)]
      : []),
    ...weightsAccepted.map(createWeightMutationDraft),
    ...smokingAccepted.map(createSmokingMutationDraft),
  ];

  return {
    data: {
      profile: currentData.profile ?? (profileAccepted ? imported.profile : null),
      weights: dedupeDailyWeights([...currentData.weights, ...weightsAccepted]),
      meals: mergeMealsByCreatedAt(currentData.meals, mealsAccepted),
      activities: currentData.activities,
      smokingEntries: stabilizeSmokingEntries([
        ...currentData.smokingEntries,
        ...smokingAccepted,
      ]),
    },
    nonMealMutations,
    mealUpserts: mealsAccepted,
    recognizedContributionCount:
      (profileAccepted ? 1 : 0) +
      weightsAccepted.length +
      smokingAccepted.length +
      mealsAccepted.length,
  };
}
