import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_COMPONENTS, buildImmediateFinding } from "@/lib/analytics";
import { createEmptyData } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AppData,
  MealEntry,
  NonMealMutationDraft,
  Profile,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";

const loadCloudDataMock = vi.hoisted(() => vi.fn());
const applyNonMealMutationMock = vi.hoisted(() => vi.fn());
const upsertMealObservationMock = vi.hoisted(() => vi.fn());
const hasPendingCloudWorkMock = vi.hoisted(() => vi.fn());
const processPendingCloudWorkMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/cloudDataService", () => ({
  applyNonMealMutation: applyNonMealMutationMock,
  loadCloudData: loadCloudDataMock,
}));

vi.mock("@/services/mealService", () => ({
  upsertMealObservation: upsertMealObservationMock,
}));

vi.mock("@/services/offlineSyncService", () => ({
  hasPendingCloudWork: hasPendingCloudWorkMock,
  processPendingCloudWork: processPendingCloudWorkMock,
}));

vi.mock("@/lib/userCloudLock", () => ({
  withUserCloudLock: async (
    _userId: string,
    callback: (handle: {
      token: string;
      signal: AbortSignal;
      assertOwned: () => Promise<void>;
    }) => Promise<unknown>,
  ) => {
    const controller = new AbortController();
    return callback({
      token: "test-lock",
      signal: controller.signal,
      assertOwned: async () => undefined,
    });
  },
  runCloudMutationWithTimeout: async (
    _handle: unknown,
    operation: (signal: AbortSignal) => Promise<unknown>,
  ) => operation(new AbortController().signal),
}));

import {
  buildMigrationPlan,
  completeMigrationOperation,
  createLocalMigrationSources,
  discardPreparedMigrationOperation,
  executeMigrationOperation,
  getLocalMigrationCandidate,
  getMigrationOperation,
  isMigrationDecisionRequired,
  isMigrationOperationStarted,
  keepOnlyCloudData,
  mergeLocalAndCloudData,
  prepareMigrationOperation,
  reconcilePendingAfterCloudLoad,
} from "@/services/localMigrationService";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const supabase = createClient<Database>(
  "https://example.supabase.co",
  "anon-key",
);

function profile(firstName: string, darkMode = false): Profile {
  return {
    firstName,
    age: 39,
    heightCm: 180,
    startWeightKg: 150,
    goalWeightKg: 100,
    startDate: "2026-07-01",
    initialFriction: "unknown",
    smokingStatus: "non-renseigne",
    showActiveMission: true,
    darkMode,
    weeklyActivityGoal: 5,
    createdAt: "2026-07-01T08:00:00.000Z",
  };
}

function weight(
  id: string,
  date: string,
  weightKg: number,
  createdAt: string,
): WeightEntry {
  return { id, date, time: "08:00", weightKg, createdAt };
}

function smoking(
  id: string,
  state: SmokingEntry["state"],
  createdAt: string,
): SmokingEntry {
  return {
    id,
    date: "2026-07-15",
    time: "09:00",
    state,
    createdAt,
  };
}

function meal(id: string, createdAt: string): MealEntry {
  return {
    id,
    date: "2026-07-15",
    time: "12:00",
    kind: "dejeuner",
    freeText: id,
    quantity: "reasonable-plate",
    servingPattern: "none",
    hungerBefore: "yes",
    afterMeal: "fine",
    fullnessAfter: "fine",
    stopReason: "rassasie",
    snackingAfter: "non",
    starterTaken: false,
    starterText: null,
    dessertTaken: false,
    dessertText: null,
    snackTrigger: null,
    snackContext: null,
    clarifications: [],
    questionnaireVersion: "v0.7",
    components: { ...EMPTY_COMPONENTS },
    finding: buildImmediateFinding({
      kind: "dejeuner",
      servingPattern: "none",
      hungerBefore: "yes",
      fullnessAfter: "fine",
      components: EMPTY_COMPONENTS,
    }),
    createdAt,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe("fusion et plan de migration", () => {
  it("conserve les contributions propres au cloud et au local", () => {
    const local = {
      ...createEmptyData(),
      profile: profile("Local"),
      meals: [meal("local", "2026-07-15T12:00:00.000Z")],
      weights: [
        weight("local", "2026-07-15", 149, "2026-07-15T06:00:00.000Z"),
      ],
      smokingEntries: [
        smoking("local", "envie", "2026-07-15T08:00:00.000Z"),
      ],
    };
    const cloud = {
      ...createEmptyData(),
      profile: profile("Cloud", true),
      meals: [meal("cloud", "2026-07-15T13:00:00.000Z")],
      weights: [
        weight("cloud", "2026-07-14", 150, "2026-07-14T06:00:00.000Z"),
      ],
      smokingEntries: [
        smoking("cloud", "cigarette", "2026-07-15T09:00:00.000Z"),
      ],
    };

    const merged = mergeLocalAndCloudData(local, cloud);

    expect(merged.profile).toMatchObject({ firstName: "Cloud", darkMode: true });
    expect(merged.meals.map((entry) => entry.id)).toEqual(["local", "cloud"]);
    expect(merged.weights).toHaveLength(2);
    expect(merged.smokingEntries).toHaveLength(2);
  });

  it("produit uniquement les mutations locales absentes ou plus récentes", () => {
    const local = {
      ...createEmptyData(),
      profile: profile("Local"),
      weights: [
        weight("local", "2026-07-15", 148, "2026-07-15T08:00:00.000Z"),
      ],
      meals: [meal("local-only", "2026-07-15T13:00:00.000Z")],
    };
    const cloud = {
      ...createEmptyData(),
      profile: profile("Cloud"),
      weights: [
        weight("cloud", "2026-07-15", 149, "2026-07-15T07:00:00.000Z"),
      ],
      meals: [meal("cloud", "2026-07-15T12:00:00.000Z")],
    };

    const plan = buildMigrationPlan(local, cloud);

    expect(plan.nonMealMutations).toMatchObject([
      { entity: "weight", entityKey: "2026-07-15", payload: { weightKg: 148 } },
    ]);
    expect(plan.mealUpserts).toMatchObject([{ id: "local-only" }]);
  });

  it("ne propose rien lorsque le local est vide", () => {
    const sources = createLocalMigrationSources(createEmptyData(), null);
    expect(getLocalMigrationCandidate(sources)).toBeNull();
  });
});

describe("MigrationOperation V4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCloudDataMock.mockReset();
    applyNonMealMutationMock.mockReset();
    upsertMealObservationMock.mockReset();
    hasPendingCloudWorkMock.mockReset();
    processPendingCloudWorkMock.mockReset();
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
    loadCloudDataMock.mockResolvedValue(createEmptyData());
    applyNonMealMutationMock.mockResolvedValue(undefined);
    upsertMealObservationMock.mockResolvedValue(undefined);
    hasPendingCloudWorkMock.mockResolvedValue(false);
    processPendingCloudWorkMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persiste une opération V4 bloquante", async () => {
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [meal("local", "2026-07-15T12:00:00.000Z")] },
    );

    expect(operation).toMatchObject({
      version: 4,
      revision: 1,
      status: "prepared",
      remainingMealUpserts: [{ id: "local" }],
    });
    expect(isMigrationDecisionRequired("unavailable", null, operation)).toBe(
      true,
    );
  });

  it("rebase seulement une opération prepared sur le cloud frais", async () => {
    const local = {
      ...createEmptyData(),
      profile: profile("Local"),
      meals: [meal("local", "2026-07-15T13:00:00.000Z")],
    };
    const c2 = {
      ...createEmptyData(),
      profile: profile("Cloud C2", true),
      meals: [meal("cloud", "2026-07-15T12:00:00.000Z")],
    };
    loadCloudDataMock
      .mockResolvedValueOnce(createEmptyData())
      .mockResolvedValueOnce(c2)
      .mockResolvedValueOnce({ ...c2, meals: [...c2.meals, local.meals[0]] });
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      local,
    );

    const result = await executeMigrationOperation(supabase, operation);

    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(upsertMealObservationMock).toHaveBeenCalledWith(
      supabase,
      "user-a",
      expect.objectContaining({ id: "local" }),
      expect.any(AbortSignal),
    );
    expect(result.profile).toMatchObject({ firstName: "Cloud C2", darkMode: true });
  });

  it("rejoue l’upsert complet lorsqu’un repas reste après un échec de tags", async () => {
    const localMeal = meal("local", "2026-07-15T13:00:00.000Z");
    upsertMealObservationMock
      .mockRejectedValueOnce(new Error("tags failed"))
      .mockResolvedValueOnce(undefined);
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [localMeal] },
    );

    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow(
      "tags failed",
    );
    const retry = getMigrationOperation("user-a");

    expect(retry).toMatchObject({
      status: "retry-required",
      remainingMealUpserts: [{ id: "local" }],
    });

    if (!retry) {
      throw new Error("L'opération de retry doit rester persistée.");
    }

    loadCloudDataMock.mockResolvedValue({
      ...createEmptyData(),
      meals: [localMeal],
    });
    await executeMigrationOperation(supabase, retry);

    expect(upsertMealObservationMock).toHaveBeenCalledTimes(2);
    expect(upsertMealObservationMock).toHaveBeenNthCalledWith(
      2,
      supabase,
      "user-a",
      localMeal,
      expect.any(AbortSignal),
    );
    expect(getMigrationOperation("user-a")?.remainingMealUpserts).toEqual([]);
  });

  it("persiste immédiatement chaque mutation hors repas réussie", async () => {
    const first = weight(
      "first",
      "2026-07-14",
      149,
      "2026-07-14T06:00:00.000Z",
    );
    const second = weight(
      "second",
      "2026-07-15",
      148,
      "2026-07-15T06:00:00.000Z",
    );
    applyNonMealMutationMock.mockImplementation(
      async (
        _client: unknown,
        _userId: string,
        mutation: NonMealMutationDraft,
      ) => {
        if (mutation.entity === "weight" && mutation.entityKey === second.date) {
          throw new Error("second failed");
        }
      },
    );
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), weights: [first, second] },
    );

    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow(
      "second failed",
    );

    expect(getMigrationOperation("user-a")).toMatchObject({
      status: "retry-required",
      remainingNonMealMutations: [
        { entity: "weight", entityKey: "2026-07-15" },
      ],
    });
  });

  it("ne publie jamais les opérations de migration dans la file normale", async () => {
    upsertMealObservationMock.mockRejectedValueOnce(new Error("offline"));
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [meal("local", "2026-07-15T12:00:00.000Z")] },
    );

    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow();

    expect(processPendingCloudWorkMock).not.toHaveBeenCalled();
  });

  it("interdit le refus après le démarrage", async () => {
    upsertMealObservationMock.mockRejectedValueOnce(new Error("offline"));
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [meal("local", "2026-07-15T12:00:00.000Z")] },
    );
    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow();

    expect(isMigrationOperationStarted(getMigrationOperation("user-a"))).toBe(
      true,
    );
    expect(
      await discardPreparedMigrationOperation(
        "user-a",
        operation.operationId,
        operation.revision,
      ),
    ).toBe(false);
  });

  it("claiming gagne atomiquement contre un refus concurrent", async () => {
    const cloudRead = deferred<AppData>();
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [meal("local", "2026-07-15T12:00:00.000Z")] },
    );
    loadCloudDataMock.mockImplementationOnce(() => cloudRead.promise);

    const execution = executeMigrationOperation(supabase, operation);
    await vi.waitFor(() =>
      expect(getMigrationOperation("user-a")?.status).toBe("claiming"),
    );
    await expect(
      discardPreparedMigrationOperation(
        "user-a",
        operation.operationId,
        operation.revision,
      ),
    ).resolves.toBe(false);

    cloudRead.resolve(createEmptyData());
    await execution;
  });

  it("execute s’arrête sans écriture lorsque le refus a gagné", async () => {
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "guest",
      { ...createEmptyData(), meals: [meal("local", "2026-07-15T12:00:00.000Z")] },
    );
    await expect(
      discardPreparedMigrationOperation(
        "user-a",
        operation.operationId,
        operation.revision,
      ),
    ).resolves.toBe(true);

    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow(
      "n’est plus disponible",
    );
    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(upsertMealObservationMock).not.toHaveBeenCalled();
    expect(getMigrationOperation("user-a")).toBeNull();
  });

  it("passe en retry sans écriture si la lecture cloud échoue après claiming", async () => {
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "legacy",
      { ...createEmptyData(), weights: [weight("local", "2026-07-15", 149, "2026-07-15T06:00:00.000Z")] },
    );
    loadCloudDataMock.mockRejectedValueOnce(new Error("cloud unavailable"));

    await expect(executeMigrationOperation(supabase, operation)).rejects.toThrow(
      "cloud unavailable",
    );

    expect(applyNonMealMutationMock).not.toHaveBeenCalled();
    expect(upsertMealObservationMock).not.toHaveBeenCalled();
    expect(getMigrationOperation("user-a")).toMatchObject({
      operationId: operation.operationId,
      source: "legacy",
      status: "retry-required",
    });
  });

  it("permet de garder le cloud tant que l'opération est prepared", async () => {
    const cloud = { ...createEmptyData(), profile: profile("Compte") };
    loadCloudDataMock.mockResolvedValue(cloud);
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "legacy",
      { ...createEmptyData(), profile: profile("Local") },
    );

    expect(await keepOnlyCloudData(supabase, "user-a")).toEqual(cloud);
    expect(
      await discardPreparedMigrationOperation(
        "user-a",
        operation.operationId,
        operation.revision,
      ),
    ).toBe(true);
    expect(getMigrationOperation("user-a")).toBeNull();
  });

  it("convertit une opération V2 sans perdre son repas restant", () => {
    const localMeal = meal("legacy", "2026-07-15T13:00:00.000Z");
    window.localStorage.setItem(
      "projet-centenaire-migration-operation-v1:user:user-a",
      JSON.stringify({
        version: 2,
        operationId: "migration-v2",
        ownerUserId: "user-a",
        source: "guest",
        status: "retry-required",
        createdAt: "2026-07-15T08:00:00.000Z",
        updatedAt: "2026-07-15T08:01:00.000Z",
        sourceData: { ...createEmptyData(), meals: [localMeal] },
        plan: {
          nonMealData: {
            profile: null,
            weights: [],
            activities: [],
            smokingEntries: [],
          },
          mealUpserts: [localMeal],
        },
      }),
    );

    expect(getMigrationOperation("user-a")).toMatchObject({
      version: 4,
      status: "retry-required",
      remainingMealUpserts: [{ id: "legacy" }],
    });
  });

  it("ne nettoie l'opération qu'après acquittement explicite", async () => {
    const operation = await prepareMigrationOperation(
      supabase,
      "user-a",
      "legacy",
      createEmptyData(),
    );
    await executeMigrationOperation(supabase, operation);

    expect(getMigrationOperation("user-a")).toMatchObject({ status: "started" });
    await completeMigrationOperation("user-a", operation.operationId);
    expect(getMigrationOperation("user-a")).toBeNull();
  });
});

describe("réconciliation stable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPendingCloudWorkMock.mockResolvedValue(false);
    processPendingCloudWorkMock.mockResolvedValue(undefined);
  });

  it("charge le cloud après le traitement du pending", async () => {
    const cloud = {
      ...createEmptyData(),
      weights: [
        weight("cloud", "2026-07-15", 148, "2026-07-15T06:00:00.000Z"),
      ],
    };
    loadCloudDataMock.mockResolvedValue(cloud);

    const result = await reconcilePendingAfterCloudLoad(supabase, "user-a");

    expect(processPendingCloudWorkMock.mock.invocationCallOrder[0]).toBeLessThan(
      loadCloudDataMock.mock.invocationCallOrder[0],
    );
    expect(result.data).toEqual(cloud);
  });

  it("recommence lorsqu'une modification arrive pendant le load final", async () => {
    let generation = 1;
    const firstLoad = new Promise<AppData>((resolve) => {
      queueMicrotask(() => {
        generation = 2;
        resolve(createEmptyData());
      });
    });
    const stable = { ...createEmptyData(), profile: profile("Stable") };
    loadCloudDataMock
      .mockImplementationOnce(() => firstLoad)
      .mockResolvedValueOnce(stable);

    const result = await reconcilePendingAfterCloudLoad(
      supabase,
      "user-a",
      () => generation,
    );

    expect(processPendingCloudWorkMock).toHaveBeenCalledTimes(2);
    expect(result.localEditGeneration).toBe(2);
    expect(result.data.profile?.firstName).toBe("Stable");
  });
});
