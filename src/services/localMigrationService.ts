import {
  dedupeDailyWeights,
  stabilizeSmokingEntries,
} from "@/lib/dataStabilization";
import { validateImportedPayload } from "@/lib/dataValidation";
import { mergeMealsByCreatedAt } from "@/lib/mealMutations";
import {
  createProfileMutationDraft,
  createSmokingMutationDraft,
  createWeightMutationDraft,
  normalizeAppDataWithoutMeals,
  normalizeProfilePatch,
} from "@/lib/nonMealData";
import { normalizeData } from "@/lib/storage";
import {
  canonicalizeTimestamp,
  tryCanonicalizeTimestamp,
} from "@/lib/timestamps";
import type {
  ActivityEntry,
  AppData,
  MealEntry,
  NonMealMutationDraft,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";
import {
  applyNonMealMutation,
  loadCloudData,
} from "@/services/cloudDataService";
import { upsertMealObservation } from "@/services/mealService";
import {
  hasPendingCloudWork,
  processPendingCloudWork,
} from "@/services/offlineSyncService";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import {
  runCloudMutationWithTimeout,
  withUserCloudLock,
} from "@/lib/userCloudLock";

const MIGRATION_OPERATION_KEY_PREFIX = "projet-centenaire-migration-operation-v1";

export type CloudStatus =
  | "not-configured"
  | "loading"
  | "ready"
  | "unavailable";

export type MigrationSource = "guest" | "legacy";

export type LocalMigrationSources = Record<MigrationSource, AppData | null>;

export type LocalMigrationCandidate = {
  source: MigrationSource;
  data: AppData;
};

export type MigrationNonMealMutation = NonMealMutationDraft;

export type MigrationPlan = {
  nonMealMutations: MigrationNonMealMutation[];
  mealUpserts: MealEntry[];
};

export type MigrationOperation = {
  version: 4;
  operationId: string;
  ownerUserId: string;
  revision: number;
  source: MigrationSource;
  status: "prepared" | "claiming" | "started" | "retry-required";
  executionOrigin: "initial" | "resume";
  sourceData: AppData;
  remainingNonMealMutations: MigrationNonMealMutation[];
  remainingMealUpserts: MealEntry[];
  createdAt: string;
  updatedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrationOperationKey(userId: string): string {
  return `${MIGRATION_OPERATION_KEY_PREFIX}:user:${encodeURIComponent(userId)}`;
}

function createOperationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `migration-${crypto.randomUUID()}`;
  }

  return `migration-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function stableTimestampKey(entry: { createdAt: string; id: string }): string {
  return tryCanonicalizeTimestamp(entry.createdAt) ?? entry.id;
}

function compareEntryRecency(
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

export function hasLocalData(data: AppData): boolean {
  return Boolean(
    data.profile ||
      data.weights.length > 0 ||
      data.meals.length > 0 ||
      data.smokingEntries.length > 0,
  );
}

export function createLocalMigrationSources(
  guestData: AppData,
  legacyData: AppData | null,
): LocalMigrationSources {
  return {
    guest: hasLocalData(guestData) ? normalizeData(guestData) : null,
    legacy:
      legacyData && hasLocalData(legacyData)
        ? normalizeData(legacyData)
        : null,
  };
}

export function getLocalMigrationCandidate(
  sources: LocalMigrationSources,
  preferredSource?: MigrationSource,
): LocalMigrationCandidate | null {
  if (preferredSource && sources[preferredSource]) {
    return { source: preferredSource, data: sources[preferredSource] };
  }

  if (sources.legacy) {
    return { source: "legacy", data: sources.legacy };
  }

  if (sources.guest) {
    return { source: "guest", data: sources.guest };
  }

  return null;
}

export function isMigrationDecisionRequired(
  cloudStatus: CloudStatus,
  candidate: LocalMigrationCandidate | null,
  operation: MigrationOperation | null = null,
): boolean {
  return operation !== null || (cloudStatus === "ready" && candidate !== null);
}

export function canAttemptAutomaticCloudWrite(
  cloudStatus: CloudStatus,
  migrationDecisionRequired: boolean,
): boolean {
  return cloudStatus === "ready" && !migrationDecisionRequired;
}

function mergeStableEntries<T extends { createdAt: string; id: string }>(
  localEntries: T[],
  cloudEntries: T[],
): T[] {
  const entriesByKey = new Map<string, T>();

  localEntries.forEach((entry) => {
    entriesByKey.set(stableTimestampKey(entry), entry);
  });
  cloudEntries.forEach((entry) => {
    entriesByKey.set(stableTimestampKey(entry), entry);
  });

  return [...entriesByKey.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

function mergeActivities(
  localEntries: ActivityEntry[],
  cloudEntries: ActivityEntry[],
): ActivityEntry[] {
  return mergeStableEntries(localEntries, cloudEntries);
}

export function mergeLocalAndCloudData(
  localData: AppData,
  cloudData: AppData,
): AppData {
  const local = normalizeData(localData);
  const cloud = normalizeData(cloudData);

  return normalizeData({
    profile: cloud.profile ?? local.profile,
    weights: dedupeDailyWeights([...local.weights, ...cloud.weights]),
    meals: mergeMealsByCreatedAt(local.meals, cloud.meals),
    activities: mergeActivities(local.activities, cloud.activities),
    smokingEntries: stabilizeSmokingEntries(
      mergeStableEntries(local.smokingEntries, cloud.smokingEntries),
    ),
  });
}

function selectWeightContributions(
  localWeights: WeightEntry[],
  cloudWeights: WeightEntry[],
): WeightEntry[] {
  const cloudByDate = new Map(cloudWeights.map((entry) => [entry.date, entry]));

  return localWeights.filter((localEntry) => {
    const cloudEntry = cloudByDate.get(localEntry.date);
    return !cloudEntry || compareEntryRecency(localEntry, cloudEntry) > 0;
  });
}

function selectSmokingContributions(
  localEntries: SmokingEntry[],
  cloudEntries: SmokingEntry[],
): SmokingEntry[] {
  const cloudKeys = new Set(cloudEntries.map(stableTimestampKey));
  const stabilized = stabilizeSmokingEntries([...localEntries, ...cloudEntries]);

  return stabilized.filter((entry) => !cloudKeys.has(stableTimestampKey(entry)));
}

export function buildMigrationPlan(
  localData: AppData,
  freshCloudData: AppData,
): MigrationPlan {
  const local = normalizeData(localData);
  const cloud = normalizeData(freshCloudData);
  const cloudMealKeys = new Set(
    cloud.meals.map((meal) => canonicalizeTimestamp(meal.createdAt)),
  );

  return {
    nonMealMutations: [
      ...(!cloud.profile && local.profile
        ? [createProfileMutationDraft(local.profile)]
        : []),
      ...selectWeightContributions(local.weights, cloud.weights).map(
        createWeightMutationDraft,
      ),
      ...selectSmokingContributions(
        local.smokingEntries,
        cloud.smokingEntries,
      ).map(createSmokingMutationDraft),
    ],
    mealUpserts: local.meals.filter(
      (meal) => !cloudMealKeys.has(canonicalizeTimestamp(meal.createdAt)),
    ),
  };
}

function normalizeMigrationMutations(
  value: unknown,
): MigrationNonMealMutation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const mutations: MigrationNonMealMutation[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    if (
      item.entity === "profile" &&
      (item.action === "create" || item.action === "patch") &&
      item.entityKey === "profile"
    ) {
      const patch = normalizeProfilePatch(item.patch);
      if (!patch) {
        return null;
      }
      mutations.push({
        entity: "profile",
        action: item.action,
        entityKey: "profile",
        patch,
      });
      continue;
    }

    if (item.entity === "weight" && item.action === "upsert") {
      const [entry] = normalizeData({ weights: [item.payload] }).weights;
      if (!entry || entry.date !== item.entityKey) {
        return null;
      }
      mutations.push(createWeightMutationDraft(entry));
      continue;
    }

    if (item.entity === "smoking" && item.action === "upsert") {
      const [entry] = normalizeData({ smokingEntries: [item.payload] })
        .smokingEntries;
      if (!entry) {
        return null;
      }
      const mutation = createSmokingMutationDraft(entry);
      if (mutation.entityKey !== item.entityKey) {
        return null;
      }
      mutations.push(mutation);
      continue;
    }

    return null;
  }

  return mutations;
}

function normalizeMealUpserts(value: unknown): MealEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const meals = normalizeData({ meals: value }).meals;
  return meals.length === value.length ? meals : null;
}

function legacyPlanToV3(
  value: Record<string, unknown>,
): MigrationPlan | null {
  if (!isRecord(value.plan)) {
    return null;
  }

  const mealUpserts = normalizeMealUpserts(value.plan.mealUpserts);
  if (!mealUpserts) {
    return null;
  }

  const nonMeal = normalizeAppDataWithoutMeals(value.plan.nonMealData);

  return {
    nonMealMutations: [
      ...(nonMeal.profile
        ? [createProfileMutationDraft(nonMeal.profile)]
        : []),
      ...nonMeal.weights.map(createWeightMutationDraft),
      ...nonMeal.smokingEntries.map(createSmokingMutationDraft),
    ],
    mealUpserts,
  };
}

function normalizeMigrationOperation(
  value: unknown,
  userId: string,
): MigrationOperation | null {
  if (
    !isRecord(value) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4) ||
    value.ownerUserId !== userId ||
    typeof value.operationId !== "string" ||
    (value.source !== "guest" && value.source !== "legacy") ||
    (value.status !== "prepared" &&
      value.status !== "claiming" &&
      value.status !== "started" &&
      value.status !== "retry-required") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const sourceData =
    value.version === 1
      ? normalizeData({
          ...normalizeAppDataWithoutMeals(
            isRecord(value.plan) ? value.plan.nonMealData : null,
          ),
          meals:
            isRecord(value.plan) && Array.isArray(value.plan.mealUpserts)
              ? value.plan.mealUpserts
              : [],
        })
      : normalizeData(value.sourceData);
  const plan =
    value.version === 3 || value.version === 4
      ? {
          nonMealMutations: normalizeMigrationMutations(
            value.remainingNonMealMutations,
          ),
          mealUpserts: normalizeMealUpserts(value.remainingMealUpserts),
        }
      : legacyPlanToV3(value);

  if (
    !plan ||
    plan.nonMealMutations === null ||
    plan.mealUpserts === null
  ) {
    return null;
  }

  return {
    version: 4,
    operationId: value.operationId,
    ownerUserId: userId,
    revision:
      value.version === 4 &&
      typeof value.revision === "number" &&
      Number.isSafeInteger(value.revision) &&
      value.revision > 0
        ? value.revision
        : 1,
    source: value.source,
    status:
      value.version !== 4 && value.status === "started"
        ? "retry-required"
        : value.status,
    executionOrigin:
      value.version === 4 &&
      (value.executionOrigin === "initial" ||
        value.executionOrigin === "resume")
        ? value.executionOrigin
        : value.status === "prepared"
          ? "initial"
          : "resume",
    sourceData,
    remainingNonMealMutations: plan.nonMealMutations,
    remainingMealUpserts: plan.mealUpserts,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function persistMigrationOperation(operation: MigrationOperation): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    migrationOperationKey(operation.ownerUserId),
    JSON.stringify(operation),
  );
}

export function getMigrationOperation(
  userId: string,
): MigrationOperation | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(migrationOperationKey(userId));
    if (!raw) {
      return null;
    }

    const stored: unknown = JSON.parse(raw);
    const operation = normalizeMigrationOperation(stored, userId);

    if (operation && isRecord(stored) && stored.version !== 4) {
      persistMigrationOperation(operation);
    }

    return operation;
  } catch {
    return null;
  }
}

export function isMigrationOperationStarted(
  operation: MigrationOperation | null,
): boolean {
  return (
    operation?.status === "claiming" ||
    operation?.status === "started" ||
    operation?.status === "retry-required"
  );
}

function removeMigrationOperation(userId: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(migrationOperationKey(userId));
  } catch {
    throw new Error("La décision de migration n’a pas pu être enregistrée.");
  }
}

export async function discardPreparedMigrationOperation(
  userId: string,
  operationId: string,
  revision: number,
): Promise<boolean> {
  return withUserCloudLock(userId, async () => {
    const current = getMigrationOperation(userId);
    if (
      !current ||
      current.operationId !== operationId ||
      current.revision !== revision ||
      current.status !== "prepared"
    ) {
      return false;
    }

    removeMigrationOperation(userId);
    return true;
  });
}

export async function prepareMigrationOperation(
  supabase: AppSupabaseClient,
  userId: string,
  source: MigrationSource,
  localData: AppData,
): Promise<MigrationOperation> {
  return withUserCloudLock(userId, async (handle) => {
    const current = getMigrationOperation(userId);
    if (current) {
      if (current.source !== source) {
        throw new Error("Une autre association locale doit être terminée d’abord.");
      }
      return current;
    }

    await handle.assertOwned();
    const freshCloudData = await loadCloudData(supabase, userId);
    await handle.assertOwned();
    validateImportedPayload(localData);
    const now = new Date().toISOString();
    const sourceData = normalizeData(localData);
    const plan = buildMigrationPlan(sourceData, freshCloudData);
    const operation: MigrationOperation = {
      version: 4,
      operationId: createOperationId(),
      ownerUserId: userId,
      revision: 1,
      source,
      status: "prepared",
      executionOrigin: "initial",
      sourceData,
      remainingNonMealMutations: plan.nonMealMutations,
      remainingMealUpserts: plan.mealUpserts,
      createdAt: now,
      updatedAt: now,
    };

    persistMigrationOperation(operation);
    return operation;
  });
}

function markMigrationRetry(operation: MigrationOperation): void {
  const latest = getMigrationOperation(operation.ownerUserId);

  if (latest?.operationId === operation.operationId) {
    persistMigrationOperation({
      ...latest,
      revision: latest.revision + 1,
      status: "retry-required",
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function executeMigrationOperation(
  supabase: AppSupabaseClient,
  operation: MigrationOperation,
): Promise<AppData> {
  return withUserCloudLock(operation.ownerUserId, async (handle) => {
    let progress = getMigrationOperation(operation.ownerUserId);
    if (
      !progress ||
      progress.operationId !== operation.operationId ||
      progress.revision !== operation.revision
    ) {
      throw new Error("L’opération de migration n’est plus disponible.");
    }

    if (progress.status !== "claiming") {
      if (
        progress.status !== "prepared" &&
        progress.status !== "started" &&
        progress.status !== "retry-required"
      ) {
        throw new Error("L’opération de migration n’est plus disponible.");
      }
      progress = {
        ...progress,
        revision: progress.revision + 1,
        status: "claiming",
        executionOrigin:
          progress.status === "prepared" ? "initial" : "resume",
        updatedAt: new Date().toISOString(),
      };
      persistMigrationOperation(progress);
    }

    let freshCloudData: AppData;
    try {
      await handle.assertOwned();
      freshCloudData = await loadCloudData(supabase, progress.ownerUserId);
    } catch (error) {
      markMigrationRetry(progress);
      throw error;
    }

    const rebasedPlan = buildMigrationPlan(progress.sourceData, freshCloudData);
    const remainingMealUpserts = progress.remainingMealUpserts;
    progress = {
      ...progress,
      revision: progress.revision + 1,
      status: "started",
      executionOrigin: "resume",
      remainingNonMealMutations: rebasedPlan.nonMealMutations,
      remainingMealUpserts:
        progress.executionOrigin === "resume"
          ? remainingMealUpserts
          : rebasedPlan.mealUpserts,
      updatedAt: new Date().toISOString(),
    };
    persistMigrationOperation(progress);

    try {
      const ownerUserId = progress.ownerUserId;
      while (progress.remainingNonMealMutations.length > 0) {
        const [nextMutation, ...remaining] = progress.remainingNonMealMutations;
        await runCloudMutationWithTimeout(handle, (signal) =>
          applyNonMealMutation(
            supabase,
            ownerUserId,
            nextMutation,
            signal,
          ),
        );
        progress = {
          ...progress,
          revision: progress.revision + 1,
          remainingNonMealMutations: remaining,
          updatedAt: new Date().toISOString(),
        };
        persistMigrationOperation(progress);
      }

      while (progress.remainingMealUpserts.length > 0) {
        const [nextMeal, ...remaining] = progress.remainingMealUpserts;
        await runCloudMutationWithTimeout(handle, (signal) =>
          upsertMealObservation(
            supabase,
            ownerUserId,
            nextMeal,
            signal,
          ),
        );
        progress = {
          ...progress,
          revision: progress.revision + 1,
          remainingMealUpserts: remaining,
          updatedAt: new Date().toISOString(),
        };
        persistMigrationOperation(progress);
      }

      await handle.assertOwned();
      return normalizeData(await loadCloudData(supabase, progress.ownerUserId));
    } catch (error) {
      markMigrationRetry(progress);
      throw error;
    }
  });
}

export async function completeMigrationOperation(
  userId: string,
  operationId: string,
): Promise<boolean> {
  return withUserCloudLock(userId, async () => {
    const current = getMigrationOperation(userId);
    if (
      !current ||
      current.operationId !== operationId ||
      current.status !== "started" ||
      current.remainingNonMealMutations.length > 0 ||
      current.remainingMealUpserts.length > 0
    ) {
      return false;
    }
    removeMigrationOperation(userId);
    return true;
  });
}

export async function clearMigrationOperationForDeletedUser(
  userId: string,
): Promise<void> {
  await withUserCloudLock(userId, async () => removeMigrationOperation(userId));
}

export function clearMigrationOperationDuringConnectedReset(userId: string): void {
  removeMigrationOperation(userId);
}

export async function reconcilePendingAfterCloudLoad(
  supabase: AppSupabaseClient,
  userId: string,
  getLocalEditGeneration: () => number = () => 0,
): Promise<{ data: AppData; localEditGeneration: number }> {
  while (true) {
    const localEditGeneration = getLocalEditGeneration();

    await processPendingCloudWork(supabase, userId);
    const cloudData = await loadCloudData(supabase, userId);

    if (
      getLocalEditGeneration() !== localEditGeneration ||
      (await hasPendingCloudWork(userId))
    ) {
      continue;
    }

    return { data: normalizeData(cloudData), localEditGeneration };
  }
}

export function keepOnlyCloudData(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AppData> {
  return loadCloudData(supabase, userId);
}
