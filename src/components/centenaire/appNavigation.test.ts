import { describe, expect, it } from "vitest";
import {
  HARU_NAVIGATION_ITEMS,
  activeTabForPathname,
  isHaruCoreTab,
} from "@/components/centenaire/appNavigation";

describe("appNavigation", () => {
  it("déclare les cinq destinations dans l'ordre de la barre mobile", () => {
    expect(HARU_NAVIGATION_ITEMS.map((item) => item.id)).toEqual([
      "today",
      "journal",
      "recipes",
      "sport",
      "profile",
    ]);
  });

  it("conserve les onglets historiques dans la route principale", () => {
    expect(isHaruCoreTab("today")).toBe(true);
    expect(isHaruCoreTab("journal")).toBe(true);
    expect(isHaruCoreTab("profile")).toBe(true);
    expect(isHaruCoreTab("recipes")).toBe(false);
    expect(isHaruCoreTab("sport")).toBe(false);
  });

  it("identifie les modules pour leurs routes imbriquées", () => {
    expect(activeTabForPathname("/recipes")).toBe("recipes");
    expect(activeTabForPathname("/recipes/new")).toBe("recipes");
    expect(activeTabForPathname("/sport/session/123")).toBe("sport");
  });
});
