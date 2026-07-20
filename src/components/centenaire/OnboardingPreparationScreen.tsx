import { LogoMark } from "@/components/Logo";

export const ONBOARDING_PREPARATION_DURATION_MS = 3_000;

export function OnboardingPreparationScreen() {
  return (
    <main className="pc-screen pc-motion-safe">
      <div className="pc-screen-inner mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-7">
          <LogoMark className="h-auto w-56 max-w-[68vw]" priority />
          <div
            aria-label="Préparation de ton bilan"
            className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--pc-color-border)]"
            role="status"
          >
            <span
              className="launch-progress block h-full rounded-full bg-[var(--pc-color-primary)]"
              style={{
                animationDuration: `${ONBOARDING_PREPARATION_DURATION_MS}ms`,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
