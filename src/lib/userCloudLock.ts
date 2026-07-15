import {
  LEASES_STORE,
  JournalUnavailableError,
  openCloudJournalDatabase,
} from "@/lib/cloudMutationJournal";

export type CloudLeaseRecord = {
  userId: string;
  ownerId: string;
  token: string;
  expiresAt: number;
  takeoverNotBefore: number;
};

export interface CloudLeaseBackend {
  tryAcquire(record: CloudLeaseRecord, now: number): Promise<boolean>;
  renew(
    userId: string,
    ownerId: string,
    token: string,
    expiresAt: number,
    takeoverNotBefore: number,
  ): Promise<boolean>;
  verify(
    userId: string,
    ownerId: string,
    token: string,
    now: number,
  ): Promise<boolean>;
  release(userId: string, ownerId: string, token: string): Promise<void>;
}

export type UserCloudLockHandle = {
  token: string;
  signal: AbortSignal;
  assertOwned(): Promise<void>;
  markMutationUncertain(): void;
};

export type UserCloudLockOptions = {
  backend?: CloudLeaseBackend;
  ownerId?: string;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  leaseMs?: number;
  renewEveryMs?: number;
  maxMutationRequestMs?: number;
  takeoverSafetyMs?: number;
  disableWebLocks?: boolean;
};

export class CloudLockUnavailableError extends Error {
  constructor(message = "Le verrou de synchronisation est indisponible.") {
    super(message);
    this.name = "CloudLockUnavailableError";
  }
}

export class CloudLockLostError extends Error {
  constructor(message = "Le verrou de synchronisation a été perdu.") {
    super(message);
    this.name = "CloudLockLostError";
  }
}

export class CloudMutationTimeoutError extends Error {
  constructor() {
    super("La requête cloud a dépassé sa durée maximale.");
    this.name = "CloudMutationTimeoutError";
  }
}

const LOCK_NAME_PREFIX = "projet-centenaire-cloud:user:";
const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_MAX_MUTATION_REQUEST_MS = 15_000;
const DEFAULT_TAKEOVER_SAFETY_MS = 20_000;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const contextOwnerId = createId("context");

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new CloudLockUnavailableError());
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new CloudLockUnavailableError());
    transaction.onerror = () =>
      reject(transaction.error ?? new CloudLockUnavailableError());
  });
}

export class IndexedDbCloudLeaseBackend implements CloudLeaseBackend {
  async tryAcquire(record: CloudLeaseRecord, now: number): Promise<boolean> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(LEASES_STORE, "readwrite");
    const store = transaction.objectStore(LEASES_STORE);
    const current = await requestResult<CloudLeaseRecord | undefined>(
      store.get(record.userId),
    );
    const acquired = !current || now >= current.takeoverNotBefore;

    if (acquired) {
      store.put(record);
    }

    await transactionDone(transaction);
    database.close();
    return acquired;
  }

  async renew(
    userId: string,
    ownerId: string,
    token: string,
    expiresAt: number,
    takeoverNotBefore: number,
  ): Promise<boolean> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(LEASES_STORE, "readwrite");
    const store = transaction.objectStore(LEASES_STORE);
    const current = await requestResult<CloudLeaseRecord | undefined>(
      store.get(userId),
    );
    const owned = current?.ownerId === ownerId && current.token === token;

    if (owned) {
      store.put({
        userId,
        ownerId,
        token,
        expiresAt,
        takeoverNotBefore,
      } satisfies CloudLeaseRecord);
    }

    await transactionDone(transaction);
    database.close();
    return owned;
  }

  async verify(
    userId: string,
    ownerId: string,
    token: string,
    now: number,
  ): Promise<boolean> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(LEASES_STORE, "readonly");
    const current = await requestResult<CloudLeaseRecord | undefined>(
      transaction.objectStore(LEASES_STORE).get(userId),
    );
    await transactionDone(transaction);
    database.close();
    return (
      current?.ownerId === ownerId &&
      current.token === token &&
      now < current.expiresAt
    );
  }

  async release(
    userId: string,
    ownerId: string,
    token: string,
  ): Promise<void> {
    const database = await openCloudJournalDatabase();
    const transaction = database.transaction(LEASES_STORE, "readwrite");
    const store = transaction.objectStore(LEASES_STORE);
    const current = await requestResult<CloudLeaseRecord | undefined>(
      store.get(userId),
    );

    if (current?.ownerId === ownerId && current.token === token) {
      store.delete(userId);
    }

    await transactionDone(transaction);
    database.close();
  }
}

export class MemoryCloudLeaseBackend implements CloudLeaseBackend {
  private leases = new Map<string, CloudLeaseRecord>();
  unavailable = false;

  private assertAvailable(): void {
    if (this.unavailable) throw new CloudLockUnavailableError();
  }

  async tryAcquire(record: CloudLeaseRecord, now: number): Promise<boolean> {
    this.assertAvailable();
    const current = this.leases.get(record.userId);
    if (current && now < current.takeoverNotBefore) return false;
    this.leases.set(record.userId, { ...record });
    return true;
  }

  async renew(
    userId: string,
    ownerId: string,
    token: string,
    expiresAt: number,
    takeoverNotBefore: number,
  ): Promise<boolean> {
    this.assertAvailable();
    const current = this.leases.get(userId);
    if (current?.ownerId !== ownerId || current.token !== token) return false;
    this.leases.set(userId, {
      userId,
      ownerId,
      token,
      expiresAt,
      takeoverNotBefore,
    });
    return true;
  }

  async verify(
    userId: string,
    ownerId: string,
    token: string,
    now: number,
  ): Promise<boolean> {
    this.assertAvailable();
    const current = this.leases.get(userId);
    return (
      current?.ownerId === ownerId &&
      current.token === token &&
      now < current.expiresAt
    );
  }

  async release(
    userId: string,
    ownerId: string,
    token: string,
  ): Promise<void> {
    this.assertAvailable();
    const current = this.leases.get(userId);
    if (current?.ownerId === ownerId && current.token === token) {
      this.leases.delete(userId);
    }
  }

  forceLease(record: CloudLeaseRecord): void {
    this.leases.set(record.userId, { ...record });
  }

  getLease(userId: string): CloudLeaseRecord | null {
    const lease = this.leases.get(userId);
    return lease ? { ...lease } : null;
  }
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function webLockHandle(): UserCloudLockHandle {
  const controller = new AbortController();
  return {
    token: "navigator-lock",
    signal: controller.signal,
    assertOwned: async () => undefined,
    markMutationUncertain: () => undefined,
  };
}

async function withIndexedDbLease<T>(
  userId: string,
  callback: (handle: UserCloudLockHandle) => Promise<T>,
  options: UserCloudLockOptions,
): Promise<T> {
  const backend = options.backend ?? new IndexedDbCloudLeaseBackend();
  const ownerId = options.ownerId ?? contextOwnerId;
  const token = createId("lease");
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  const renewEveryMs = options.renewEveryMs ?? Math.floor(leaseMs / 3);
  const maxMutationRequestMs =
    options.maxMutationRequestMs ?? DEFAULT_MAX_MUTATION_REQUEST_MS;
  const takeoverSafetyMs =
    options.takeoverSafetyMs ?? DEFAULT_TAKEOVER_SAFETY_MS;
  const wakeChannel =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(`${LOCK_NAME_PREFIX}wake`)
      : null;
  const makeLease = (): CloudLeaseRecord => {
    const acquiredAt = now();
    const expiresAt = acquiredAt + leaseMs;
    return {
      userId,
      ownerId,
      token,
      expiresAt,
      takeoverNotBefore:
        expiresAt + maxMutationRequestMs + takeoverSafetyMs,
    };
  };

  try {
    while (true) {
      let acquired: boolean;
      try {
        acquired = await backend.tryAcquire(makeLease(), now());
      } catch (error) {
        throw error instanceof JournalUnavailableError
          ? new CloudLockUnavailableError()
          : error;
      }
      if (acquired) break;
      await sleep(Math.min(250, Math.max(25, Math.floor(leaseMs / 10))));
    }

    const controller = new AbortController();
    let lostError: Error | null = null;
    let mutationUncertain = false;
    let renewalRunning = false;
    const markLost = (error: Error) => {
      if (lostError) return;
      lostError = error;
      controller.abort(error);
    };
    const assertOwned = async (): Promise<void> => {
      if (lostError) throw lostError;
      let owned: boolean;
      try {
        owned = await backend.verify(userId, ownerId, token, now());
      } catch (error) {
        const unavailable =
          error instanceof Error ? error : new CloudLockUnavailableError();
        markLost(unavailable);
        throw unavailable;
      }
      if (!owned) {
        const error = new CloudLockLostError();
        markLost(error);
        throw error;
      }
    };
    const renewal = globalThis.setInterval(() => {
      if (renewalRunning || lostError) return;
      renewalRunning = true;
      const lease = makeLease();
      void backend
        .renew(
          userId,
          ownerId,
          token,
          lease.expiresAt,
          lease.takeoverNotBefore,
        )
        .then((renewed) => {
          if (!renewed) markLost(new CloudLockLostError());
        })
        .catch((error: unknown) => {
          markLost(
            error instanceof Error ? error : new CloudLockUnavailableError(),
          );
        })
        .finally(() => {
          renewalRunning = false;
        });
    }, renewEveryMs);

    let callbackError: unknown;
    try {
      await assertOwned();
      return await callback({
        token,
        signal: controller.signal,
        assertOwned,
        markMutationUncertain: () => {
          mutationUncertain = true;
        },
      });
    } catch (error) {
      callbackError = error;
      throw error;
    } finally {
      globalThis.clearInterval(renewal);
      try {
        if (!mutationUncertain) {
          await backend.release(userId, ownerId, token);
          wakeChannel?.postMessage(userId);
        }
      } catch (releaseError) {
        if (callbackError === undefined) {
          throw releaseError;
        }
      }
    }
  } finally {
    wakeChannel?.close();
  }
}

export async function withUserCloudLock<T>(
  userId: string,
  callback: (handle: UserCloudLockHandle) => Promise<T>,
  options: UserCloudLockOptions = {},
): Promise<T> {
  if (
    !options.disableWebLocks &&
    typeof navigator !== "undefined" &&
    navigator.locks
  ) {
    return navigator.locks.request(
      `${LOCK_NAME_PREFIX}${userId}`,
      { mode: "exclusive" },
      () => callback(webLockHandle()),
    );
  }

  return withIndexedDbLease(userId, callback, options);
}

export async function runCloudMutationWithTimeout<T>(
  handle: UserCloudLockHandle,
  operation: (signal: AbortSignal) => Promise<T>,
  maximumMs = DEFAULT_MAX_MUTATION_REQUEST_MS,
): Promise<T> {
  await handle.assertOwned();
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(handle.signal.reason);
  handle.signal.addEventListener("abort", forwardAbort, { once: true });
  const timeout = globalThis.setTimeout(
    () => {
      handle.markMutationUncertain();
      controller.abort(new CloudMutationTimeoutError());
    },
    maximumMs,
  );

  try {
    const aborted = new Promise<never>((_resolve, reject) => {
      const rejectOnAbort = () => {
        reject(
          controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new CloudMutationTimeoutError(),
        );
      };
      if (controller.signal.aborted) rejectOnAbort();
      else controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
    });
    const result = await Promise.race([operation(controller.signal), aborted]);
    if (controller.signal.aborted) {
      throw controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new CloudMutationTimeoutError();
    }
    await handle.assertOwned();
    return result;
  } finally {
    globalThis.clearTimeout(timeout);
    handle.signal.removeEventListener("abort", forwardAbort);
  }
}
