import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyData,
  guestStorageScope,
  localDataStore,
  normalizeData,
  normalizeImportedData,
  userStorageScope,
} from "@/lib/storage";
import { ImportValidationError } from "@/lib/dataValidation";
import type { AppData } from "@/lib/types";

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

function dataWithWeight(id: string, weightKg: number): AppData {
  return {
    ...createEmptyData(),
    weights: [
      {
        id,
        date: "2026-07-14",
        time: "08:00",
        weightKg,
        createdAt: `2026-07-14T08:${id.padStart(2, "0")}:00.000Z`,
      },
    ],
  };
}

describe("storage normalization", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mappe une ancienne observation repas vers les champs V0.7", () => {
    const data = normalizeData({
      profile: null,
      weights: [],
      activities: [],
      smokingEntries: [],
      meals: [
        {
          id: "meal-1",
          date: "2026-07-14",
          time: "12:30",
          kind: "collation",
          freeText: "sandwich",
          quantity: "two-plates",
          hungerBefore: "pas-faim",
          afterMeal: "trop-plein",
          stopReason: "assiette-vide",
          snackingAfter: "non",
          createdAt: "2026-07-14T12:30:00.000Z",
        },
      ],
    });

    expect(data.meals[0]).toMatchObject({
      kind: "grignotage",
      servingPattern: "once",
      fullnessAfter: "too_full",
      questionnaireVersion: "legacy",
    });
  });

  it("canonicalise le timestamp repas dès l'entrée", () => {
    const data = normalizeImportedData({
      meals: [
        {
          id: "meal-1",
          date: "2026-07-14",
          time: "14:00",
          kind: "dejeuner",
          freeText: "sandwich",
          createdAt: "2026-07-14T14:00:00.000+02:00",
        },
      ],
    });

    expect(data.meals[0]?.createdAt).toBe("2026-07-14T12:00:00.000Z");
  });

  it("conserve et normalise la structure détaillée d'un repas V2", () => {
    const data = normalizeData({
      profile: null,
      weights: [],
      activities: [],
      smokingEntries: [],
      meals: [
        {
          id: "meal-v2",
          date: "2026-07-16",
          time: "12:45",
          kind: "dejeuner",
          freeText: "steak, pâtes et champignons",
          quantity: "two-plates",
          servingPattern: "once",
          hungerBefore: "yes",
          afterMeal: "too_full",
          fullnessAfter: "too_full",
          mealStructure: {
            version: 2,
            source: "meal_tunnel_v2",
            sections: [
              {
                id: "main",
                kind: "main",
                rawText: "steak, pâtes et champignons",
                quantity: {
                  amount: 1,
                  unit: "plate",
                  text: null,
                  confidence: "medium",
                },
                passages: [
                  {
                    id: "passage-1",
                    index: 1,
                    relationToPrevious: null,
                    relationText: null,
                    items: [
                      {
                        id: "item-1",
                        rawText: "steak, pâtes et champignons",
                        recognitionStatus: "unprocessed",
                        canonicalName: null,
                        ciqualCode: null,
                        confidence: null,
                        quantity: null,
                      },
                    ],
                  },
                ],
              },
            ],
            behavior: {
              hungerBefore: "yes",
              fullnessAfter: "too_full",
              hungerAtReservice: "not_really",
              reserviceReasons: ["pleasure", "habit", "invalide"],
            },
          },
          createdAt: "2026-07-16T10:45:00.000Z",
        },
      ],
    });

    expect(data.meals[0]?.questionnaireVersion).toBe("legacy");
    expect(data.meals[0]?.mealStructure).toMatchObject({
      version: 2,
      source: "meal_tunnel_v2",
      sections: [
        {
          kind: "main",
          quantity: { amount: 1, unit: "plate", confidence: "medium" },
        },
      ],
      behavior: {
        hungerAtReservice: "not_really",
        reserviceReasons: ["pleasure", "habit"],
      },
    });
  });

  it("déplie le format versionné réellement importable", () => {
    const imported = normalizeImportedData({
      version: 1,
      ownerUserId: null,
      updatedAt: "2026-07-15T08:00:00.000Z",
      data: dataWithWeight("1", 149),
    });

    expect(imported.weights).toMatchObject([{ weightKg: 149 }]);
  });

  it("refuse un import contenant un timestamp repas invalide", () => {
    expect(() =>
      normalizeImportedData({
        meals: [
          {
            id: "meal-1",
            date: "2026-07-14",
            time: "14:00",
            kind: "dejeuner",
            freeText: "sandwich",
            createdAt: "date-invalide",
          },
        ],
      }),
    ).toThrow(ImportValidationError);
  });

  it("conserve un miroir local propre à un utilisateur après sauvegarde cloud", () => {
    const dataA = dataWithWeight("1", 151);

    localDataStore.save(userStorageScope("user-a"), dataA);

    expect(localDataStore.load(userStorageScope("user-a")).weights[0].weightKg).toBe(
      151,
    );
  });

  it("charge le miroir de A en ouverture hors ligne", () => {
    const dataA = dataWithWeight("1", 151);

    localDataStore.save(userStorageScope("user-a"), dataA);

    expect(localDataStore.load(userStorageScope("user-a"))).toMatchObject({
      weights: [{ weightKg: 151 }],
    });
  });

  it("ne charge jamais le miroir de A dans le scope de B", () => {
    const dataA = dataWithWeight("1", 151);

    localDataStore.save(userStorageScope("user-a"), dataA);

    expect(localDataStore.load(userStorageScope("user-b")).weights).toEqual([]);
  });

  it("la déconnexion de A puis la connexion de B n'affiche aucune donnée de A", () => {
    const dataA = dataWithWeight("1", 151);

    localDataStore.save(userStorageScope("user-a"), dataA);
    const guestData = localDataStore.load(guestStorageScope);
    const dataB = localDataStore.load(userStorageScope("user-b"));

    expect(guestData.weights).toEqual([]);
    expect(dataB.weights).toEqual([]);
  });

  it("garde le stockage invité indépendant des comptes connectés", () => {
    const guestData = dataWithWeight("1", 140);
    const dataA = dataWithWeight("2", 151);

    localDataStore.save(guestStorageScope, guestData);
    localDataStore.save(userStorageScope("user-a"), dataA);
    localDataStore.reset(userStorageScope("user-a"));

    expect(localDataStore.load(guestStorageScope).weights[0].weightKg).toBe(140);
    expect(localDataStore.load(userStorageScope("user-a")).weights).toEqual([]);
  });

  it("un import explicite peut associer une ancienne enveloppe à son scope", () => {
    const imported = localDataStore.import(
      userStorageScope("user-b"),
      JSON.stringify({
        version: 1,
        ownerUserId: "user-a",
        updatedAt: "2026-07-15T08:00:00.000Z",
        data: dataWithWeight("1", 149),
      }),
    );

    expect(imported.weights).toMatchObject([{ weightKg: 149 }]);
    expect(localDataStore.load(userStorageScope("user-b"))).toMatchObject({
      weights: [{ weightKg: 149 }],
    });
  });

  it("met les anciennes données globales sans propriétaire en quarantaine", () => {
    const legacyData = dataWithWeight("1", 151);

    window.localStorage.setItem(
      "projet-centenaire-fieldbook-v0",
      JSON.stringify(legacyData),
    );

    expect(localDataStore.load(guestStorageScope).weights).toEqual([]);
    expect(localDataStore.getLegacyQuarantine()).toMatchObject({
      weights: [{ weightKg: 151 }],
    });
    expect(window.localStorage.getItem("projet-centenaire-fieldbook-v0")).toBeNull();
  });
});
