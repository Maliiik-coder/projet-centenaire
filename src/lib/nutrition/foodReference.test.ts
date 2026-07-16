import { describe, expect, it } from "vitest";
import {
  parseFoodNumber,
  nutrientValuePerQuantity,
} from "@/lib/nutrition/foodReference";

describe("foodReference", () => {
  it("parse les valeurs Ciqual numériques sans inventer les inconnues", () => {
    expect(parseFoodNumber("12,5")).toEqual({
      value: 12.5,
      qualifier: "exact",
    });
    expect(parseFoodNumber("< 0,5")).toEqual({
      value: 0.5,
      qualifier: "less_than",
    });
    expect(parseFoodNumber("-")).toEqual({
      value: null,
      qualifier: "unknown",
    });
  });

  it("convertit une valeur pour 100 g vers une quantité donnée", () => {
    expect(
      nutrientValuePerQuantity({ value: 12, qualifier: "exact" }, 250),
    ).toEqual({
      value: 30,
      qualifier: "exact",
    });
  });
});
