import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeImportedData } from "@/lib/importData";
import { MemoryCloudMutationJournal } from "@/lib/cloudMutationJournal";
import { ImportValidationError } from "@/lib/dataValidation";
import { createEmptyData } from "@/lib/storage";
import type { AppData, Profile } from "@/lib/types";
import { createOfflineSyncService } from "@/services/offlineSyncService";

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

function profile(firstName: string): Profile {
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
    darkMode: false,
    weeklyActivityGoal: 5,
    createdAt: "2026-07-01T08:00:00.000Z",
  };
}

function exportedData(firstName = "Importé"): AppData {
  return {
    ...createEmptyData(),
    profile: profile(firstName),
    weights: [
      {
        id: "weight-import",
        date: "2026-07-15",
        time: "08:00",
        weightKg: 149,
        createdAt: "2026-07-15T06:00:00.000Z",
      },
    ],
  };
}

describe("mergeImportedData", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconnaît profil et poids dans une enveloppe versionnée", () => {
    const merge = mergeImportedData(createEmptyData(), {
      version: 1,
      data: exportedData(),
    });

    expect(merge.data.profile?.firstName).toBe("Importé");
    expect(merge.data.weights).toMatchObject([{ weightKg: 149 }]);
    expect(merge.nonMealMutations).toMatchObject([
      { entity: "profile", action: "create" },
      { entity: "weight", entityKey: "2026-07-15" },
    ]);
    expect(merge.recognizedContributionCount).toBe(2);
  });

  it("ne remplace pas un profil de compte existant", () => {
    const current = { ...createEmptyData(), profile: profile("Compte") };
    const merge = mergeImportedData(current, {
      version: 1,
      data: exportedData("Fichier"),
    });

    expect(merge.data.profile?.firstName).toBe("Compte");
    expect(merge.nonMealMutations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "profile" })]),
    );
    expect(merge.nonMealMutations).toMatchObject([
      { entity: "weight", entityKey: "2026-07-15" },
    ]);
  });

  it("les mutations reconnues survivent à une relecture du journal", async () => {
    const merge = mergeImportedData(createEmptyData(), {
      version: 1,
      data: exportedData(),
    });

    const service = createOfflineSyncService(new MemoryCloudMutationJournal());
    await service.queueNonMealMutations("user-a", merge.nonMealMutations);

    expect(await service.getPendingNonMealMutations("user-a")).toMatchObject([
      { payload: { entity: "profile" } },
      { payload: { entity: "weight", entityKey: "2026-07-15" } },
    ]);
  });

  it("réimporte le format brut produit par l'export de l'application", () => {
    const exported = JSON.parse(JSON.stringify(exportedData()));
    const merge = mergeImportedData(createEmptyData(), exported);

    expect(merge.recognizedContributionCount).toBe(2);
    expect(merge.data).toMatchObject({
      profile: { firstName: "Importé" },
      weights: [{ weightKg: 149 }],
    });
  });

  it("ignore un poids importé plus ancien et ne signale aucun import réussi", () => {
    const current = exportedData("Compte");
    current.weights[0] = {
      ...current.weights[0],
      id: "weight-cloud",
      weightKg: 148,
      createdAt: "2026-07-15T07:00:00.000Z",
    };
    const imported = exportedData("Fichier");
    imported.weights[0] = {
      ...imported.weights[0],
      createdAt: "2026-07-15T06:00:00.000Z",
    };

    const merge = mergeImportedData(current, imported);

    expect(merge.recognizedContributionCount).toBe(0);
    expect(merge.data.weights).toMatchObject([{ id: "weight-cloud", weightKg: 148 }]);
  });

  it.each([
    ["profile.startDate", { ...exportedData(), profile: { ...profile("X"), startDate: "2026-02-30" } }],
    ["profile.createdAt", { ...exportedData(), profile: { ...profile("X"), createdAt: "hier" } }],
    ["weights[0].date", { ...exportedData(), weights: [{ ...exportedData().weights[0], date: "2026-13-01" }] }],
    ["weights[0].time", { ...exportedData(), weights: [{ ...exportedData().weights[0], time: "25:00" }] }],
    ["weights[0].createdAt", { ...exportedData(), weights: [{ ...exportedData().weights[0], createdAt: "demain" }] }],
    ["weights[0].weightKg", { ...exportedData(), weights: [{ ...exportedData().weights[0], weightKg: 350 }] }],
    ["meals[0].date", { ...exportedData(), meals: [{ date: "2026-02-30", time: "12:00", createdAt: "2026-07-15T12:00:00.000Z" }] }],
    ["meals[0].time", { ...exportedData(), meals: [{ date: "2026-07-15", time: "29:00", createdAt: "2026-07-15T12:00:00.000Z" }] }],
    ["meals[0].createdAt", { ...exportedData(), meals: [{ date: "2026-07-15", time: "12:00", createdAt: "midi" }] }],
    ["smokingEntries[0].date", { ...exportedData(), smokingEntries: [{ date: "2026-02-30", time: "12:00", createdAt: "2026-07-15T12:00:00.000Z" }] }],
    ["smokingEntries[0].time", { ...exportedData(), smokingEntries: [{ date: "2026-07-15", time: "88:00", createdAt: "2026-07-15T12:00:00.000Z" }] }],
    ["smokingEntries[0].createdAt", { ...exportedData(), smokingEntries: [{ date: "2026-07-15", time: "12:00", createdAt: "jamais" }] }],
  ])("refuse %s avant toute fusion", (path, invalid) => {
    const current = exportedData("Compte");
    const before = JSON.stringify(current);

    expect(() => mergeImportedData(current, invalid)).toThrow(
      expect.objectContaining<Partial<ImportValidationError>>({ path }),
    );
    expect(JSON.stringify(current)).toBe(before);
  });
});
