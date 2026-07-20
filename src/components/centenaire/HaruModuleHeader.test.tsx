import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HaruModuleHeader } from "@/components/centenaire/HaruModuleHeader";

describe("HaruModuleHeader", () => {
  it("centre Haru entre deux colonnes symétriques sans séparateur", () => {
    const html = renderToStaticMarkup(
      <HaruModuleHeader backLabel="Retour" onBack={() => {}} />,
    );

    expect(html).toContain(
      "grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]",
    );
    expect(html).toContain('aria-label="Retour"');
    expect(html).toContain('alt="Haru"');
    expect(html).not.toContain("border-b");
  });
});
