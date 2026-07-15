import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyData,
  localDataStore,
  userStorageScope,
} from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";

const loadCloudDataMock = vi.hoisted(() => vi.fn());
const clearMigrationOperationMock = vi.hoisted(() => vi.fn());
const rotatePendingGenerationMock = vi.hoisted(() => vi.fn());
const waitForCloudWorkToSettleMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/cloudDataService", () => ({
  loadCloudData: loadCloudDataMock,
}));
vi.mock("@/services/localMigrationService", () => ({
  clearMigrationOperationDuringConnectedReset: clearMigrationOperationMock,
}));
vi.mock("@/services/offlineSyncService", () => ({
  rotatePendingGeneration: rotatePendingGenerationMock,
  waitForCloudWorkToSettle: waitForCloudWorkToSettleMock,
}));
vi.mock("@/lib/userCloudLock", () => ({
  withUserCloudLock: async (
    _userId: string,
    callback: (handle: { assertOwned: () => Promise<void> }) => Promise<unknown>,
  ) => callback({ assertOwned: async () => undefined }),
}));

import { resetConnectedLocalData } from "@/services/connectedResetService";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

const supabase = createClient<Database>("https://example.supabase.co", "anon-key");

describe("resetConnectedLocalData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
    rotatePendingGenerationMock.mockResolvedValue("generation-next");
    waitForCloudWorkToSettleMock.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("tourne la génération avant de recharger le miroir cloud", async () => {
    const cloudData = {
      ...createEmptyData(),
      weights: [{
        id: "cloud-weight",
        date: "2026-07-14",
        time: "08:00",
        weightKg: 149,
        createdAt: "2026-07-14T06:00:00.000Z",
      }],
    };
    loadCloudDataMock.mockResolvedValue(cloudData);

    await expect(resetConnectedLocalData(supabase, "user-a")).resolves.toEqual(
      cloudData,
    );

    expect(rotatePendingGenerationMock.mock.invocationCallOrder[0]).toBeLessThan(
      loadCloudDataMock.mock.invocationCallOrder[0],
    );
    expect(clearMigrationOperationMock).toHaveBeenCalledWith("user-a");
    expect(localDataStore.load(userStorageScope("user-a"))).toEqual(cloudData);
  });

  it("ne restaure pas l’ancien miroir si le rechargement échoue", async () => {
    localDataStore.save(userStorageScope("user-a"), {
      ...createEmptyData(),
      weights: [{
        id: "old",
        date: "2026-07-15",
        time: "08:00",
        weightKg: 151,
        createdAt: "2026-07-15T06:00:00.000Z",
      }],
    });
    loadCloudDataMock.mockRejectedValue(new Error("offline"));

    await expect(resetConnectedLocalData(supabase, "user-a")).rejects.toThrow(
      "offline",
    );
    expect(localDataStore.load(userStorageScope("user-a"))).toEqual(
      createEmptyData(),
    );
  });
});
