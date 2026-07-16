import { LogoHorizontal } from "@/components/Logo";
import { Button } from "@/components/ui";

export type LaunchStage = "loading" | "slogan" | "ready";

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
              <span className="launch-progress block h-full rounded-full bg-[var(--pc-color-primary)]" />
            </div>
            <p
              aria-live="polite"
              className={`text-lg font-semibold text-[var(--pc-color-text-muted)] transition-opacity duration-[1000ms] ${
                sloganVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              Un jour à la fois.
            </p>
          </div>
        </section>

        {stage === "ready" ? (
          <footer className="soft-enter pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4">
            <Button disabled={!dataReady} fullWidth onClick={onStart}>
              Commencer
            </Button>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
