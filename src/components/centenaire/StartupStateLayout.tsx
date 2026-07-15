import type { ReactNode } from "react";
import { AppHeader } from "@/components/centenaire/AppHeader";

export type StartupStateLayoutProps = {
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function StartupStateLayout({
  children,
  description,
  eyebrow,
  title,
}: StartupStateLayoutProps) {
  return (
    <main className="pc-screen pc-motion-safe">
      <div className="pc-screen-inner mx-auto flex flex-col">
        <AppHeader variant="signature" />
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="space-y-4">
            {eyebrow ? (
              <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-[20ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-[42ch] text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
                {description}
              </p>
            ) : null}
            {children ? <div className="pt-2">{children}</div> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
