import { LogoHorizontal } from "@/components/Logo";
import { Button } from "@/components/ui";

export type LaunchStage = "loading" | "slogan" | "ready";

export const LAUNCH_LOADING_DURATION_MS = 3000;
export const LAUNCH_SLOGAN_REVEAL_DURATION_MS = 2000;
export const LAUNCH_READY_DELAY_MS =
  LAUNCH_LOADING_DURATION_MS + LAUNCH_SLOGAN_REVEAL_DURATION_MS;

export function LaunchScreen({
  dataReady,
  onStart,
  stage,
}: {
  dataReady: boolean;
  onStart: () => void;
  stage: LaunchStage;
}) {
  const sloganVisible = stage !== "loading";

  return (
    <main className="pc-screen pc-motion-safe">
      <div className="pc-screen-inner mx-auto flex flex-col">
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="sr-only">Haru</h1>
          <LogoHorizontal className="h-auto w-52 max-w-[70vw]" priority />
          <div className="relative mt-6 flex h-8 w-full items-center justify-center">
            <div
              aria-label="Ouverture de Haru"
              className={`absolute h-1.5 w-24 overflow-hidden rounded-full bg-[var(--pc-color-border)] transition-opacity duration-200 ${
                stage === "loading" ? "opacity-100" : "opacity-0"
              }`}
              role="status"
            >
              <span
                className="launch-progress block h-full rounded-full bg-[var(--pc-color-primary)]"
                style={{ animationDuration: `${LAUNCH_LOADING_DURATION_MS}ms` }}
              />
            </div>
            <p
              aria-live="polite"
              className={`text-lg font-semibold text-[var(--pc-color-text-muted)] transition-opacity ${
                sloganVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDuration: `${LAUNCH_SLOGAN_REVEAL_DURATION_MS}ms`,
              }}
            >
              Un jour à la fois.
            </p>
          </div>
        </section>

        <footer
          aria-hidden={stage !== "ready"}
          className="pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4"
        >
          <Button
            className={`transition-opacity duration-200 ${
              stage === "ready"
                ? "opacity-100"
                : "pointer-events-none invisible opacity-0"
            }`}
            disabled={!dataReady || stage !== "ready"}
            fullWidth
            onClick={onStart}
            tabIndex={stage === "ready" ? undefined : -1}
          >
            Commencer
          </Button>
        </footer>
      </div>
    </main>
  );
}
