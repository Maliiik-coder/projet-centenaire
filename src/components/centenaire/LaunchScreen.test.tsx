import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LAUNCH_LOADING_DURATION_MS,
  LAUNCH_READY_DELAY_MS,
  LAUNCH_SLOGAN_REVEAL_DURATION_MS,
  LaunchScreen,
} from "@/components/centenaire/LaunchScreen";

describe("LaunchScreen", () => {
  it("réserve la place du bouton pendant le chargement", () => {
    const html = renderToStaticMarkup(
      <LaunchScreen dataReady={false} stage="loading" onStart={() => {}} />,
    );

    expect(html).toContain("launch-progress");
    expect(html).toContain("pc-launch-screen");
    expect(html).toContain("animation-duration:3000ms");
    expect(html).toContain("transition-duration:2000ms");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("invisible");
    expect(html).toContain(">Commencer<");
  });

  it("affiche le bouton seulement une fois le slogan révélé", () => {
    const html = renderToStaticMarkup(
      <LaunchScreen dataReady stage="ready" onStart={() => {}} />,
    );

    expect(html).toContain("Un jour à la fois.");
    expect(html).toContain(">Commencer<");
    expect(html).not.toContain("invisible");
  });

  it("attend trois secondes puis révèle le slogan pendant deux secondes", () => {
    expect(LAUNCH_LOADING_DURATION_MS).toBe(3000);
    expect(LAUNCH_SLOGAN_REVEAL_DURATION_MS).toBe(2000);
    expect(LAUNCH_READY_DELAY_MS).toBe(5000);
  });
});
