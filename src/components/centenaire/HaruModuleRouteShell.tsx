"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/centenaire/BottomNav";
import {
  HARU_NAVIGATION_ITEMS,
  activeTabForPathname,
  type HaruNavigationTabId,
} from "@/components/centenaire/appNavigation";

export function HaruModuleRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = activeTabForPathname(pathname);

  return (
    <div className="pc-module-route-shell">
      {children}
      <BottomNav<HaruNavigationTabId>
        activeId={activeTab}
        items={HARU_NAVIGATION_ITEMS}
      />
    </div>
  );
}
