import { describe, expect, it } from "vitest";
import {
  addMealFoodSelection,
  advanceMealTunnel,
  createEmptyMealDraft,
  mealDraftFromEntry,
  mealEntryFromDraft,
  removeMealFoodSelection,
  sanitizeMealDraftForKind,
  toggleReserviceReason,
} from "@/features/meal/mealDraftModel";
import { searchFoodAutocomplete } from "@/lib/nutrition/autocompleteFood";

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

  it("ne recopie pas la quantité du plat complet sur une reprise partielle", () => {
    const meal = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "burger frites",
        servingPattern: "once",
        hungerAtReservice: "not_really",
        reserviceRelation: "side_only",
        reserviceText: "frites",
        reserviceReasons: ["pleasure"],
      },
      null,
    );
    const reservice = meal.mealStructure?.sections
      .find((section) => section.kind === "main")
      ?.passages.find((passage) => passage.index === 2);

    expect(reservice?.relationToPrevious).toBe("side_only");
    expect(reservice?.items[0]?.rawText).toBe("frites");
    expect(reservice?.items[0]?.quantity).toBeNull();
  });

  it("rend Je ne sais pas exclusif dans les raisons de resservice", () => {
    expect(toggleReserviceReason(["pleasure"], "unsure")).toEqual(["unsure"]);
    expect(toggleReserviceReason(["unsure"], "habit")).toEqual(["habit"]);
    expect(toggleReserviceReason(["pleasure", "habit"], "habit")).toEqual([
      "pleasure",
    ]);
  });

  it("ajoute une suggestion alimentaire sans modifier le texte libre", () => {
    const draft = {
      ...createEmptyMealDraft("2026-07-16", "12:30"),
      freeText: "riz",
    };
    const suggestion = searchFoodAutocomplete(draft.freeText)[0]!;
    const nextDraft = addMealFoodSelection(draft, suggestion);

    expect(nextDraft.freeText).toBe("riz");
    expect(nextDraft.selectedFoods).toEqual([
      {
        id: "rice",
        rawText: "riz",
        canonicalName: "Riz",
        ciqualCode: null,
        confidence: 1,
        source: "haru-food-seed-v0",
      },
    ]);
    expect(addMealFoodSelection(nextDraft, suggestion)).toBe(nextDraft);
  });

  it("persiste les aliments sélectionnés comme items confirmés sans code Ciqual", () => {
    const draft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "riz",
      },
      searchFoodAutocomplete("riz")[0]!,
    );
    const meal = mealEntryFromDraft(draft, null);
    const firstItem = meal.mealStructure?.sections
      .find((section) => section.kind === "main")
      ?.passages[0]?.items[0];

    expect(meal.freeText).toBe("riz");
    expect(firstItem).toMatchObject({
      id: "rice",
      rawText: "riz",
      recognitionStatus: "confirmed",
      canonicalName: "Riz",
      ciqualCode: null,
      confidence: 1,
    });

    expect(mealDraftFromEntry(meal).selectedFoods[0]?.id).toBe("rice");
  });

  it("retire une suggestion alimentaire du brouillon", () => {
    const draft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "riz",
      },
      searchFoodAutocomplete("riz")[0]!,
    );

    expect(removeMealFoodSelection(draft, "rice").selectedFoods).toEqual([]);
  });
});
