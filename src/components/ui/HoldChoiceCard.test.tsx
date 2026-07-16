import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOLD_DURATION_MS,
  HoldChoiceCard,
} from "@/components/ui/HoldChoiceCard";

describe("HoldChoiceCard", () => {
  it("demande un maintien de 500 ms par défaut", () => {
    expect(DEFAULT_HOLD_DURATION_MS).toBe(500);
  });

  it("expose un choix radio et l’instruction de maintien", () => {
    const html = renderToStaticMarkup(
      <HoldChoiceCard checked={false} label="Parfois" onConfirm={() => {}} />,
    );

    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("Maintenir une demi-seconde pour valider.");
    expect(html).toContain("clip-path:inset(0 100% 0 0)");
  });
});
