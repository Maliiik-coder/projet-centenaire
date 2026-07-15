import {
  ImportValidationError,
  validateStoredCloudMutation,
} from "@/lib/dataValidation";
import type {
  QuarantinedCloudRecord,
  StoredCloudMutation,
} from "@/lib/types";

const DATABASE_NAME = "projet-centenaire-cloud-state-v1";
const DATABASE_VERSION = 1;
const MUTATIONS_STORE = "mutations";
const GENERATIONS_STORE = "generations";
const QUARANTINE_STORE = "quarantine";
const METADATA_STORE = "metadata";
export const LEASES_STORE = "leases";

type GenerationRecord = {
  userId: string;
  generationId: string;
  updatedAt: string;
};

type StoredMutationRecord = StoredCloudMutation & {
  storageKey: string;
};

type MetadataRecord = {
  key: string;
  completedAt: string;
};

export type LegacyMutationCandidate =
  | Omit<
      Extract<StoredCloudMutation, { kind: "non-meal" }>,
      "generationId"
    >
  | Omit<Extract<StoredCloudMutation, { kind: "meal" }>, "generationId">;

export type LegacyJournalImport = {
  mutations: LegacyMutationCandidate[];
  quarantine: QuarantinedCloudRecord[];
};

export interface CloudMutationJournal {
  getOrCreateGeneration(userId: string): Promise<string>;
  appendBatch(
    userId: string,
    generationId: string,
    mutations: StoredCloudMutation[],
  ): Promise<void>;
  list(userId: string, generationId: string): Promise<StoredCloudMutation[]>;
  acknowledgeExact(
    userId: string,
    generationId: string,
    mutationIds: string[],
  ): Promise<void>;
  hasPending(userId: string, generationId: string): Promise<boolean>;
  rotateGenerationAndClear(userId: string): Promise<string>;
  clearUser(userId: string): Promise<void>;
  quarantineExact(
    userId: string,
    generationId: string,
    mutationId: string,
    reason: string,
  ): Promise<void>;
  listQuarantine(userId: string): Promise<QuarantinedCloudRecord[]>;
  clearQuarantineCategory(
    userId: string,
    category: QuarantinedCloudRecord["category"],
  ): Promise<void>;
  importLegacyOnce(userId: string, input: LegacyJournalImport): Promise<void>;
}

export class JournalUnavailableError extends Error {
  constructor(message = "Le journal local sécurisé est indisponible.") {
    super(message);
    this.name = "JournalUnavailableError";
  }
}

export class JournalGenerationChangedError extends Error {
  constructor() {
    super("La génération du journal a changé pendant l’écriture.");
    this.name = "JournalGenerationChangedError";
  }
}

function createOpaqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function mutationStorageKey(
  userId: string,
  generationId: string,
  mutationId: string,
): string {
  return `${encodeURIComponent(userId)}\u0000${generationId}\u0000${mutationId}`;
}

function migrationMetadataKey(userId: string): string {
  return `legacy-queues:${encodeURIComponent(userId)}`;
}

function toStoredRecord(mutation: StoredCloudMutation): StoredMutationRecord {
  return {
    ...mutation,
    storageKey: mutationStorageKey(
      mutation.ownerUserId,
      mutation.generationId,
      mutation.id,
    ),
  };
}

function fromStoredRecord(record: StoredMutationRecord): StoredCloudMutation {
  if (record.kind === "non-meal") {
    return {
      id: record.id,
      ownerUserId: record.ownerUserId,
      generationId: record.generationId,
      kind: "non-meal",
      queuedAt: record.queuedAt,
      payload: record.payload,
    };
  }

  return {
    id: record.id,
    ownerUserId: record.ownerUserId,
    generationId: record.generationId,
    kind: "meal",
    queuedAt: record.queuedAt,
    payload: record.payload,
  };
}

function withGeneration(
  candidate: LegacyMutationCandidate,
  generationId: string,
): StoredCloudMutation {
  if (candidate.kind === "non-meal") {
    return {
      id: candidate.id,
      ownerUserId: candidate.ownerUserId,
      generationId,
      kind: "non-meal",
      queuedAt: candidate.queuedAt,
      payload: candidate.payload,
    };
  }

  return {
    id: candidate.id,
    ownerUserId: candidate.ownerUserId,
    generationId,
    kind: "meal",
    queuedAt: candidate.queuedAt,
    payload: candidate.payload,
  };
}

function sortMutations(mutations: StoredCloudMutation[]): StoredCloudMutation[] {
  return mutations.sort(
    (left, right) =>
      left.queuedAt.localeCompare(right.queuedAt) || left.id.localeCompare(right.id),
  );
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new JournalUnavailableError());
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new JournalUnavailableError());
    transaction.onerror = () =>
      reject(transaction.error ?? new JournalUnavailableError());
  });
}

function deleteByIndex(
  store: IDBObjectStore,
  indexName: string,
  key: IDBValidKey,
): void {
  const request = store.index(indexName).openCursor(IDBKeyRange.only(key));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
}

export function openCloudJournalDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new JournalUnavailableError());
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const mutations = database.createObjectStore(MUTATIONS_STORE, {
        keyPath: "storageKey",
      });
      mutations.createIndex("byUserGeneration", [
        "ownerUserId",
        "generationId",
      ]);
      mutations.createIndex("byUser", "ownerUserId");
      database.createObjectStore(GENERATIONS_STORE, { keyPath: "userId" });
      const quarantine = database.createObjectStore(QUARANTINE_STORE, {
        keyPath: "id",
      });
      quarantine.createIndex("byUser", "ownerUserId");
      database.createObjectStore(METADATA_STORE, { keyPath: "key" });
      database.createObjectStore(LEASES_STORE, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new JournalUnavailableError());
    request.onblocked = () => reject(new JournalUnavailableError());
  });
}

export class IndexedDbCloudMutationJournal implements CloudMutationJournal {
  async getOrCreateGeneration(userId: string): Promise<string> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(GENERATIONS_STORE, "readwrite");
    const store = transaction.objectStore(GENERATIONS_STORE);
    const existing = await requestResult<GenerationRecord | undefined>(
      store.get(userId),
    );
    const generationId = existing?.generationId ?? createOpaqueId("generation");

    if (!existing) {
      store.add({ userId, generationId, updatedAt: new Date().toISOString() });
    }

    await transactionDone(transaction);
    database.close();
    return generationId;
  }

  async appendBatch(
    userId: string,
    generationId: string,
    mutations: StoredCloudMutation[],
  ): Promise<void> {
    mutations.forEach((mutation) => {
      if (
        mutation.ownerUserId !== userId ||
        mutation.generationId !== generationId
      ) {
        throw new JournalGenerationChangedError();
      }
      validateStoredCloudMutation(mutation);
    });

    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [GENERATIONS_STORE, MUTATIONS_STORE],
      "readwrite",
    );
    const generation = await requestResult<GenerationRecord | undefined>(
      transaction.objectStore(GENERATIONS_STORE).get(userId),
    );

    if (generation?.generationId !== generationId) {
      transaction.abort();
      database.close();
      throw new JournalGenerationChangedError();
    }

    const store = transaction.objectStore(MUTATIONS_STORE);
    mutations.forEach((mutation) => store.add(toStoredRecord(mutation)));
    await transactionDone(transaction);
    database.close();
  }

  async list(
    userId: string,
    generationId: string,
  ): Promise<StoredCloudMutation[]> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [MUTATIONS_STORE, QUARANTINE_STORE],
      "readwrite",
    );
    const mutationStore = transaction.objectStore(MUTATIONS_STORE);
    const records = await requestResult<StoredMutationRecord[]>(
      mutationStore
        .index("byUserGeneration")
        .getAll(IDBKeyRange.only([userId, generationId])),
    );
    const valid: StoredCloudMutation[] = [];

    records.forEach((record) => {
      const mutation = fromStoredRecord(record);
      try {
        validateStoredCloudMutation(mutation);
        valid.push(mutation);
      } catch (error) {
        const reason =
          error instanceof ImportValidationError
            ? `${error.path}: ${error.reason}`
            : "mutation historique invalide";
        transaction.objectStore(QUARANTINE_STORE).put({
          id: createOpaqueId("quarantine"),
          ownerUserId: userId,
          generationId,
          category: "invalid-mutation",
          reason,
          payload: mutation,
          quarantinedAt: new Date().toISOString(),
        } satisfies QuarantinedCloudRecord);
        mutationStore.delete(record.storageKey);
      }
    });

    await transactionDone(transaction);
    database.close();
    return sortMutations(valid);
  }

  async acknowledgeExact(
    userId: string,
    generationId: string,
    mutationIds: string[],
  ): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [GENERATIONS_STORE, MUTATIONS_STORE],
      "readwrite",
    );
    const generation = await requestResult<GenerationRecord | undefined>(
      transaction.objectStore(GENERATIONS_STORE).get(userId),
    );

    if (generation?.generationId === generationId) {
      const mutations = transaction.objectStore(MUTATIONS_STORE);
      mutationIds.forEach((id) =>
        mutations.delete(mutationStorageKey(userId, generationId, id)),
      );
    }

    await transactionDone(transaction);
    database.close();
  }

  async hasPending(userId: string, generationId: string): Promise<boolean> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(MUTATIONS_STORE, "readonly");
    const count = await requestResult(
      transaction
        .objectStore(MUTATIONS_STORE)
        .index("byUserGeneration")
        .count(IDBKeyRange.only([userId, generationId])),
    );
    await transactionDone(transaction);
    database.close();
    return count > 0;
  }

  async rotateGenerationAndClear(userId: string): Promise<string> {
    const generationId = createOpaqueId("generation");
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [GENERATIONS_STORE, MUTATIONS_STORE],
      "readwrite",
    );
    transaction.objectStore(GENERATIONS_STORE).put({
      userId,
      generationId,
      updatedAt: new Date().toISOString(),
    } satisfies GenerationRecord);
    deleteByIndex(
      transaction.objectStore(MUTATIONS_STORE),
      "byUser",
      userId,
    );
    await transactionDone(transaction);
    database.close();
    return generationId;
  }

  async clearUser(userId: string): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [
        GENERATIONS_STORE,
        MUTATIONS_STORE,
        QUARANTINE_STORE,
        METADATA_STORE,
      ],
      "readwrite",
    );
    transaction.objectStore(GENERATIONS_STORE).delete(userId);
    transaction
      .objectStore(METADATA_STORE)
      .delete(migrationMetadataKey(userId));
    deleteByIndex(
      transaction.objectStore(MUTATIONS_STORE),
      "byUser",
      userId,
    );
    deleteByIndex(
      transaction.objectStore(QUARANTINE_STORE),
      "byUser",
      userId,
    );
    await transactionDone(transaction);
    database.close();
  }

  async quarantineExact(
    userId: string,
    generationId: string,
    mutationId: string,
    reason: string,
  ): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [MUTATIONS_STORE, QUARANTINE_STORE],
      "readwrite",
    );
    const mutationStore = transaction.objectStore(MUTATIONS_STORE);
    const key = mutationStorageKey(userId, generationId, mutationId);
    const record = await requestResult<StoredMutationRecord | undefined>(
      mutationStore.get(key),
    );

    if (record) {
      transaction.objectStore(QUARANTINE_STORE).put({
        id: createOpaqueId("quarantine"),
        ownerUserId: userId,
        generationId,
        category: "invalid-mutation",
        reason,
        payload: fromStoredRecord(record),
        quarantinedAt: new Date().toISOString(),
      } satisfies QuarantinedCloudRecord);
      mutationStore.delete(key);
    }

    await transactionDone(transaction);
    database.close();
  }

  async listQuarantine(userId: string): Promise<QuarantinedCloudRecord[]> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(QUARANTINE_STORE, "readonly");
    const records = await requestResult<QuarantinedCloudRecord[]>(
      transaction
        .objectStore(QUARANTINE_STORE)
        .index("byUser")
        .getAll(IDBKeyRange.only(userId)),
    );
    await transactionDone(transaction);
    database.close();
    return records.sort((left, right) =>
      left.quarantinedAt.localeCompare(right.quarantinedAt),
    );
  }

  async clearQuarantineCategory(
    userId: string,
    category: QuarantinedCloudRecord["category"],
  ): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(QUARANTINE_STORE, "readwrite");
    const request = transaction
      .objectStore(QUARANTINE_STORE)
      .index("byUser")
      .openCursor(IDBKeyRange.only(userId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record: QuarantinedCloudRecord = cursor.value;
      if (record.category === category) cursor.delete();
      cursor.continue();
    };
    await transactionDone(transaction);
    database.close();
  }

  async importLegacyOnce(
    userId: string,
    input: LegacyJournalImport,
  ): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(
      [GENERATIONS_STORE, MUTATIONS_STORE, QUARANTINE_STORE, METADATA_STORE],
      "readwrite",
    );
    const metadata = transaction.objectStore(METADATA_STORE);
    const migrationKey = migrationMetadataKey(userId);
    const completed = await requestResult<MetadataRecord | undefined>(
      metadata.get(migrationKey),
    );

    if (completed) {
      await transactionDone(transaction);
      database.close();
      return;
    }

    const generationStore = transaction.objectStore(GENERATIONS_STORE);
    const existingGeneration = await requestResult<GenerationRecord | undefined>(
      generationStore.get(userId),
    );
    const generationId =
      existingGeneration?.generationId ?? createOpaqueId("generation");

    if (!existingGeneration) {
      generationStore.add({
        userId,
        generationId,
        updatedAt: new Date().toISOString(),
      } satisfies GenerationRecord);
    }

    const mutationStore = transaction.objectStore(MUTATIONS_STORE);
    const quarantineStore = transaction.objectStore(QUARANTINE_STORE);

    input.mutations.forEach((candidate) => {
      const mutation = withGeneration(candidate, generationId);
      try {
        validateStoredCloudMutation(mutation);
        mutationStore.add(toStoredRecord(mutation));
      } catch (error) {
        quarantineStore.put({
          id: createOpaqueId("quarantine"),
          ownerUserId: userId,
          generationId,
          category: "invalid-mutation",
          reason:
            error instanceof ImportValidationError
              ? `${error.path}: ${error.reason}`
              : "mutation legacy invalide",
          payload: candidate,
          quarantinedAt: new Date().toISOString(),
        } satisfies QuarantinedCloudRecord);
      }
    });
    input.quarantine.forEach((record) => quarantineStore.put(record));
    metadata.put({
      key: migrationKey,
      completedAt: new Date().toISOString(),
    } satisfies MetadataRecord);

    await transactionDone(transaction);
    database.close();
  }
}

export class MemoryCloudMutationJournal implements CloudMutationJournal {
  private generations = new Map<string, string>();
  private mutations = new Map<string, StoredCloudMutation>();
  private quarantine = new Map<string, QuarantinedCloudRecord>();
  private migratedUsers = new Set<string>();

  async getOrCreateGeneration(userId: string): Promise<string> {
    const current = this.generations.get(userId);
    if (current) return current;
    const generationId = createOpaqueId("generation");
    this.generations.set(userId, generationId);
    return generationId;
  }

  async appendBatch(
    userId: string,
    generationId: string,
    mutations: StoredCloudMutation[],
  ): Promise<void> {
    if (this.generations.get(userId) !== generationId) {
      throw new JournalGenerationChangedError();
    }

    mutations.forEach((mutation) => {
      validateStoredCloudMutation(mutation);
      const key = mutationStorageKey(userId, generationId, mutation.id);
      if (this.mutations.has(key)) {
        throw new Error(`Mutation dupliquée : ${mutation.id}`);
      }
    });
    mutations.forEach((mutation) =>
      this.mutations.set(
        mutationStorageKey(userId, generationId, mutation.id),
        mutation,
      ),
    );
  }

  async list(
    userId: string,
    generationId: string,
  ): Promise<StoredCloudMutation[]> {
    const valid: StoredCloudMutation[] = [];

    for (const [key, mutation] of this.mutations) {
      if (
        mutation.ownerUserId !== userId ||
        mutation.generationId !== generationId
      ) {
        continue;
      }

      try {
        validateStoredCloudMutation(mutation);
        valid.push(mutation);
      } catch (error) {
        this.mutations.delete(key);
        const record: QuarantinedCloudRecord = {
          id: createOpaqueId("quarantine"),
          ownerUserId: userId,
          generationId,
          category: "invalid-mutation",
          reason:
            error instanceof ImportValidationError
              ? `${error.path}: ${error.reason}`
              : "mutation historique invalide",
          payload: mutation,
          quarantinedAt: new Date().toISOString(),
        };
        this.quarantine.set(record.id, record);
      }
    }

    return sortMutations(valid);
  }

  async acknowledgeExact(
    userId: string,
    generationId: string,
    mutationIds: string[],
  ): Promise<void> {
    if (this.generations.get(userId) !== generationId) return;
    mutationIds.forEach((id) =>
      this.mutations.delete(mutationStorageKey(userId, generationId, id)),
    );
  }

  async hasPending(userId: string, generationId: string): Promise<boolean> {
    return [...this.mutations.values()].some(
      (mutation) =>
        mutation.ownerUserId === userId &&
        mutation.generationId === generationId,
    );
  }

  async rotateGenerationAndClear(userId: string): Promise<string> {
    const generationId = createOpaqueId("generation");
    this.generations.set(userId, generationId);
    for (const [key, mutation] of this.mutations) {
      if (mutation.ownerUserId === userId) this.mutations.delete(key);
    }
    return generationId;
  }

  async clearUser(userId: string): Promise<void> {
    this.generations.delete(userId);
    for (const [key, mutation] of this.mutations) {
      if (mutation.ownerUserId === userId) this.mutations.delete(key);
    }
    for (const [key, record] of this.quarantine) {
      if (record.ownerUserId === userId) this.quarantine.delete(key);
    }
    this.migratedUsers.delete(userId);
  }

  async quarantineExact(
    userId: string,
    generationId: string,
    mutationId: string,
    reason: string,
  ): Promise<void> {
    const key = mutationStorageKey(userId, generationId, mutationId);
    const mutation = this.mutations.get(key);
    if (!mutation) return;
    this.mutations.delete(key);
    const record: QuarantinedCloudRecord = {
      id: createOpaqueId("quarantine"),
      ownerUserId: userId,
      generationId,
      category: "invalid-mutation",
      reason,
      payload: mutation,
      quarantinedAt: new Date().toISOString(),
    };
    this.quarantine.set(record.id, record);
  }

  async listQuarantine(userId: string): Promise<QuarantinedCloudRecord[]> {
    return [...this.quarantine.values()].filter(
      (record) => record.ownerUserId === userId,
    );
  }

  async clearQuarantineCategory(
    userId: string,
    category: QuarantinedCloudRecord["category"],
  ): Promise<void> {
    for (const [key, record] of this.quarantine) {
      if (record.ownerUserId === userId && record.category === category) {
        this.quarantine.delete(key);
      }
    }
  }

  async importLegacyOnce(
    userId: string,
    input: LegacyJournalImport,
  ): Promise<void> {
    if (this.migratedUsers.has(userId)) return;
    const generationId = await this.getOrCreateGeneration(userId);

    for (const candidate of input.mutations) {
      const mutation = withGeneration(candidate, generationId);
      try {
        validateStoredCloudMutation(mutation);
        this.mutations.set(
          mutationStorageKey(userId, generationId, mutation.id),
          mutation,
        );
      } catch (error) {
        const record: QuarantinedCloudRecord = {
          id: createOpaqueId("quarantine"),
          ownerUserId: userId,
          generationId,
          category: "invalid-mutation",
          reason:
            error instanceof ImportValidationError
              ? `${error.path}: ${error.reason}`
              : "mutation legacy invalide",
          payload: candidate,
          quarantinedAt: new Date().toISOString(),
        };
        this.quarantine.set(record.id, record);
      }
    }
    input.quarantine.forEach((record) => this.quarantine.set(record.id, record));
    this.migratedUsers.add(userId);
  }

  seedRawMutation(mutation: StoredCloudMutation): void {
    this.generations.set(mutation.ownerUserId, mutation.generationId);
    this.mutations.set(
      mutationStorageKey(
        mutation.ownerUserId,
        mutation.generationId,
        mutation.id,
      ),
      mutation,
    );
  }
}

let defaultJournal: CloudMutationJournal | null = null;

export function getCloudMutationJournal(): CloudMutationJournal {
  defaultJournal ??= new IndexedDbCloudMutationJournal();
  return defaultJournal;
}
