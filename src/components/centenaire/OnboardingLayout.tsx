import type { ReactNode } from "react";
import { LogoHorizontal } from "@/components/Logo";
import { AppHeader } from "@/components/centenaire/AppHeader";
import { ProgressIndicator } from "@/components/ui";

export type OnboardingLayoutProps = {
  actions: ReactNode;
  backAction?: ReactNode;
  children: ReactNode;
  currentStep?: number;
  error?: ReactNode;
  showProgress?: boolean;
  totalSteps?: number;
};

export function OnboardingLayout({
  actions,
  backAction,
  children,
  currentStep = 0,
  error,
  showProgress = false,
  totalSteps = 1,
}: OnboardingLayoutProps) {
  return (
    <main className="pc-onboarding-screen pc-screen pc-motion-safe bg-[var(--pc-color-surface-subtle)]">
      <div className="pc-screen-inner mx-auto flex flex-col">
        {backAction || showProgress ? (
          <header className="pt-1">
            <div className="flex min-h-10 items-center justify-center">
              <LogoHorizontal className="pc-brand-wordmark h-18 w-auto max-w-[72vw] shrink-0" priority />
            </div>
            <div className="grid min-h-14 grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-4">
              <div>{backAction}</div>
              {showProgress ? (
                <ProgressIndicator
                  className="w-full"
                  compact
                  current={currentStep}
                  label="Progression du profil initial"
                  total={totalSteps}
                />
              ) : (
                <span />
              )}
              <span aria-hidden="true" />
            </div>
          </header>
        ) : (
          <AppHeader variant="signature" />
        )}
        <div className="flex flex-1 flex-col justify-center py-6 min-[390px]:py-8">
          {children}
          {error ? <div className="mt-5">{error}</div> : null}
        </div>
        {actions ? (
          <footer className="pc-onboarding-actions sticky bottom-0 z-[var(--pc-z-sticky)] -mx-1 mt-auto px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3">
            {actions}
          </footer>
        ) : null}
      </div>
    </main>
  );
}

export type OnboardingQuestionProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function OnboardingQuestion({
  children,
  description,
  title,
}: OnboardingQuestionProps) {
  return (
    <section
      aria-labelledby="onboarding-question"
      className="pc-onboarding-question space-y-7"
    >
      <div className="space-y-3">
        <h1
          className="pc-onboarding-title max-w-[20ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
          id="onboarding-question"
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-[38ch] text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
