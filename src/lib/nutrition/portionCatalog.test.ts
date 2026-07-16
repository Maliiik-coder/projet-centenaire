import { describe, expect, it } from "vitest";
import {
  combineGramRanges,
  findUsualPortionReferences,
} from "@/lib/nutrition/portionCatalog";

describe("portionCatalog", () => {
  it("retrouve un repère de portion malgré les accents", () => {
    const matches = findUsualPortionReferences("une assiette de pâtes", "plate");

    expect(matches[0]?.id).toBe("cooked-pasta-plate");
    expect(matches[0]?.confidence).toBe("low");
  });

  it("sépare les portions de santé publique des portions éditoriales", () => {
    const matches = findUsualPortionReferences("bol de soupe", "bowl");

    expect(matches[0]?.source.kind).toBe("public_health_reference");
    expect(matches[0]?.gramRange.central).toBe(250);
  });

  it("multiplie une fourchette de grammes sans produire une valeur exacte", () => {
    expect(combineGramRanges({ low: 80, central: 90, high: 100 }, 2)).toEqual({
      low: 160,
      central: 180,
      high: 200,
    });
  });
});
