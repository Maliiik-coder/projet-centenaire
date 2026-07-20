import { describe, expect, it } from "vitest";
import {
  adminActionCatalog,
  adminFixtureNotice,
  adminRoleFixtures,
  auditRows,
  overviewMetrics,
  recipeReportRows,
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
    expect(
      overviewMetrics.every(
        (metric) =>
          metric.sensitivity === "aggregate" ||
          metric.sensitivity === "technical",
      ),
    ).toBe(true);
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
    expect(
      adminActionCatalog.every(
        (action) =>
          action.mode === "disabled" || action.mode === "simulation",
      ),
    ).toBe(true);
  });

  it("préfigure des rôles, permissions et audits structurés sans les brancher", () => {
    expect(adminRoleFixtures).not.toHaveLength(0);
    expect(
      adminRoleFixtures.every((role) => role.permissions.length > 0),
    ).toBe(true);
    expect(
      adminActionCatalog.every(
        (action) =>
          action.requiredPermission.length > 0 &&
          action.auditContract.actorRequired &&
          action.auditContract.targetRequired &&
          action.auditContract.reasonRequired &&
          action.auditContract.correlationIdRequired,
      ),
    ).toBe(true);
    expect(
      auditRows.every(
        (row) =>
          row.actorRole.length > 0 &&
          row.targetType.length > 0 &&
          row.targetId.length > 0 &&
          row.reason.length > 0 &&
          row.correlationId.startsWith("CORR-DEMO-"),
      ),
    ).toBe(true);
  });

  it("limite les signalements fictifs aux recettes publiques", () => {
    expect(recipeReportRows).not.toHaveLength(0);
    expect(
      recipeReportRows.every((row) =>
        row.recipeId.startsWith("REC-PUBLIC-DEMO-"),
      ),
    ).toBe(true);
  });
});
