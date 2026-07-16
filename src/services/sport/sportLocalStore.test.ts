import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSportLocalData,
  guestSportStorageScope,
  loadLegacySportLocalData,
  loadSportLocalData,
  saveSportLocalData,
  userSportStorageScope,
} from "@/services/sport/sportLocalStore";
import {
  createDefaultSportOnboardingDraft,
  createEmptySportData,
  createSportDataFromDraft,
} from "@/services/sport/sportProfileService";

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

function stubWindowWithBlockedLocalStorage(): void {
  const blockedWindow = Object.defineProperty({}, "localStorage", {
    get() {
      throw new Error("localStorage unavailable");
    },
  });

  vi.stubGlobal("window", blockedWindow);
}

describe("sportLocalStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retourne une donnee vide quand le stockage navigateur est indisponible", () => {
    stubWindowWithBlockedLocalStorage();

    expect(loadSportLocalData(guestSportStorageScope)).toEqual(createEmptySportData());
  });

  it("ignore les sauvegardes et suppressions quand le stockage est bloque", () => {
    stubWindowWithBlockedLocalStorage();

    expect(() =>
      saveSportLocalData(guestSportStorageScope, createEmptySportData()),
    ).not.toThrow();
    expect(() => clearSportLocalData(guestSportStorageScope)).not.toThrow();
  });

  it("retourne une donnee vide quand la lecture du stockage echoue", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("read blocked");
        },
      },
    });

    expect(loadSportLocalData(guestSportStorageScope)).toEqual(createEmptySportData());
  });

  it("cloisonne les données Sport de deux utilisateurs", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const dataA = createSportDataFromDraft(
      createDefaultSportOnboardingDraft(),
      "2026-07-16T12:00:00.000Z",
      "user-a",
    );

    saveSportLocalData(userSportStorageScope("user-a"), dataA);

    expect(
      loadSportLocalData(userSportStorageScope("user-a")).profile?.userId,
    ).toBe("user-a");
    expect(loadSportLocalData(userSportStorageScope("user-b")).profile).toBeNull();
    expect(loadSportLocalData(guestSportStorageScope).profile).toBeNull();
  });

  it("ne charge jamais automatiquement l'ancienne clé globale", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const legacy = createSportDataFromDraft(
      createDefaultSportOnboardingDraft(),
      "2026-07-16T12:00:00.000Z",
      "legacy-user",
    );
    storage.setItem("haru-sport-isolated-v1", JSON.stringify(legacy));

    expect(loadSportLocalData(userSportStorageScope("user-a")).profile).toBeNull();
    expect(loadSportLocalData(guestSportStorageScope).profile).toBeNull();
    expect(loadLegacySportLocalData()?.profile?.userId).toBe("legacy-user");
  });
});
