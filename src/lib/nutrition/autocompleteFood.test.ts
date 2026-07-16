import { describe, expect, it } from "vitest";
import {
  activeFoodSegment,
  appendFoodInputText,
  removeActiveFoodSegment,
  searchFoodAutocomplete,
} from "@/lib/nutrition/autocompleteFood";

describe("autocompleteFood", () => {
  it("propose Riz quand l’utilisateur tape riz", () => {
    expect(searchFoodAutocomplete("riz")[0]).toMatchObject({
      id: "rice",
      label: "Riz",
      ciqualCode: null,
      source: "haru-food-seed-v0",
    });
  });

  it("tolère les variantes simples sans prétendre être Ciqual", () => {
    expect(searchFoodAutocomplete("staik")[0]).toMatchObject({
      id: "steak",
      label: "Steak",
      ciqualCode: null,
    });
  });

  it("cherche sur le segment actif du texte libre", () => {
    expect(activeFoodSegment("riz, pou")).toEqual({
      raw: "pou",
      start: 5,
      end: 8,
    });
    expect(searchFoodAutocomplete("riz, pou")[0]?.label).toBe("Poulet");
  });

  it("continue de proposer un aliment déjà confirmé pour permettre x2", () => {
    expect(searchFoodAutocomplete("riz", 1)).toHaveLength(1);
    expect(searchFoodAutocomplete("riz", 1)[0]?.id).toBe("rice");
  });

  it("retire uniquement le segment actif de la saisie libre", () => {
    expect(removeActiveFoodSegment("steak")).toBe("");
    expect(removeActiveFoodSegment("sauce maison, steak")).toBe(
      "sauce maison",
    );
    expect(removeActiveFoodSegment("riz ;  staik")).toBe("riz");
  });

  it("restaure un texte alimentaire sans abîmer la ponctuation", () => {
    expect(appendFoodInputText("", "steak")).toBe("steak");
    expect(appendFoodInputText("sauce maison", "steak")).toBe(
      "sauce maison, steak",
    );
  });
});
