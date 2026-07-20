"use client";

import type { ReactNode } from "react";
import { appResumePath } from "@/lib/entryMode";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AppHeader } from "@/components/centenaire/AppHeader";
import { BottomNav } from "@/components/centenaire/BottomNav";
import {
  HARU_NAVIGATION_ITEMS,
  isHaruCoreTab,
  type HaruCoreTabId,
  type HaruNavigationTabId,
} from "@/components/centenaire/appNavigation";

export type AppTabId = HaruCoreTabId;

type HaruAppShellProps = {
  activeTab: AppTabId;
  children: ReactNode;
  error: string | null;
  notice: string | null;
  overlays?: ReactNode;
  pendingSync: boolean;
  onTabChange: (tab: AppTabId) => void;
};

export function HaruAppShell({
  activeTab,
  children,
  error,
  notice,
  overlays,
  pendingSync,
  onTabChange,
}: HaruAppShellProps) {
  return (
    <main className="pc-screen pc-app-screen-with-nav pc-motion-safe">
      {notice || error || pendingSync ? (
        <div aria-live="polite" className="app-toast-stack">
          {notice ? (
            <p className="app-toast app-toast-auto border-[var(--pc-color-success)] bg-[var(--pc-color-success-soft)] text-[var(--pc-color-text)]">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="app-toast app-toast-auto border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] text-[var(--pc-color-text)]">
              {error}
            </p>
          ) : null}
          {pendingSync ? (
            <p className="app-toast border-[var(--pc-color-warning)] bg-[var(--pc-color-warning-soft)] text-[var(--pc-color-text)]">
              Données en attente de synchronisation.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mx-auto max-w-[var(--pc-content-max-width)]">
        <AppHeader className="mb-4" />

        {!isSupabaseConfigured() ? (
          <p className="mb-4 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-3 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
            Mode local actif. Configure Supabase pour activer la sauvegarde cloud.
          </p>
        ) : null}

        {children}
      </div>

      {overlays}

      <BottomNav<HaruNavigationTabId>
        activeId={activeTab}
        items={HARU_NAVIGATION_ITEMS.map((item) =>
          isHaruCoreTab(item.id) ? { ...item, href: undefined } : item,
        )}
        onChange={(nextTab) => {
          if (isHaruCoreTab(nextTab)) {
            onTabChange(nextTab);
            return;
          }

          window.history.replaceState(null, "", appResumePath(activeTab));
        }}
      />
    </main>
  );
}
