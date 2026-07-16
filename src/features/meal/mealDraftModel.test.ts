import { describe, expect, it } from "vitest";
import {
  advanceMealTunnel,
  createEmptyMealDraft,
  mealDraftFromEntry,
  mealEntryFromDraft,
  sanitizeMealDraftForKind,
} from "@/features/meal/mealDraftModel";

describe("mealDraftModel", () => {
  it("saute les clarifications absentes après la description", () => {
    const draft = {
      ...createEmptyMealDraft("2026-07-16", "12:30"),
      kind: "petit-dejeuner" as const,
      freeText: "riz",
    };

    const result = advanceMealTunnel(draft, 3);

    expect(result.error).toBeNull();
    expect(result.step).toBe(5);
  });

  it("bloque une description vide sans perdre le brouillon", () => {
    const draft = createEmptyMealDraft("2026-07-16", "12:30");
    const result = advanceMealTunnel(draft, 4);

    expect(result.error).toBe(
      "Ajoute une observation courte avant de continuer.",
    );
    expect(result.step).toBe(4);
    expect(result.draft).toBe(draft);
  });

  it("nettoie les sections incompatibles avec un petit déjeuner", () => {
    const draft = createEmptyMealDraft("2026-07-16", "08:00");
    const sanitized = sanitizeMealDraftForKind({
      ...draft,
      kind: "petit-dejeuner",
      starterTaken: true,
      starterText: "salade",
      dessertTaken: true,
      dessertText: "tarte",
      servingPattern: "once",
      hungerAtReservice: "no",
      reserviceRelation: "same",
      reserviceReasons: ["habit"],
    });

    expect(sanitized.starterTaken).toBe(false);
    expect(sanitized.dessertTaken).toBe(false);
    expect(sanitized.servingPattern).toBe("none");
    expect(sanitized.reserviceReasons).toEqual([]);
  });

  it("reconstruit une modification sans changer l’identité du repas", () => {
    const draft = {
      ...createEmptyMealDraft("2026-07-16", "12:30"),
      freeText: "steak frites",
      servingPattern: "once" as const,
      hungerAtReservice: "no" as const,
      reserviceRelation: "same" as const,
      reserviceReasons: ["habit" as const],
    };
    const original = mealEntryFromDraft(draft, null);
    const editedDraft = {
      ...mealDraftFromEntry(original),
      time: "13:00",
    };
    const edited = mealEntryFromDraft(editedDraft, original);

    expect(edited.id).toBe(original.id);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.time).toBe("13:00");
    expect(edited.mealStructure?.sections[0]?.passages).toHaveLength(2);
  });
});
