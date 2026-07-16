import { describe, expect, it } from "vitest";
import {
  clearLocalEntryMode,
  isLocalEntryModeSelected,
  LOCAL_ENTRY_MODE_KEY,
  onboardingEntryPath,
  selectLocalEntryMode,
} from "@/lib/entryMode";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("entryMode", () => {
  it("mémorise puis efface le choix d’utiliser Haru localement", () => {
    const storage = memoryStorage();

    selectLocalEntryMode(storage);
    expect(storage.getItem(LOCAL_ENTRY_MODE_KEY)).toBe("local");
    expect(isLocalEntryModeSelected(storage)).toBe(true);

    clearLocalEntryMode(storage);
    expect(isLocalEntryModeSelected(storage)).toBe(false);
  });

  it("construit une entrée onboarding explicite", () => {
    expect(onboardingEntryPath(false)).toBe("/?onboarding-start=1");
    expect(onboardingEntryPath(true)).toBe(
      "/?onboarding-preview=1&onboarding-start=1",
    );
  });
});
