import { describe, expect, it } from "vitest";
import {
  applyRecipeIngredientLabelChange,
  applyRecipeIngredientSuggestion,
  clearRecipeIngredientAssociation,
  shouldSearchRecipeIngredientLabel,
  toRecipeIngredientSearchSuggestion,
} from "@/features/recipes/recipeIngredientAssociation";
import type { RecipeIngredientDraft } from "@/features/recipes/recipeTypes";

describe("recipeIngredientAssociation", () => {
  it("attend quelques caracteres avant de rechercher un aliment", () => {
    expect(shouldSearchRecipeIngredientLabel("ri")).toBe(false);
    expect(shouldSearchRecipeIngredientLabel("riz")).toBe(true);
    expect(shouldSearchRecipeIngredientLabel("  pâtes  ")).toBe(true);
  });

  it("selectionne une suggestion sans remplacer le libelle saisi", () => {
    const selected = applyRecipeIngredientSuggestion(
      ingredientDraft({ label: "carottes du marché" }),
      suggestion("20009", "Carotte, crue"),
    );

    expect(selected).toMatchObject({
      ciqualCode: "20009",
      ciqualName: "Carotte, crue",
      label: "carottes du marché",
      reliability: "incomplete",
    });
  });

  it("laisse un ingredient libre sans bloquer la saisie", () => {
    const draft = applyRecipeIngredientLabelChange(
      ingredientDraft(),
      "mélange maison",
    );

    expect(draft).toMatchObject({
      ciqualCode: "",
      ciqualName: "",
      label: "mélange maison",
    });
  });

  it("efface l'association quand le libelle change", () => {
    const draft = ingredientDraft({
      ciqualCode: "20009",
      ciqualName: "Carotte, crue",
      label: "Carotte",
    });

    const changed = applyRecipeIngredientLabelChange(draft, "Carotte râpée");

    expect(changed).toMatchObject({
      ciqualCode: "",
      ciqualName: "",
      label: "Carotte râpée",
      reliability: "incomplete",
    });
  });

  it("remplace une association par une autre suggestion", () => {
    const selected = applyRecipeIngredientSuggestion(
      ingredientDraft({
        ciqualCode: "20009",
        ciqualName: "Carotte, crue",
        label: "légume",
      }),
      suggestion("20011", "Carotte, cuite"),
    );

    expect(selected.ciqualCode).toBe("20011");
    expect(selected.ciqualName).toBe("Carotte, cuite");
  });

  it("retire une association sans supprimer le libelle ni la quantite", () => {
    const cleared = clearRecipeIngredientAssociation(
      ingredientDraft({
        ciqualCode: "20009",
        ciqualName: "Carotte, crue",
        label: "Carotte",
        quantity: "200",
      }),
    );

    expect(cleared).toMatchObject({
      ciqualCode: "",
      ciqualName: "",
      label: "Carotte",
      quantity: "200",
    });
  });

  it("adapte les resultats CIQUAL en suggestions lisibles", () => {
    expect(
      toRecipeIngredientSearchSuggestion({
        canonicalName: "Riz blanc, cuit",
        ciqualCode: "9104",
        groupName: null,
        subGroupName: "Céréales",
      }),
    ).toEqual({
      ciqualCode: "9104",
      ciqualName: "Riz blanc, cuit",
      groupName: "Céréales",
    });
  });
});

function ingredientDraft(
  overrides: Partial<RecipeIngredientDraft> = {},
): RecipeIngredientDraft {
  return {
    ciqualCode: "",
    ciqualName: "",
    foodState: "unknown",
    id: "ingredient-draft-1",
    label: "",
    quantity: "",
    reliability: "incomplete",
    unit: "g",
    ...overrides,
  };
}

function suggestion(ciqualCode: string, ciqualName: string) {
  return {
    ciqualCode,
    ciqualName,
    groupName: "Légumes",
  };
}
