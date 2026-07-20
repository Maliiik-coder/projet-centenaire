import { describe, expect, it } from "vitest";
import {
  combineGramRanges,
  findUsualPortionReferences,
  isNutritionEstimablePortion,
} from "@/lib/nutrition/portionCatalog";

describe("portionCatalog", () => {
  it("retrouve un repère de portion malgré les accents", () => {
    const matches = findUsualPortionReferences("une assiette de pâtes", "plate");

    expect(matches[0]?.id).toBe("cooked-pasta-plate");
    expect(matches[0]?.confidence).toBe("low");
    expect(matches[0] && isNutritionEstimablePortion(matches[0])).toBe(false);
  });

  it("sépare explicitement les volumes en ml des masses en g", () => {
    const matches = findUsualPortionReferences("bol de soupe", "bowl");

    expect(matches[0]?.source.kind).toBe("public_health_reference");
    expect(matches[0]?.gramRange).toBeNull();
    expect(matches[0]?.milliliterRange?.central).toBe(250);
    expect(matches[0] && isNutritionEstimablePortion(matches[0])).toBe(false);
  });

  it("autorise seulement les portions massiques institutionnelles pour l’estimation", () => {
    const matches = findUsualPortionReferences("pomme", "piece");

    expect(matches[0]?.source.kind).toBe("public_health_reference");
    expect(matches[0]?.gramRange?.central).toBe(90);
    expect(matches[0] && isNutritionEstimablePortion(matches[0])).toBe(true);
  });

  it("multiplie une fourchette de grammes sans produire une valeur exacte", () => {
    expect(combineGramRanges({ low: 80, central: 90, high: 100 }, 2)).toEqual({
      low: 160,
      central: 180,
      high: 200,
    });
  });
});
