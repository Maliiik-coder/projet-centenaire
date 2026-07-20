import { describe, expect, it } from "vitest";
import {
  applyThemePreference,
  HARU_THEME_STORAGE_KEY,
  readThemePreference,
  writeThemePreference,
} from "@/lib/themePreference";

function createStorage(initial: string | null = null) {
  let value = initial;

  return {
    getItem(key: string) {
      return key === HARU_THEME_STORAGE_KEY ? value : null;
    },
    setItem(key: string, nextValue: string) {
      if (key === HARU_THEME_STORAGE_KEY) {
        value = nextValue;
      }
    },
  };
}

describe("themePreference", () => {
  it("conserve uniquement une préférence de thème reconnue", () => {
    expect(readThemePreference(createStorage("dark"))).toBe("dark");
    expect(readThemePreference(createStorage("light"))).toBe("light");
    expect(readThemePreference(createStorage("sepia"))).toBeNull();
  });

  it("mémorise la préférence pour les routes autonomes", () => {
    const storage = createStorage();

    writeThemePreference("dark", storage);

    expect(readThemePreference(storage)).toBe("dark");
  });

  it("applique le thème au document sans dépendre du profil React", () => {
    const root = { dataset: {} as DOMStringMap };

    applyThemePreference("dark", root);

    expect(root.dataset.pcTheme).toBe("dark");
  });
});
