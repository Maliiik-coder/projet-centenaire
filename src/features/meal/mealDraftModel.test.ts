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

  it("crée deux repas distincts à la même date", () => {
    const lunch = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-21", "12:30"),
        kind: "dejeuner",
        freeText: "steak et pâtes",
      },
      null,
    );
    const dinner = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-21", "20:15"),
        kind: "diner",
        freeText: "soupe et pain",
      },
      null,
    );

    expect(lunch.date).toBe(dinner.date);
    expect(lunch.id).not.toBe(dinner.id);
    expect([lunch, dinner]).toMatchObject([
      { kind: "dejeuner", time: "12:30" },
      { kind: "diner", time: "20:15" },
    ]);
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

  it("transfère le segment actif vers une pastille alimentaire", () => {
    const draft = {
      ...createEmptyMealDraft("2026-07-16", "12:30"),
      freeText: "sauce maison, steak",
    };
    const suggestion = searchFoodAutocomplete(draft.freeText)[0]!;
    const nextDraft = addMealFoodSelection(draft, suggestion);

    expect(nextDraft.freeText).toBe("sauce maison");
    expect(nextDraft.selectedFoods[0]).toMatchObject({
      id: suggestion.ciqualCode,
      rawText: "steak",
      rawTexts: ["steak"],
      ciqualCode: suggestion.ciqualCode,
      source: "ciqual-2025",
      sourceVersion: "2025",
      count: 1,
      defaultUnit: "piece",
    });
    expect(nextDraft.selectedFoods[0]?.canonicalName.toLowerCase()).toContain(
      "steak",
    );
  });

  it("vide le champ quand tout le segment actif est confirmé", () => {
    const draft = {
      ...createEmptyMealDraft("2026-07-16", "12:30"),
      freeText: "steak",
    };
    const nextDraft = addMealFoodSelection(
      draft,
      searchFoodAutocomplete("steak")[0]!,
    );

    expect(nextDraft.freeText).toBe("");
    expect(nextDraft.selectedFoods[0]?.canonicalName.toLowerCase()).toContain(
      "steak",
    );
    expect(nextDraft.selectedFoods[0]?.ciqualCode).toMatch(/^\d+$/);
  });

  it("incrémente le même aliment plutôt que de créer deux pastilles", () => {
    const firstDraft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );
    const secondDraft = addMealFoodSelection(
      {
        ...firstDraft,
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );

    expect(secondDraft.freeText).toBe("");
    expect(secondDraft.selectedFoods).toHaveLength(1);
    expect(secondDraft.selectedFoods[0]).toMatchObject({
      rawText: "steak, steak",
      rawTexts: ["steak", "steak"],
      count: 2,
      defaultUnit: "piece",
    });
    expect(secondDraft.selectedFoods[0]?.ciqualCode).toMatch(/^\d+$/);
    expect(secondDraft.selectedFoods[0]?.canonicalName.toLowerCase()).toContain(
      "steak",
    );
  });

  it("restaure le texte d’origine quand une pastille est retirée", () => {
    const draft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "riz",
      },
      searchFoodAutocomplete("riz")[0]!,
    );

    const nextDraft = removeMealFoodSelection(draft, draft.selectedFoods[0]!.id);

    expect(nextDraft.freeText).toBe("riz");
    expect(nextDraft.selectedFoods).toEqual([]);
  });

  it("diminue une pastille x2 avant de la supprimer", () => {
    const firstDraft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );
    const secondDraft = addMealFoodSelection(
      {
        ...firstDraft,
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );
    const foodId = secondDraft.selectedFoods[0]!.id;
    const decrementedDraft = removeMealFoodSelection(secondDraft, foodId);
    const removedDraft = removeMealFoodSelection(decrementedDraft, foodId);

    expect(decrementedDraft.freeText).toBe("steak");
    expect(decrementedDraft.selectedFoods[0]).toMatchObject({
      count: 1,
      rawText: "steak",
      rawTexts: ["steak"],
    });
    expect(removedDraft.freeText).toBe("steak, steak");
    expect(removedDraft.selectedFoods).toEqual([]);
  });

  it("persiste les aliments sélectionnés comme items confirmés avec un vrai code Ciqual", () => {
    const firstDraft = addMealFoodSelection(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );
    const draft = addMealFoodSelection(
      {
        ...firstDraft,
        freeText: "steak",
      },
      searchFoodAutocomplete("steak")[0]!,
    );
    const meal = mealEntryFromDraft(draft, null);
    const firstItem = meal.mealStructure?.sections
      .find((section) => section.kind === "main")
      ?.passages[0]?.items[0];

    expect(meal.freeText).toBe("");
    expect(firstItem).toMatchObject({
      id: draft.selectedFoods[0]?.ciqualCode,
      rawText: "steak, steak",
      recognitionStatus: "confirmed",
      ciqualCode: draft.selectedFoods[0]?.ciqualCode,
      source: "ciqual-2025",
      sourceVersion: "2025",
      quantity: {
        amount: 2,
        unit: "piece",
        text: null,
        confidence: "medium",
      },
    });
    expect(firstItem?.canonicalName?.toLowerCase()).toContain("steak");
    expect(firstItem?.confidence).toBeGreaterThan(0);

    expect(mealDraftFromEntry(meal).selectedFoods[0]).toMatchObject({
      id: draft.selectedFoods[0]?.ciqualCode,
      rawText: "steak, steak",
      rawTexts: ["steak", "steak"],
      count: 2,
      defaultUnit: "piece",
      source: "ciqual-2025",
      sourceVersion: "2025",
    });
  });

  it("conserve un texte libre non reconnu sans inventer de code", () => {
    const meal = mealEntryFromDraft(
      {
        ...createEmptyMealDraft("2026-07-16", "12:30"),
        freeText: "truc maison introuvable",
      },
      null,
    );
    const firstItem = meal.mealStructure?.sections
      .find((section) => section.kind === "main")
      ?.passages[0]?.items[0];

    expect(firstItem).toMatchObject({
      rawText: "truc maison introuvable",
      recognitionStatus: "unprocessed",
      canonicalName: null,
      ciqualCode: null,
      confidence: null,
    });
  });
});
