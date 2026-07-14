import { describe, expect, it } from "vitest";
import { shouldShowActiveMission } from "@/lib/mission";
import type { Priority } from "@/lib/types";

const insufficientPriority: Priority = {
  id: "insufficient-data",
  label: "Données insuffisantes",
  evidenceLevel: "données insuffisantes",
  rationale: "Moins de cinq repas sont disponibles.",
  action: "Ajouter les prochains repas au carnet.",
  domain: "observation",
};

const usefulPriority: Priority = {
  ...insufficientPriority,
  id: "initial-portion",
  label: "Priorité portion initiale",
  evidenceLevel: "tendance",
};

describe("active mission display", () => {
  it("masque la mission si l'utilisateur l'a désactivée", () => {
    expect(
      shouldShowActiveMission({
        showActiveMission: false,
        priority: usefulPriority,
        initialFriction: "large-portions",
      }),
    ).toBe(false);
  });

  it("masque la mission par défaut quand aucun signal utile n'existe", () => {
    expect(
      shouldShowActiveMission({
        showActiveMission: true,
        priority: insufficientPriority,
        initialFriction: "unknown",
      }),
    ).toBe(false);
  });

  it("affiche la mission si une priorité ou un frein initial existe", () => {
    expect(
      shouldShowActiveMission({
        showActiveMission: true,
        priority: usefulPriority,
        initialFriction: "unknown",
      }),
    ).toBe(true);
  });
});
