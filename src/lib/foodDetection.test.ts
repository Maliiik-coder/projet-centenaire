import { describe, expect, it } from "vitest";
import {
  detectMealClarifications,
  detectMealComponents,
} from "@/lib/foodDetection";

describe("food detection", () => {
  it("détecte muffin oeuf bacon sans le classer en dessert", () => {
    expect(detectMealComponents("Muffin oeuf bacon")).toMatchObject({
      proteins: true,
      starches: true,
      ultraProcessed: true,
      dessert: false,
    });
  });

  it("détecte salade de pâtes tomates wrap avec clarification wrap", () => {
    expect(detectMealComponents("Salade de pâtes tomates wrap")).toMatchObject({
      starches: true,
      vegetables: true,
    });
    expect(detectMealClarifications("Salade de pâtes tomates wrap")).toMatchObject([
      { key: "wrap" },
    ]);
  });

  it("détecte burger frites", () => {
    expect(detectMealComponents("Burger frites")).toMatchObject({
      proteins: true,
      starches: true,
      fried: true,
      ultraProcessed: true,
    });
  });

  it("détecte Pepsi zéro comme boisson zéro", () => {
    expect(detectMealComponents("Pepsi zéro")).toMatchObject({
      zeroDrink: true,
      sugaryDrink: false,
    });
  });
});
