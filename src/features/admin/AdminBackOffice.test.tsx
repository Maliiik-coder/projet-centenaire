import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminBackOffice } from "./AdminBackOffice";
import { createAdminBackOfficeData } from "./adminBackOfficeModel";

describe("AdminBackOffice", () => {
  it("rend le shell admin et les neuf entrées de navigation", () => {
    const html = renderToStaticMarkup(
      <AdminBackOffice data={createAdminBackOfficeData()} />,
    );

    expect(html).toContain("Back-office Haru");
    expect(html).toContain("Maquette complète non branchée");
    expect(html).toContain("Vue générale");
    expect(html).toContain("Utilisateurs");
    expect(html).toContain("Abonnements");
    expect(html).toContain("Recettes");
    expect(html).toContain("Sport");
    expect(html).toContain("Signalements recettes");
    expect(html).toContain("Analyses/IA");
    expect(html).toContain("Exploitation technique");
    expect(html).toContain("Journal d&#x27;audit");
  });

  it("affiche le périmètre fictif et des actions non branchées", () => {
    const html = renderToStaticMarkup(
      <AdminBackOffice data={createAdminBackOfficeData()} />,
    ).toLowerCase();

    expect(html).toContain("données fictives locales");
    expect(html).toContain("désactivé");
    expect(html).toContain("aucune donnée");
    expect(html).toContain("permissions explicites");
    expect(html).not.toContain("service_role");
  });
});
