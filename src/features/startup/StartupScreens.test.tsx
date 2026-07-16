import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LoadingScreen,
  MigrationDecisionScreen,
} from "@/features/startup/StartupScreens";

describe("StartupScreens", () => {
  it("affiche un état de chargement générique sans donnée personnelle", () => {
    const html = renderToStaticMarkup(<LoadingScreen />);

    expect(html).toContain("Ouverture du carnet.");
    expect(html).toContain("Ouverture du carnet");
  });

  it("force la reprise de la même migration lorsqu’elle a commencé", () => {
    const html = renderToStaticMarkup(
      <MigrationDecisionScreen
        busy={false}
        cloudEmail="camille@example.com"
        cloudHasProfile
        error={null}
        localHasProfile
        operationStarted
        onAttach={() => undefined}
        onExport={() => undefined}
        onKeepCloud={() => undefined}
      />,
    );

    expect(html).toContain("Terminer l’association");
    expect(html).not.toContain("Garder uniquement les données du compte");
    expect(html).toContain("Exporter les données de cet appareil");
  });
});
