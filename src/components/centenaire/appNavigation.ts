import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChefHat,
  Dumbbell,
  PenLine,
  Settings2,
} from "lucide-react";
import { appResumePath } from "@/lib/entryMode";

export type HaruCoreTabId = "today" | "journal" | "profile";
export type HaruNavigationTabId = HaruCoreTabId | "recipes" | "sport";

export type HaruNavigationItem = {
  accessibleLabel?: string;
  href: string;
  icon: LucideIcon;
  id: HaruNavigationTabId;
  label: string;
};

export const HARU_NAVIGATION_ITEMS: readonly HaruNavigationItem[] = [
  {
    id: "today",
    label: "Jour",
    accessibleLabel: "Page du jour",
    icon: PenLine,
    href: appResumePath("today"),
  },
  {
    id: "journal",
    label: "Carnet",
    icon: BookOpen,
    href: appResumePath("journal"),
  },
  {
    id: "recipes",
    label: "Recettes",
    icon: ChefHat,
    href: "/recipes",
  },
  {
    id: "sport",
    label: "Sport",
    icon: Dumbbell,
    href: "/sport",
  },
  {
    id: "profile",
    label: "Profil",
    icon: Settings2,
    href: appResumePath("profile"),
  },
];

export function isHaruCoreTab(tab: HaruNavigationTabId): tab is HaruCoreTabId {
  return tab === "today" || tab === "journal" || tab === "profile";
}

export function activeTabForPathname(pathname: string): HaruNavigationTabId {
  if (pathname === "/recipes" || pathname.startsWith("/recipes/")) {
    return "recipes";
  }

  if (pathname === "/sport" || pathname.startsWith("/sport/")) {
    return "sport";
  }

  return "today";
}
