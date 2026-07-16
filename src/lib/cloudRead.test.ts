import { describe, expect, it, vi } from "vitest";
import {
  CLOUD_RECOVERY_DELAY_MS,
  DEFAULT_CLOUD_READ_TIMEOUT_MS,
  withCloudReadTimeout,
} from "@/lib/cloudRead";
import { MemoryCloudMutationJournal } from "@/lib/cloudMutationJournal";
import { createWeightMutationDraft } from "@/lib/nonMealData";
import type { UserCloudLockHandle } from "@/lib/userCloudLock";
import { createOfflineSyncService } from "@/services/offlineSyncService";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

describe("withCloudReadTimeout", () => {
  it("laisse suffisamment de temps à une lecture mobile et retente rapidement", () => {
    expect(DEFAULT_CLOUD_READ_TIMEOUT_MS).toBe(12_000);
    expect(CLOUD_RECOVERY_DELAY_MS).toBe(3_000);
  });

  it("n’efface aucun record du journal lorsqu’une lecture expire", async () => {
    vi.useFakeTimers();
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(
      journal,
      <T>(
        _userId: string,
        callback: (handle: UserCloudLockHandle) => Promise<T>,
      ) => {
        const controller = new AbortController();
        return callback({
          token: "test",
          signal: controller.signal,
          assertOwned: async () => undefined,
          markMutationUncertain: () => undefined,
        });
      },
    );
    await service.queueNonMealMutations("user-a", [
      createWeightMutationDraft({
        id: "weight-15",
        date: "2026-07-15",
        time: "08:00",
        weightKg: 149,
        createdAt: "2026-07-15T06:00:00.000Z",
      }),
    ]);
    const before = await service.getSnapshot("user-a");
    const read = deferred<string>();
    const timeout = withCloudReadTimeout(read.promise, 50).catch(
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(50);
    await expect(timeout).resolves.toEqual(new Error("Cloud read timeout"));
    expect((await service.getSnapshot("user-a")).mutations.map(({ id }) => id))
      .toEqual(before.mutations.map(({ id }) => id));

    read.resolve("late-result");
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });
});
