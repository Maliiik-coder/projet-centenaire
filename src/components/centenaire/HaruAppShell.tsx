"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChefHat,
  Dumbbell,
  PenLine,
  Settings2,
} from "lucide-react";
import { appResumePath } from "@/lib/entryMode";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AppHeader } from "@/components/centenaire/AppHeader";
import { BottomNav } from "@/components/centenaire/BottomNav";

export type AppTabId = "today" | "journal" | "profile";
type NavigationTabId = AppTabId | "recipes" | "sport";

type TabDefinition = {
  accessibleLabel?: string;
  id: NavigationTabId;
  label: string;
  icon: LucideIcon;
};

const tabs: TabDefinition[] = [
  { id: "today", label: "Jour", accessibleLabel: "Page du jour", icon: PenLine },
  { id: "journal", label: "Carnet", icon: BookOpen },
  { id: "recipes", label: "Recettes", icon: ChefHat },
  { id: "sport", label: "Sport", icon: Dumbbell },
  { id: "profile", label: "Profil", icon: Settings2 },
];

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

      <BottomNav<NavigationTabId>
        activeId={activeTab}
        items={tabs}
        onChange={(nextTab) => {
          if (nextTab === "recipes" || nextTab === "sport") {
            window.history.replaceState(null, "", appResumePath(activeTab));
            window.location.assign(nextTab === "recipes" ? "/recipes" : "/sport");
            return;
          }

          onTabChange(nextTab);
        }}
      />
    </main>
  );
}
