import { describe, expect, it } from "vitest";
import type { AdminModuleId } from "@/lib/admin/types";
import { createAdminBackOfficeData } from "./adminBackOfficeModel";

const expectedModuleIds: AdminModuleId[] = [
  "overview",
  "users",
  "subscriptions",
  "recipes",
  "sport",
  "recipe-moderation",
  "ai",
  "operations",
  "audit",
];

describe("adminBackOfficeModel", () => {
  it("couvre tous les modules demandés par la maquette admin", () => {
    const data = createAdminBackOfficeData();

    expect(data.modules.map((module) => module.id)).toEqual(expectedModuleIds);
  });

  it("prépare filtres, tableaux, panneaux et états vides pour chaque module", () => {
    const data = createAdminBackOfficeData();

    for (const adminModule of data.modules) {
      expect(adminModule.filters.length).toBeGreaterThanOrEqual(2);
      expect(adminModule.columns.length).toBeGreaterThanOrEqual(4);
      expect(adminModule.rows.length).toBeGreaterThan(0);
      expect(adminModule.emptyState).toContain("Aucun");
      expect(adminModule.panel.items.length).toBeGreaterThanOrEqual(3);
      expect(adminModule.actions.length).toBeGreaterThan(0);
    }
  });

  it("garde les actions en simulation locale ou désactivées", () => {
    const data = createAdminBackOfficeData();
    const actions = data.modules.flatMap((adminModule) => adminModule.actions);

    expect(actions).not.toHaveLength(0);
    expect(
      actions.every(
        (action) => action.mode === "disabled" || action.mode === "simulation",
      ),
    ).toBe(true);
  });

  it("limite les signalements aux recettes publiques fictives", () => {
    const data = createAdminBackOfficeData();
    const moderationModule = data.modules.find(
      (adminModule) => adminModule.id === "recipe-moderation",
    );

    expect(moderationModule?.title).toBe("Signalements recettes");
    expect(
      moderationModule?.rows.every((row) =>
        row.cells.recipe.includes("REC-PUBLIC-DEMO"),
      ),
    ).toBe(true);
  });

  it("reste explicitement limité aux fixtures locales fictives", () => {
    const data = createAdminBackOfficeData();
    const serializedData = JSON.stringify(data).toLowerCase();

    expect(data.notice.title).toContain("fictives locales");
    expect(serializedData).toContain("fixtures locales");
    expect(serializedData).toContain("aucune donnée réelle");
    expect(serializedData).not.toContain("service_role");
    expect(serializedData).not.toContain("process.env");
    expect(serializedData).not.toContain("createclient");
  });
});
