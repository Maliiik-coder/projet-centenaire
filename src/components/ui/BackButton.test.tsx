import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BackButton,
  canUseInAppHistory,
} from "@/components/ui/BackButton";

describe("BackButton", () => {
  it("utilise uniquement un historique provenant de la même application", () => {
    expect(
      canUseInAppHistory({
        currentOrigin: "https://haru.example",
        historyLength: 2,
        referrer: "https://haru.example/sport",
      }),
    ).toBe(true);
    expect(
      canUseInAppHistory({
        currentOrigin: "https://haru.example",
        historyLength: 2,
        referrer: "https://accounts.google.com/",
      }),
    ).toBe(false);
    expect(
      canUseInAppHistory({
        currentOrigin: "https://haru.example",
        historyLength: 1,
        referrer: "https://haru.example/",
      }),
    ).toBe(false);
  });

  it("affiche une flèche accessible dans un bouton rond", () => {
    const html = renderToStaticMarkup(<BackButton />);

    expect(html).toContain('aria-label="Retour"');
    expect(html).toContain("rounded-full");
  });
});
