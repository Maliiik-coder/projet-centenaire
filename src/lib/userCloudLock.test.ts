import { describe, expect, it, vi } from "vitest";
import {
  CloudLockUnavailableError,
  MemoryCloudLeaseBackend,
  runCloudMutationWithTimeout,
  withUserCloudLock,
} from "@/lib/userCloudLock";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("withUserCloudLock", () => {
  it("sérialise deux contextes sur un bail atomique partagé", async () => {
    const backend = new MemoryCloudLeaseBackend();
    const firstNetwork = deferred();
    const waiters: Array<() => void> = [];
    const order: string[] = [];
    let active = 0;
    let maximumActive = 0;
    const sleep = () =>
      new Promise<void>((resolve) => {
        waiters.push(resolve);
      });

    const first = withUserCloudLock(
      "user-a",
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        order.push("a-start");
        await firstNetwork.promise;
        order.push("a-end");
        active -= 1;
      },
      {
        backend,
        ownerId: "context-a",
        disableWebLocks: true,
        leaseMs: 60_000,
        renewEveryMs: 50_000,
        sleep,
      },
    );
    const second = withUserCloudLock(
      "user-a",
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        order.push("b");
        active -= 1;
      },
      {
        backend,
        ownerId: "context-b",
        disableWebLocks: true,
        leaseMs: 60_000,
        renewEveryMs: 50_000,
        sleep,
      },
    );

    await vi.waitFor(() => expect(order).toEqual(["a-start"]));
    firstNetwork.resolve();
    await first;
    waiters.splice(0).forEach((release) => release());
    await second;

    expect(maximumActive).toBe(1);
    expect(order).toEqual(["a-start", "a-end", "b"]);
  });

  it("refuse la section critique lorsque le backend est indisponible", async () => {
    const backend = new MemoryCloudLeaseBackend();
    backend.unavailable = true;
    let callbackCalled = false;

    await expect(
      withUserCloudLock(
        "user-a",
        async () => {
          callbackCalled = true;
        },
        { backend, disableWebLocks: true },
      ),
    ).rejects.toBeInstanceOf(CloudLockUnavailableError);
    expect(callbackCalled).toBe(false);
  });

  it("attend takeoverNotBefore même après expiresAt", async () => {
    const backend = new MemoryCloudLeaseBackend();
    let now = 1_000;
    backend.forceLease({
      userId: "user-a",
      ownerId: "closed-context",
      token: "old-token",
      expiresAt: 1_010,
      takeoverNotBefore: 1_100,
    });
    let sleepCount = 0;

    await withUserCloudLock("user-a", async () => undefined, {
      backend,
      ownerId: "new-context",
      disableWebLocks: true,
      now: () => now,
      sleep: async () => {
        sleepCount += 1;
        now = 1_101;
      },
    });

    expect(sleepCount).toBe(1);
  });

  it("borne une mutation qui ignore le signal et conserve le bail de sécurité", async () => {
    vi.useFakeTimers();
    const backend = new MemoryCloudLeaseBackend();
    const never = new Promise<void>(() => undefined);
    const attempt = withUserCloudLock(
      "user-a",
      (handle) =>
        runCloudMutationWithTimeout(handle, async () => never, 50),
      {
        backend,
        disableWebLocks: true,
        leaseMs: 1_000,
        renewEveryMs: 900,
      },
    );
    const result = attempt.catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toMatchObject({
      name: "CloudMutationTimeoutError",
    });

    expect(backend.getLease("user-a")).not.toBeNull();
    vi.useRealTimers();
  });
});
