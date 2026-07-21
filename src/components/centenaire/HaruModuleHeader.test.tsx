import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HaruModuleHeader } from "@/components/centenaire/HaruModuleHeader";

describe("HaruModuleHeader", () => {
  it("ancre Haru à gauche après le retour, sans séparateur", () => {
    const html = renderToStaticMarkup(
      <HaruModuleHeader backLabel="Retour" onBack={() => {}} />,
    );

    expect(html).toContain("flex min-h-24 items-center");
    expect(html).not.toContain("grid-cols-");
    expect(html).not.toContain("justify-self-center");
    expect(html).toContain('aria-label="Retour"');
    expect(html).toContain('alt="Haru"');
    expect(html).not.toContain("border-b");
  });

  it("peut masquer le retour sur la racine d'un module", () => {
    const html = renderToStaticMarkup(
      <HaruModuleHeader backLabel="Retour" showBack={false} />,
    );

    expect(html).not.toContain('aria-label="Retour"');
    expect(html).toContain('alt="Haru"');
  });
});
