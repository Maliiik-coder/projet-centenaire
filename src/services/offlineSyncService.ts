import {
  getCloudMutationJournal,
  type CloudMutationJournal,
  type LegacyJournalImport,
} from "@/lib/cloudMutationJournal";
import {
  ImportValidationError,
  validateMealMutationPayload,
  validateNonMealMutationPayload,
} from "@/lib/dataValidation";
import { normalizeProfilePatch } from "@/lib/nonMealData";
import {
  createEmptyData,
  normalizeData,
  normalizeImportedData,
} from "@/lib/storage";
import { canonicalizeTimestamp } from "@/lib/timestamps";
import type {
  AppData,
  CloudOperation,
  MealEntry,
  MealMutation,
  MealMutationPayload,
  NonMealMutationDraft,
  PreparedCloudOperation,
  QuarantinedCloudRecord,
  StoredCloudMutation,
} from "@/lib/types";
import {
  runCloudMutationWithTimeout,
  withUserCloudLock,
  type UserCloudLockHandle,
} from "@/lib/userCloudLock";
import { applyNonMealMutation } from "@/services/cloudDataService";
import {
  deleteMealObservation,
  upsertMealObservation,
} from "@/services/mealService";
import type { AppSupabaseClient } from "@/services/serviceTypes";

const LEGACY_PENDING_SYNC_KEY = "projet-centenaire-pending-cloud-sync-v05";
const LEGACY_PENDING_QUARANTINE_KEY =
  "projet-centenaire-pending-cloud-sync-v1:legacy-quarantine";
const OLD_NON_MEAL_KEY_PREFIX = "projet-centenaire-pending-cloud-sync-v1";
const OLD_MEAL_KEY_PREFIX = "projet-centenaire-meal-mutations-v1";

type CloudWorkCoordinator = {
  promise: Promise<void>;
  wakeRequested: boolean;
};

type LockRunner = <T>(
  userId: string,
  callback: (handle: UserCloudLockHandle) => Promise<T>,
) => Promise<T>;

export type OfflineSyncService = ReturnType<typeof createOfflineSyncService>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function oldPendingKey(userId: string): string {
  return `${OLD_NON_MEAL_KEY_PREFIX}:user:${encodeURIComponent(userId)}`;
}

function oldRevisionKey(userId: string): string {
  return `${OLD_NON_MEAL_KEY_PREFIX}:revision:user:${encodeURIComponent(userId)}`;
}

function oldEpochKey(userId: string): string {
  return `${OLD_NON_MEAL_KEY_PREFIX}:epoch:user:${encodeURIComponent(userId)}`;
}

function oldMealKey(userId: string): string {
  return `${OLD_MEAL_KEY_PREFIX}:user:${encodeURIComponent(userId)}`;
}

function sortMutations(mutations: StoredCloudMutation[]): StoredCloudMutation[] {
  return mutations.slice().sort(
    (left, right) =>
      left.queuedAt.localeCompare(right.queuedAt) || left.id.localeCompare(right.id),
  );
}

function toMealPayload(mutation: MealMutation): MealMutationPayload {
  if (mutation.action === "upsert") {
    return {
      entity: "meal",
      action: "upsert",
      entityKey: canonicalizeTimestamp(mutation.entityKey),
      createdAt: canonicalizeTimestamp(mutation.createdAt),
      payload: {
        ...mutation.payload,
        createdAt: canonicalizeTimestamp(mutation.payload.createdAt),
      },
    };
  }

  return {
    entity: "meal",
    action: "delete",
    entityKey: canonicalizeTimestamp(mutation.entityKey),
    createdAt: canonicalizeTimestamp(mutation.createdAt),
  };
}

function toMealMutation(mutation: StoredCloudMutation): MealMutation | null {
  if (mutation.kind !== "meal") return null;
  const common = {
    id: mutation.id,
    ownerUserId: mutation.ownerUserId,
    entity: "meal" as const,
    entityKey: mutation.payload.entityKey,
    createdAt: mutation.payload.createdAt,
    queuedAt: mutation.queuedAt,
  };

  if (mutation.payload.action === "upsert") {
    return {
      ...common,
      action: "upsert",
      payload: mutation.payload.payload,
    };
  }

  return { ...common, action: "delete" };
}

function combineProfilePatches(
  mutations: Array<
    Extract<StoredCloudMutation, { kind: "non-meal" }> & {
      payload: Extract<NonMealMutationDraft, { entity: "profile" }>;
    }
  >,
): NonMealMutationDraft {
  return {
    entity: "profile",
    action: "patch",
    entityKey: "profile",
    patch: mutations.reduce(
      (patch, mutation) => ({ ...patch, ...mutation.payload.patch }),
      {},
    ),
  };
}

function isProfilePatchMutation(
  mutation: StoredCloudMutation,
): mutation is Extract<StoredCloudMutation, { kind: "non-meal" }> & {
  payload: Extract<NonMealMutationDraft, { entity: "profile" }>;
} {
  return (
    mutation.kind === "non-meal" &&
    mutation.payload.entity === "profile" &&
    mutation.payload.action === "patch"
  );
}

export function prepareNextCloudOperation(
  input: StoredCloudMutation[],
): PreparedCloudOperation | null {
  const mutations = sortMutations(input);
  const first = mutations[0];
  if (!first) return null;

  if (isProfilePatchMutation(first)) {
    const sources = mutations.filter(isProfilePatchMutation);
    return {
      operation: {
        kind: "non-meal",
        ownerUserId: first.ownerUserId,
        payload: combineProfilePatches(sources),
      },
      sourceMutationIds: sources.map((mutation) => mutation.id),
    };
  }

  if (first.kind === "non-meal") {
    if (first.payload.entity === "profile") {
      return {
        operation: {
          kind: "non-meal",
          ownerUserId: first.ownerUserId,
          payload: first.payload,
        },
        sourceMutationIds: [first.id],
      };
    }

    const sources = mutations.filter(
      (mutation) =>
        mutation.kind === "non-meal" &&
        mutation.payload.entity === first.payload.entity &&
        mutation.payload.entityKey === first.payload.entityKey,
    );
    const latest = sources[sources.length - 1];
    if (!latest || latest.kind !== "non-meal") return null;
    return {
      operation: {
        kind: "non-meal",
        ownerUserId: first.ownerUserId,
        payload: latest.payload,
      },
      sourceMutationIds: sources.map((mutation) => mutation.id),
    };
  }

  const sources = mutations.filter(
    (mutation) =>
      mutation.kind === "meal" &&
      mutation.payload.entityKey === first.payload.entityKey,
  );
  const latest = sources[sources.length - 1];
  if (!latest || latest.kind !== "meal") return null;
  return {
    operation: {
      kind: "meal",
      ownerUserId: first.ownerUserId,
      payload: latest.payload,
    },
    sourceMutationIds: sources.map((mutation) => mutation.id),
  };
}

async function applyCloudOperation(
  supabase: AppSupabaseClient,
  operation: CloudOperation,
  signal: AbortSignal,
): Promise<void> {
  if (operation.kind === "non-meal") {
    await applyNonMealMutation(
      supabase,
      operation.ownerUserId,
      operation.payload,
      signal,
    );
    return;
  }

  if (operation.payload.action === "upsert") {
    await upsertMealObservation(
      supabase,
      operation.ownerUserId,
      operation.payload.payload,
      signal,
    );
    return;
  }

  await deleteMealObservation(
    supabase,
    operation.ownerUserId,
    operation.payload.createdAt,
    signal,
  );
}

function legacyNonMealCandidate(
  value: unknown,
  userId: string,
): Omit<Extract<StoredCloudMutation, { kind: "non-meal" }>, "generationId"> | null {
  if (!isRecord(value) || value.ownerUserId !== userId) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.queuedAt !== "string" ||
    !isRecord(value)
  ) {
    return null;
  }

  let payload: NonMealMutationDraft | null = null;
  if (
    value.entity === "profile" &&
    (value.action === "create" || value.action === "patch") &&
    value.entityKey === "profile"
  ) {
    const patch = normalizeProfilePatch(value.patch);
    if (patch) {
      payload = {
        entity: "profile",
        action: value.action,
        entityKey: "profile",
        patch,
      };
    }
  } else if (value.entity === "weight" && value.action === "upsert") {
    const [entry] = normalizeData({ weights: [value.payload] }).weights;
    if (entry && entry.date === value.entityKey) {
      payload = {
        entity: "weight",
        action: "upsert",
        entityKey: entry.date,
        payload: entry,
      };
    }
  } else if (value.entity === "smoking" && value.action === "upsert") {
    const [entry] = normalizeData({ smokingEntries: [value.payload] })
      .smokingEntries;
    if (entry) {
      const entityKey = canonicalizeTimestamp(entry.createdAt);
      if (entityKey === value.entityKey) {
        payload = {
          entity: "smoking",
          action: "upsert",
          entityKey,
          payload: { ...entry, createdAt: entityKey },
        };
      }
    }
  }

  if (!payload) return null;
  validateNonMealMutationPayload(payload);
  return {
    id: value.id,
    ownerUserId: userId,
    kind: "non-meal",
    queuedAt: canonicalizeTimestamp(value.queuedAt),
    payload,
  };
}

function legacyMealCandidate(
  value: unknown,
  userId: string,
): Omit<Extract<StoredCloudMutation, { kind: "meal" }>, "generationId"> | null {
  if (
    !isRecord(value) ||
    value.ownerUserId !== userId ||
    typeof value.id !== "string" ||
    typeof value.queuedAt !== "string" ||
    value.entity !== "meal" ||
    (value.action !== "upsert" && value.action !== "delete") ||
    typeof value.entityKey !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  let payload: MealMutationPayload;
  if (value.action === "upsert") {
    const [meal] = normalizeData({ meals: [value.payload] }).meals;
    if (!meal) return null;
    payload = {
      entity: "meal",
      action: "upsert",
      entityKey: canonicalizeTimestamp(value.entityKey),
      createdAt: canonicalizeTimestamp(value.createdAt),
      payload: meal,
    };
  } else {
    payload = {
      entity: "meal",
      action: "delete",
      entityKey: canonicalizeTimestamp(value.entityKey),
      createdAt: canonicalizeTimestamp(value.createdAt),
    };
  }
  validateMealMutationPayload(payload);
  return {
    id: value.id,
    ownerUserId: userId,
    kind: "meal",
    queuedAt: canonicalizeTimestamp(value.queuedAt),
    payload,
  };
}

function quarantineRecord(
  userId: string,
  category: QuarantinedCloudRecord["category"],
  reason: string,
  payload: unknown,
): QuarantinedCloudRecord {
  return {
    id: createId("quarantine"),
    ownerUserId: userId,
    generationId: null,
    category,
    reason,
    payload,
    quarantinedAt: new Date().toISOString(),
  };
}

function collectLegacyImport(userId: string): {
  input: LegacyJournalImport;
  sourceKeys: string[];
} {
  const input: LegacyJournalImport = { mutations: [], quarantine: [] };
  const sourceKeys: string[] = [];
  if (!isBrowser()) return { input, sourceKeys };

  const nonMealKey = oldPendingKey(userId);
  const mealKey = oldMealKey(userId);
  const rawNonMeal = window.localStorage.getItem(nonMealKey);
  if (rawNonMeal) {
    try {
      const envelope = parseJson(rawNonMeal);
      if (isRecord(envelope) && envelope.ownerUserId === userId) {
        if (envelope.version === 4 && Array.isArray(envelope.mutations)) {
          envelope.mutations.forEach((value) => {
            try {
              const mutation = legacyNonMealCandidate(value, userId);
              if (mutation) input.mutations.push(mutation);
              else {
                input.quarantine.push(
                  quarantineRecord(
                    userId,
                    "invalid-mutation",
                    "mutation V4 illisible",
                    value,
                  ),
                );
              }
            } catch (error) {
              input.quarantine.push(
                quarantineRecord(
                  userId,
                  "invalid-mutation",
                  error instanceof ImportValidationError
                    ? `${error.path}: ${error.reason}`
                    : "mutation V4 invalide",
                  value,
                ),
              );
            }
          });
        } else if (
          envelope.version === 1 ||
          envelope.version === 2 ||
          envelope.version === 3
        ) {
          input.quarantine.push(
            quarantineRecord(
              userId,
              "legacy-snapshot",
              "snapshot historique à récupérer explicitement",
              envelope,
            ),
          );
        } else {
          input.quarantine.push(
            quarantineRecord(
              userId,
              "legacy-snapshot",
              "stockage historique non reconnu",
              envelope,
            ),
          );
        }
        sourceKeys.push(nonMealKey, oldRevisionKey(userId), oldEpochKey(userId));
      }
    } catch {
      input.quarantine.push(
        quarantineRecord(userId, "legacy-snapshot", "JSON historique illisible", rawNonMeal),
      );
      sourceKeys.push(nonMealKey, oldRevisionKey(userId), oldEpochKey(userId));
    }
  }

  const rawMeals = window.localStorage.getItem(mealKey);
  if (rawMeals) {
    try {
      const envelope = parseJson(rawMeals);
      if (
        isRecord(envelope) &&
        envelope.version === 1 &&
        envelope.ownerUserId === userId &&
        Array.isArray(envelope.mutations)
      ) {
        envelope.mutations.forEach((value) => {
          try {
            const mutation = legacyMealCandidate(value, userId);
            if (mutation) input.mutations.push(mutation);
            else {
              input.quarantine.push(
                quarantineRecord(
                  userId,
                  "invalid-mutation",
                  "mutation repas V1 illisible",
                  value,
                ),
              );
            }
          } catch (error) {
            input.quarantine.push(
              quarantineRecord(
                userId,
                "invalid-mutation",
                error instanceof ImportValidationError
                  ? `${error.path}: ${error.reason}`
                  : "mutation repas V1 invalide",
                value,
              ),
            );
          }
        });
        sourceKeys.push(mealKey);
      }
    } catch {
      input.quarantine.push(
        quarantineRecord(userId, "invalid-mutation", "file repas V1 illisible", rawMeals),
      );
      sourceKeys.push(mealKey);
    }
  }

  return { input, sourceKeys };
}

export function createOfflineSyncService(
  journal: CloudMutationJournal = getCloudMutationJournal(),
  runWithLock: LockRunner = (userId, callback) =>
    withUserCloudLock(userId, callback),
) {
  const runningCloudWork = new Map<string, CloudWorkCoordinator>();
  const migratedUsers = new Set<string>();
  const wakeChannel =
    typeof window !== "undefined" &&
    "BroadcastChannel" in window &&
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("projet-centenaire-cloud-journal:wake")
      : null;

  wakeChannel?.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (!isRecord(event.data) || typeof event.data.userId !== "string") return;
    const coordinator = runningCloudWork.get(event.data.userId);
    if (coordinator) coordinator.wakeRequested = true;
  });

  const ensureLegacyQueuesMigrated = async (userId: string): Promise<void> => {
    if (migratedUsers.has(userId)) return;
    const { input, sourceKeys } = collectLegacyImport(userId);
    await journal.importLegacyOnce(userId, input);
    if (isBrowser()) {
      sourceKeys.forEach((key) => window.localStorage.removeItem(key));
    }
    migratedUsers.add(userId);
  };

  const getSnapshot = async (userId: string) => {
    await ensureLegacyQueuesMigrated(userId);
    const generationId = await journal.getOrCreateGeneration(userId);
    return {
      generationId,
      mutations: await journal.list(userId, generationId),
    };
  };

  const getRecoverableLegacySnapshot = async (
    userId: string,
  ): Promise<AppData | null> => {
    await ensureLegacyQueuesMigrated(userId);
    const records = (await journal.listQuarantine(userId)).filter(
      (record) => record.category === "legacy-snapshot",
    );
    let recovered = createEmptyData();
    let recognized = false;

    records.forEach((record) => {
      if (!isRecord(record.payload)) return;
      const candidate = "data" in record.payload
        ? record.payload.data
        : record.payload;
      try {
        const data = normalizeImportedData(candidate);
        recovered = normalizeData({
          profile: recovered.profile ?? data.profile,
          weights: [...recovered.weights, ...data.weights],
          meals: [...recovered.meals, ...data.meals],
          activities: [...recovered.activities, ...data.activities],
          smokingEntries: [
            ...recovered.smokingEntries,
            ...data.smokingEntries,
          ],
        });
        recognized = true;
      } catch {
        // The raw quarantine stays available for export and manual recovery.
      }
    });

    return recognized ? recovered : null;
  };

  const queueCloudMutations = async (
    userId: string,
    nonMealMutations: NonMealMutationDraft[],
    mealMutations: MealMutation[],
  ): Promise<void> => {
    if (nonMealMutations.length === 0 && mealMutations.length === 0) return;
    await ensureLegacyQueuesMigrated(userId);
    const generationId = await journal.getOrCreateGeneration(userId);
    const queuedAtBase = Date.now();
    const stored: StoredCloudMutation[] = [
      ...nonMealMutations.map((payload, index): StoredCloudMutation => {
        validateNonMealMutationPayload(payload);
        return {
          id: createId(`non-meal-${payload.entity}-${index}`),
          ownerUserId: userId,
          generationId,
          kind: "non-meal",
          queuedAt: new Date(queuedAtBase + index).toISOString(),
          payload,
        };
      }),
      ...mealMutations.map((mutation, index): StoredCloudMutation => {
        if (mutation.ownerUserId !== userId) {
          throw new Error("Cette mutation repas appartient à un autre compte.");
        }
        const payload = toMealPayload(mutation);
        validateMealMutationPayload(payload);
        return {
          id: mutation.id || createId(`meal-${index}`),
          ownerUserId: userId,
          generationId,
          kind: "meal",
          queuedAt: new Date(
            queuedAtBase + nonMealMutations.length + index,
          ).toISOString(),
          payload,
        };
      }),
    ];
    await journal.appendBatch(userId, generationId, stored);
    const coordinator = runningCloudWork.get(userId);
    if (coordinator) coordinator.wakeRequested = true;
    wakeChannel?.postMessage({ userId });
  };

  const processPendingCloudWork = async (
    supabase: AppSupabaseClient,
    userId: string,
  ): Promise<void> => {
    await ensureLegacyQueuesMigrated(userId);
    const current = runningCloudWork.get(userId);
    if (current) {
      current.wakeRequested = true;
      return current.promise;
    }

    const coordinator: CloudWorkCoordinator = {
      promise: Promise.resolve(),
      wakeRequested: false,
    };
    coordinator.promise = (async () => {
      do {
        coordinator.wakeRequested = false;
        await runWithLock(userId, async (handle) => {
          while (true) {
            const generationId = await journal.getOrCreateGeneration(userId);
            const snapshot = await journal.list(userId, generationId);
            const prepared = prepareNextCloudOperation(snapshot);
            if (!prepared) return;
            await runCloudMutationWithTimeout(handle, (signal) =>
              applyCloudOperation(supabase, prepared.operation, signal),
            );
            await handle.assertOwned();
            await journal.acknowledgeExact(
              userId,
              generationId,
              prepared.sourceMutationIds,
            );
          }
        });
      } while (coordinator.wakeRequested);
    })().finally(() => {
      if (runningCloudWork.get(userId) === coordinator) {
        runningCloudWork.delete(userId);
      }
    });
    runningCloudWork.set(userId, coordinator);
    return coordinator.promise;
  };

  return {
    ensureLegacyQueuesMigrated,
    getSnapshot,
    getRecoverableLegacySnapshot,
    queueCloudMutations,
    queueNonMealMutations: (userId: string, mutations: NonMealMutationDraft[]) =>
      queueCloudMutations(userId, mutations, []),
    queueMealMutations: (userId: string, mutations: MealMutation[]) =>
      queueCloudMutations(userId, [], mutations),
    getPendingNonMealMutations: async (userId: string) =>
      (await getSnapshot(userId)).mutations.filter(
        (mutation): mutation is Extract<StoredCloudMutation, { kind: "non-meal" }> =>
          mutation.kind === "non-meal",
      ),
    getPendingMealMutations: async (userId: string): Promise<MealMutation[]> =>
      (await getSnapshot(userId)).mutations
        .map(toMealMutation)
        .filter((mutation): mutation is MealMutation => mutation !== null),
    hasPendingCloudWork: async (userId: string): Promise<boolean> => {
      await ensureLegacyQueuesMigrated(userId);
      const generationId = await journal.getOrCreateGeneration(userId);
      return journal.hasPending(userId, generationId);
    },
    processPendingCloudWork,
    waitForCloudWorkToSettle: async (userId: string): Promise<void> => {
      await runningCloudWork.get(userId)?.promise;
    },
    rotatePendingGeneration: async (userId: string): Promise<string> =>
      journal.rotateGenerationAndClear(userId),
    clearUserPendingState: async (userId: string): Promise<void> =>
      journal.clearUser(userId),
    listQuarantine: async (userId: string) => journal.listQuarantine(userId),
    clearRecoverableLegacySnapshots: async (userId: string) =>
      journal.clearQuarantineCategory(userId, "legacy-snapshot"),
  };
}

const defaultService = createOfflineSyncService();

export const ensureLegacyQueuesMigrated = defaultService.ensureLegacyQueuesMigrated;
export const getPendingCloudSnapshot = defaultService.getSnapshot;
export const getRecoverableLegacySnapshot =
  defaultService.getRecoverableLegacySnapshot;
export const queueCloudMutations = defaultService.queueCloudMutations;
export const queueNonMealMutations = defaultService.queueNonMealMutations;
export const queueMealMutations = defaultService.queueMealMutations;
export const getPendingNonMealMutations = defaultService.getPendingNonMealMutations;
export const getPendingMealMutations = defaultService.getPendingMealMutations;
export const hasPendingCloudWork = defaultService.hasPendingCloudWork;
export const processPendingCloudWork = defaultService.processPendingCloudWork;
export const waitForCloudWorkToSettle = defaultService.waitForCloudWorkToSettle;
export const rotatePendingGeneration = defaultService.rotatePendingGeneration;
export const removePendingSyncStateForDeletedUser =
  defaultService.clearUserPendingState;
export const listPendingCloudQuarantine = defaultService.listQuarantine;
export const clearRecoverableLegacySnapshots =
  defaultService.clearRecoverableLegacySnapshots;

export const hasPendingSyncData = hasPendingCloudWork;
export const hasPendingMealMutations = hasPendingCloudWork;
export const discardPendingSyncData = rotatePendingGeneration;
export const clearPendingSyncData = rotatePendingGeneration;
export const clearMealMutations = rotatePendingGeneration;

export function createMealUpsertMutation(
  userId: string,
  meal: MealEntry,
): MealMutation {
  const createdAt = canonicalizeTimestamp(meal.createdAt);
  return {
    id: createId("meal-upsert"),
    ownerUserId: userId,
    entity: "meal",
    action: "upsert",
    entityKey: createdAt,
    createdAt,
    payload: { ...meal, createdAt },
    queuedAt: new Date().toISOString(),
  };
}

export function createMealDeleteMutation(
  userId: string,
  createdAt: string,
): MealMutation {
  const canonicalCreatedAt = canonicalizeTimestamp(createdAt);
  return {
    id: createId("meal-delete"),
    ownerUserId: userId,
    entity: "meal",
    action: "delete",
    entityKey: canonicalCreatedAt,
    createdAt: canonicalCreatedAt,
    queuedAt: new Date().toISOString(),
  };
}

export function quarantineLegacyPendingSyncData(): AppData | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.localStorage.getItem(LEGACY_PENDING_QUARANTINE_KEY);
    if (existing) return normalizeData(parseJson(existing));
    const legacy = window.localStorage.getItem(LEGACY_PENDING_SYNC_KEY);
    if (!legacy) return null;
    const data = normalizeData(parseJson(legacy));
    window.localStorage.setItem(
      LEGACY_PENDING_QUARANTINE_KEY,
      JSON.stringify(data),
    );
    window.localStorage.removeItem(LEGACY_PENDING_SYNC_KEY);
    return data;
  } catch {
    return null;
  }
}

export function getLegacyPendingSyncQuarantine(): AppData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_PENDING_QUARANTINE_KEY);
    return raw ? normalizeData(parseJson(raw)) : null;
  } catch {
    return null;
  }
}

export function clearLegacyPendingSyncQuarantine(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LEGACY_PENDING_QUARANTINE_KEY);
}
