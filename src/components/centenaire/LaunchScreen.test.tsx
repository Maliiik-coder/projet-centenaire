import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LaunchScreen } from "@/components/centenaire/LaunchScreen";

describe("LaunchScreen", () => {
  it("affiche d’abord le chargement sans bouton", () => {
    const html = renderToStaticMarkup(
      <LaunchScreen dataReady={false} stage="loading" onStart={() => {}} />,
    );

    expect(html).toContain("launch-progress");
    expect(html).not.toContain(">Commencer<");
  });

  it("affiche le bouton seulement une fois le slogan révélé", () => {
    const html = renderToStaticMarkup(
      <LaunchScreen dataReady stage="ready" onStart={() => {}} />,
    );

    expect(html).toContain("Un jour à la fois.");
    expect(html).toContain(">Commencer<");
  });
});
