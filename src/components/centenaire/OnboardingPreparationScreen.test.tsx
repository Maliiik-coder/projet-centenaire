import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ONBOARDING_PREPARATION_DURATION_MS,
  OnboardingPreparationScreen,
} from "@/components/centenaire/OnboardingPreparationScreen";

describe("OnboardingPreparationScreen", () => {
  it("prépare le bilan pendant trois secondes avec le monogramme Haru", () => {
    const html = renderToStaticMarkup(<OnboardingPreparationScreen />);

    expect(ONBOARDING_PREPARATION_DURATION_MS).toBe(3_000);
    expect(html).toContain("%2Fbrand%2Fharu-mark-7px.png");
    expect(html).toContain('aria-label="Préparation de ton bilan"');
    expect(html).toContain("animation-duration:3000ms");
  });
});
