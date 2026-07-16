import { describe, expect, it } from "vitest";
import {
  activeFoodSegment,
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

  it("masque les aliments déjà sélectionnés", () => {
    expect(searchFoodAutocomplete("riz", ["rice"])).toEqual([]);
  });
});
