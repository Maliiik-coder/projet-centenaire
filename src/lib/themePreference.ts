export const HARU_THEME_STORAGE_KEY = "haru-theme-preference-v1";

export type HaruTheme = "dark" | "light";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ThemeRoot = {
  dataset: DOMStringMap;
};

function browserStorage(): ThemeStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readThemePreference(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): HaruTheme | null {
  if (!storage) {
    return null;
  }

  try {
    const stored = storage.getItem(HARU_THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function writeThemePreference(
  theme: HaruTheme,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  try {
    storage?.setItem(HARU_THEME_STORAGE_KEY, theme);
  } catch {
    // The current document still receives the theme when storage is restricted.
  }
}

export function applyThemePreference(
  theme: HaruTheme,
  root: ThemeRoot | null = typeof document === "undefined"
    ? null
    : document.documentElement,
): void {
  if (root) {
    root.dataset.pcTheme = theme;
  }
}

export const HARU_THEME_BOOTSTRAP_SCRIPT = `try{const theme=localStorage.getItem(${JSON.stringify(
  HARU_THEME_STORAGE_KEY,
)});if(theme==="dark"||theme==="light"){document.documentElement.dataset.pcTheme=theme}}catch{}`;
