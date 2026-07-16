import { describe, expect, it } from "vitest";
import {
  adminActionCatalog,
  adminFixtureNotice,
  auditRows,
  overviewMetrics,
  supportUsers,
} from "./fixtures";

describe("admin fixtures", () => {
  it("déclarent explicitement que les données sont fictives et locales", () => {
    expect(adminFixtureNotice.title).toContain("fictives locales");
    expect(adminFixtureNotice.description).toContain("Aucune donnée réelle");
    expect(adminFixtureNotice.description).toContain("aucun branchement Supabase");
  });

  it("n'exposent que des métriques agrégées sur la vue générale", () => {
    expect(overviewMetrics).not.toHaveLength(0);
    expect(overviewMetrics.every((metric) => metric.sensitivity === "aggregate" || metric.sensitivity === "technical")).toBe(true);
  });

  it("utilisent uniquement des contacts de démonstration réservés", () => {
    const contacts = [
      ...supportUsers.map((user) => user.contact),
      ...auditRows.map((row) => row.actor),
    ];

    expect(contacts.every((contact) => contact.endsWith("@haru.invalid"))).toBe(true);
  });

  it("ne contient aucun marqueur de secret ou de client privilégié", () => {
    const serializedDisplayedData = JSON.stringify({
      auditRows,
      overviewMetrics,
      supportUsers,
    }).toLowerCase();

    expect(serializedDisplayedData).not.toContain("service_role");
    expect(serializedDisplayedData).not.toContain("secret");
    expect(serializedDisplayedData).not.toContain("token");
  });

  it("garde les actions en mode simulation ou désactivé", () => {
    expect(adminActionCatalog).not.toHaveLength(0);
    expect(adminActionCatalog.every((action) => action.mode === "disabled" || action.mode === "simulation")).toBe(true);
  });
});
