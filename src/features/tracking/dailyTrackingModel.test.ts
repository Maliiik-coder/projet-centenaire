import { describe, expect, it } from "vitest";
import {
  smokingEntryFromValues,
  weightEntryFromDraft,
} from "@/features/tracking/dailyTrackingModel";

describe("dailyTrackingModel", () => {
  it("refuse une mesure de poids hors limites", () => {
    expect(weightEntryFromDraft("2026-07-16", "39").entry).toBeNull();
    expect(weightEntryFromDraft("2026-07-16", "301").entry).toBeNull();
    expect(weightEntryFromDraft("2026-07-16", "abc").error).toBe(
      "La mesure doit être comprise entre 40 et 300 kg.",
    );
  });

  it("accepte la virgule et stabilise la précision du poids", () => {
    const result = weightEntryFromDraft("2026-07-16", "149,96");

    expect(result.error).toBeNull();
    expect(result.entry?.date).toBe("2026-07-16");
    expect(result.entry?.weightKg).toBe(150);
    expect(result.entry?.id).toMatch(/^weight-/);
  });

  it("distingue Aucun d’une absence de donnée tabac", () => {
    const entry = smokingEntryFromValues("2026-07-16", "aucun", "   ");

    expect(entry.state).toBe("aucun");
    expect(entry.note).toBeUndefined();
    expect(entry.id).toMatch(/^smoking-/);
  });

  it("nettoie le déclencheur facultatif du tabac", () => {
    const entry = smokingEntryFromValues(
      "2026-07-16",
      "cigarette",
      "  stress  ",
    );

    expect(entry.note).toBe("stress");
  });
});
