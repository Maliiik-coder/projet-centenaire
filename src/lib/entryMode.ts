export const LOCAL_ENTRY_MODE_KEY = "haru-local-entry-mode-v1";
export const ONBOARDING_START_PARAM = "onboarding-start";
export const APP_RESUME_PARAM = "app-resume";
export const APP_RESUME_TAB_PARAM = "tab";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "removeItem" | "setItem">;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isLocalEntryModeSelected(
  storage: ReadableStorage | null = browserStorage(),
): boolean {
  if (!storage) return false;

  try {
    return storage.getItem(LOCAL_ENTRY_MODE_KEY) === "local";
  } catch {
    return false;
  }
}

export function selectLocalEntryMode(
  storage: WritableStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(LOCAL_ENTRY_MODE_KEY, "local");
  } catch {
    // The app remains usable for the current navigation when storage is blocked.
  }
}

export function clearLocalEntryMode(
  storage: WritableStorage | null = browserStorage(),
): void {
  try {
    storage?.removeItem(LOCAL_ENTRY_MODE_KEY);
  } catch {
    // Authentication can continue even when local storage is unavailable.
  }
}

export function onboardingEntryPath(includeDevelopmentPreview = false): string {
  const params = new URLSearchParams();
  if (includeDevelopmentPreview) {
    params.set("onboarding-preview", "1");
  }
  params.set(ONBOARDING_START_PARAM, "1");
  return `/?${params.toString()}`;
}

export function appResumePath(tab?: string): string {
  const params = new URLSearchParams({ [APP_RESUME_PARAM]: "1" });
  if (tab) {
    params.set(APP_RESUME_TAB_PARAM, tab);
  }
  return `/?${params.toString()}`;
}
