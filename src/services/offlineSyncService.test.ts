import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCloudMutationJournal } from "@/lib/cloudMutationJournal";
import {
  createProfileMutationDraft,
  createProfilePatchMutationDraft,
  createWeightMutationDraft,
} from "@/lib/nonMealData";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile, StoredCloudMutation } from "@/lib/types";
import type { UserCloudLockHandle } from "@/lib/userCloudLock";

const applyNonMealMutationMock = vi.hoisted(() => vi.fn());
const upsertMealObservationMock = vi.hoisted(() => vi.fn());
const deleteMealObservationMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/cloudDataService", () => ({
  applyNonMealMutation: applyNonMealMutationMock,
}));
vi.mock("@/services/mealService", () => ({
  deleteMealObservation: deleteMealObservationMock,
  upsertMealObservation: upsertMealObservationMock,
}));

import {
  createMealDeleteMutation,
  createOfflineSyncService,
  prepareNextCloudOperation,
} from "@/services/offlineSyncService";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function profile(): Profile {
  return {
    firstName: "Olaf",
    age: 39,
    heightCm: 180,
    startWeightKg: 150,
    goalWeightKg: 100,
    startDate: "2026-07-01",
    initialFriction: "unknown",
    smokingStatus: "non-renseigne",
    showActiveMission: true,
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt: "2026-07-01T08:00:00.000Z",
  };
}

function weight(date: string, weightKg: number) {
  return {
    id: `weight-${date}-${weightKg}`,
    date,
    time: "08:00",
    weightKg,
    createdAt: `${date}T06:00:00.000Z`,
  };
}

const supabase = createClient<Database>("https://example.supabase.co", "anon-key");

function lockRunner<T>(
  _userId: string,
  callback: (handle: UserCloudLockHandle) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  return callback({
    token: "test-lock",
    signal: controller.signal,
    assertOwned: async () => undefined,
    markMutationUncertain: () => undefined,
  });
}

describe("journal et coordinateur cloud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
    applyNonMealMutationMock.mockResolvedValue(undefined);
    upsertMealObservationMock.mockResolvedValue(undefined);
    deleteMealObservationMock.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("ne perd aucun append concurrent entre deux instances", async () => {
    const journal = new MemoryCloudMutationJournal();
    const first = createOfflineSyncService(journal, lockRunner);
    const second = createOfflineSyncService(journal, lockRunner);

    await Promise.all([
      first.queueNonMealMutations("user-a", [
        createWeightMutationDraft(weight("2026-07-14", 150)),
      ]),
      second.queueNonMealMutations("user-a", [
        createWeightMutationDraft(weight("2026-07-15", 149)),
      ]),
    ]);

    expect((await first.getSnapshot("user-a")).mutations).toHaveLength(2);
  });

  it("ne lance aucun appel cloud si le journal refuse la persistance", async () => {
    class FailingJournal extends MemoryCloudMutationJournal {
      override async appendBatch(): Promise<void> {
        throw new Error("device storage unavailable");
      }
    }
    const service = createOfflineSyncService(new FailingJournal(), lockRunner);

    await expect(
      service.queueNonMealMutations("user-a", [
        createWeightMutationDraft(weight("2026-07-15", 149)),
      ]),
    ).rejects.toThrow("device storage unavailable");
    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
  });

  it("n’acquitte pas une mutation ajoutée pendant l’appel réseau", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    const firstWrite = deferred();
    applyNonMealMutationMock
      .mockImplementationOnce(() => firstWrite.promise)
      .mockResolvedValue(undefined);
    await service.queueNonMealMutations("user-a", [
      createProfilePatchMutationDraft({ firstName: "Avant" })!,
    ]);

    const drain = service.processPendingCloudWork(supabase, "user-a");
    await vi.waitFor(() => expect(applyNonMealMutationMock).toHaveBeenCalledTimes(1));
    await service.queueNonMealMutations("user-a", [
      createProfilePatchMutationDraft({ firstName: "Après" })!,
    ]);
    firstWrite.resolve();
    await drain;

    expect(applyNonMealMutationMock).toHaveBeenCalledTimes(2);
    expect(await service.hasPendingCloudWork("user-a")).toBe(false);
  });

  it("offre la même garantie d’acquittement exact aux repas", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    const firstWrite = deferred();
    deleteMealObservationMock
      .mockImplementationOnce(() => firstWrite.promise)
      .mockResolvedValue(undefined);
    await service.queueMealMutations("user-a", [
      createMealDeleteMutation("user-a", "2026-07-15T12:00:00.000Z"),
    ]);

    const drain = service.processPendingCloudWork(supabase, "user-a");
    await vi.waitFor(() => expect(deleteMealObservationMock).toHaveBeenCalledTimes(1));
    await service.queueMealMutations("user-a", [
      createMealDeleteMutation("user-a", "2026-07-15T13:00:00.000Z"),
    ]);
    firstWrite.resolve();
    await drain;

    expect(deleteMealObservationMock).toHaveBeenCalledTimes(2);
    expect(await service.hasPendingCloudWork("user-a")).toBe(false);
  });

  it("conserve une mutation repas après échec puis la rejoue", async () => {
    const service = createOfflineSyncService(
      new MemoryCloudMutationJournal(),
      lockRunner,
    );
    deleteMealObservationMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    await service.queueMealMutations("user-a", [
      createMealDeleteMutation("user-a", "2026-07-15T12:00:00.000Z"),
    ]);

    await expect(
      service.processPendingCloudWork(supabase, "user-a"),
    ).rejects.toThrow("offline");
    expect(await service.hasPendingCloudWork("user-a")).toBe(true);

    await service.processPendingCloudWork(supabase, "user-a");
    expect(await service.hasPendingCloudWork("user-a")).toBe(false);
  });

  it("garde create puis patch profil dans deux opérations distinctes", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    await service.queueNonMealMutations("user-a", [
      createProfileMutationDraft(profile()),
      createProfilePatchMutationDraft({ darkMode: true })!,
      createProfilePatchMutationDraft({ showActiveMission: false })!,
    ]);
    const snapshot = (await service.getSnapshot("user-a")).mutations;
    const create = prepareNextCloudOperation(snapshot);
    if (!create) throw new Error("Création attendue");
    const afterCreate = snapshot.filter(
      (mutation) => !create.sourceMutationIds.includes(mutation.id),
    );
    const patch = prepareNextCloudOperation(afterCreate);

    expect(create.operation).toMatchObject({
      kind: "non-meal",
      payload: { entity: "profile", action: "create" },
    });
    expect(create.sourceMutationIds).toHaveLength(1);
    expect(patch).toMatchObject({
      operation: {
        payload: {
          entity: "profile",
          action: "patch",
          patch: { darkMode: true, showActiveMission: false },
        },
      },
    });
    expect(patch?.sourceMutationIds).toHaveLength(2);
  });

  it("envoie le patch même si la create précédente est un no-op cloud", async () => {
    const service = createOfflineSyncService(
      new MemoryCloudMutationJournal(),
      lockRunner,
    );
    await service.queueNonMealMutations("user-a", [
      createProfileMutationDraft(profile()),
      createProfilePatchMutationDraft({ showActiveMission: false })!,
    ]);

    await service.processPendingCloudWork(supabase, "user-a");

    expect(applyNonMealMutationMock).toHaveBeenNthCalledWith(
      1,
      supabase,
      "user-a",
      expect.objectContaining({ entity: "profile", action: "create" }),
      expect.any(AbortSignal),
    );
    expect(applyNonMealMutationMock).toHaveBeenNthCalledWith(
      2,
      supabase,
      "user-a",
      expect.objectContaining({
        entity: "profile",
        action: "patch",
        patch: { showActiveMission: false },
      }),
      expect.any(AbortSignal),
    );
  });

  it("conserve un patch non acquitté lorsque l’update profil échoue", async () => {
    const service = createOfflineSyncService(
      new MemoryCloudMutationJournal(),
      lockRunner,
    );
    applyNonMealMutationMock.mockRejectedValueOnce(new Error("zero rows"));
    await service.queueNonMealMutations("user-a", [
      createProfilePatchMutationDraft({ darkMode: true })!,
    ]);

    await expect(
      service.processPendingCloudWork(supabase, "user-a"),
    ).rejects.toThrow("zero rows");
    expect(await service.hasPendingCloudWork("user-a")).toBe(true);
  });

  it("garde la file intacte si aucun verrou sûr n’est disponible", async () => {
    const service = createOfflineSyncService(
      new MemoryCloudMutationJournal(),
      async () => { throw new Error("lock unavailable"); },
    );
    await service.queueNonMealMutations("user-a", [
      createWeightMutationDraft(weight("2026-07-15", 149)),
    ]);

    await expect(
      service.processPendingCloudWork(supabase, "user-a"),
    ).rejects.toThrow("lock unavailable");
    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(await service.hasPendingCloudWork("user-a")).toBe(true);
  });

  it("une rotation empêche un ancien acquittement d’effacer la nouvelle génération", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    await service.queueNonMealMutations("user-a", [
      createWeightMutationDraft(weight("2026-07-14", 150)),
    ]);
    const old = await service.getSnapshot("user-a");
    await service.rotatePendingGeneration("user-a");
    await service.queueNonMealMutations("user-a", [
      createWeightMutationDraft(weight("2026-07-15", 149)),
    ]);
    await journal.acknowledgeExact(
      "user-a",
      old.generationId,
      old.mutations.map((mutation) => mutation.id),
    );

    expect((await service.getSnapshot("user-a")).mutations).toHaveLength(1);
  });

  it("met V1-V3 en quarantaine sans envoi automatique", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    window.localStorage.setItem(
      "projet-centenaire-pending-cloud-sync-v1:user:user-a",
      JSON.stringify({
        version: 3,
        ownerUserId: "user-a",
        data: { weights: [weight("2026-07-15", 149)] },
      }),
    );

    await service.processPendingCloudWork(supabase, "user-a");

    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(await service.listQuarantine("user-a")).toMatchObject([
      { category: "legacy-snapshot", ownerUserId: "user-a" },
    ]);
  });

  it("ne montre ni n’envoie la quarantaine de A depuis B", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    window.localStorage.setItem(
      "projet-centenaire-pending-cloud-sync-v1:user:user-a",
      JSON.stringify({
        version: 2,
        ownerUserId: "user-a",
        data: { weights: [weight("2026-07-15", 149)] },
      }),
    );
    await service.ensureLegacyQueuesMigrated("user-a");

    await service.processPendingCloudWork(supabase, "user-b");

    expect(await service.listQuarantine("user-b")).toEqual([]);
    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(await service.listQuarantine("user-a")).toHaveLength(1);
  });

  it("canonicalise et coalesce deux suppressions repas équivalentes", async () => {
    const service = createOfflineSyncService(
      new MemoryCloudMutationJournal(),
      lockRunner,
    );
    await service.queueMealMutations("user-a", [
      createMealDeleteMutation("user-a", "2026-07-15T12:00:00.000Z"),
      createMealDeleteMutation("user-a", "2026-07-15T14:00:00.000+02:00"),
    ]);
    const prepared = prepareNextCloudOperation(
      (await service.getSnapshot("user-a")).mutations,
    );

    expect(prepared?.sourceMutationIds).toHaveLength(2);
    expect(prepared?.operation).toMatchObject({
      kind: "meal",
      payload: { entityKey: "2026-07-15T12:00:00.000Z" },
    });
  });

  it("migre V4 et la file repas V1 une seule fois puis retire les sources", async () => {
    const journal = new MemoryCloudMutationJournal();
    const service = createOfflineSyncService(journal, lockRunner);
    const nonMealKey =
      "projet-centenaire-pending-cloud-sync-v1:user:user-a";
    const mealKey = "projet-centenaire-meal-mutations-v1:user:user-a";
    window.localStorage.setItem(
      nonMealKey,
      JSON.stringify({
        version: 4,
        ownerUserId: "user-a",
        mutations: [{
          id: "legacy-weight",
          ownerUserId: "user-a",
          epoch: 1,
          entity: "weight",
          action: "upsert",
          entityKey: "2026-07-15",
          payload: weight("2026-07-15", 149),
          queuedAt: "2026-07-15T08:00:00.000Z",
        }],
      }),
    );
    window.localStorage.setItem(
      mealKey,
      JSON.stringify({
        version: 1,
        ownerUserId: "user-a",
        mutations: [{
          id: "legacy-meal-delete",
          ownerUserId: "user-a",
          entity: "meal",
          action: "delete",
          entityKey: "2026-07-15T12:00:00.000Z",
          createdAt: "2026-07-15T12:00:00.000Z",
          queuedAt: "2026-07-15T08:01:00.000Z",
        }],
      }),
    );

    await service.ensureLegacyQueuesMigrated("user-a");
    await service.ensureLegacyQueuesMigrated("user-a");

    expect((await service.getSnapshot("user-a")).mutations).toHaveLength(2);
    expect(window.localStorage.getItem(nonMealKey)).toBeNull();
    expect(window.localStorage.getItem(mealKey)).toBeNull();
  });

  it("quarantaine un ancien record invalide et traite le suivant", async () => {
    const journal = new MemoryCloudMutationJournal();
    const generationId = await journal.getOrCreateGeneration("user-a");
    const invalid: StoredCloudMutation = {
      id: "invalid",
      ownerUserId: "user-a",
      generationId,
      kind: "non-meal",
      queuedAt: "2026-07-15T08:00:00.000Z",
      payload: {
        entity: "weight",
        action: "upsert",
        entityKey: "2026-07-15",
        payload: { ...weight("2026-07-15", 149), time: "99:99" },
      },
    };
    journal.seedRawMutation(invalid);
    const service = createOfflineSyncService(journal, lockRunner);
    await service.queueNonMealMutations("user-a", [
      createWeightMutationDraft(weight("2026-07-16", 148)),
    ]);

    await service.processPendingCloudWork(supabase, "user-a");

    expect(applyNonMealMutationMock).toHaveBeenCalledTimes(1);
    expect(await service.listQuarantine("user-a")).toHaveLength(1);
  });
});
