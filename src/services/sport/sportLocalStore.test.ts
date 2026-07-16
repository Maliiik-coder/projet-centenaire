import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSportLocalData,
  loadSportLocalData,
  saveSportLocalData,
} from "@/services/sport/sportLocalStore";
import { createEmptySportData } from "@/services/sport/sportProfileService";

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

    expect(loadSportLocalData()).toEqual(createEmptySportData());
  });

  it("ignore les sauvegardes et suppressions quand le stockage est bloque", () => {
    stubWindowWithBlockedLocalStorage();

    expect(() => saveSportLocalData(createEmptySportData())).not.toThrow();
    expect(() => clearSportLocalData()).not.toThrow();
  });

  it("retourne une donnee vide quand la lecture du stockage echoue", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("read blocked");
        },
      },
    });

    expect(loadSportLocalData()).toEqual(createEmptySportData());
  });
});
