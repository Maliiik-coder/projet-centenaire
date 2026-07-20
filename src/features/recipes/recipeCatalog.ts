import type {
  Recipe,
  RecipeCategory,
  RecipeFoodState,
  RecipeIngredient,
  RecipeIngredientUnit,
} from "@/features/recipes/recipeTypes";

export const recipeCategoryLabels: Record<RecipeCategory, string> = {
  breakfast: "Petit déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Grignotage",
};

export const recipeCatalog: Recipe[] = [
  {
    id: "catalog-salade-pates-tomates",
    category: "lunch",
    cookMinutes: 10,
    createdAt: "2026-07-20T08:00:00.000Z",
    description: "Une base froide facile à préparer, pensée pour un repas simple à relire dans le carnet.",
    ingredients: [
      ingredient({
        ciqualCode: "9811",
        ciqualName: "Pâtes sèches, standard, cuites, sans sel ajouté",
        foodState: "cooked",
        id: "ingredient-1",
        label: "Pâtes cuites",
        quantity: 220,
      }),
      ingredient({
        ciqualCode: "20192",
        ciqualName: "Tomate côtelée ou coeur de boeuf, crue",
        foodState: "raw",
        id: "ingredient-2",
        label: "Tomates",
        quantity: 180,
      }),
      ingredient({
        ciqualCode: "20019",
        ciqualName: "Concombre, chair et peau, cru",
        foodState: "raw",
        id: "ingredient-3",
        label: "Concombre",
        quantity: 120,
      }),
      ingredient({
        ciqualCode: "26039",
        ciqualName: "Thon, au naturel, appertisé, égoutté",
        foodState: "cooked",
        id: "ingredient-4",
        label: "Thon au naturel égoutté",
        quantity: 90,
      }),
      ingredient({
        ciqualCode: "17270",
        ciqualName: "Huile d'olive vierge extra",
        foodState: "not_applicable",
        id: "ingredient-5",
        label: "Huile d’olive",
        quantity: 12,
      }),
      ingredient({
        id: "ingredient-6",
        label: "Herbes",
        unit: "free",
      }),
    ],
    origin: "catalog",
    prepMinutes: 15,
    servings: 2,
    steps: [
      { id: "step-1", text: "Couper les légumes et les mélanger aux pâtes froides." },
      { id: "step-2", text: "Ajouter le thon." },
      { id: "step-3", text: "Assaisonner simplement, puis garder au frais si besoin." },
    ],
    tags: ["Repas froid", "Préparable"],
    title: "Salade de pâtes et tomates",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    id: "catalog-wrap-oeuf-crudites",
    category: "lunch",
    cookMinutes: 8,
    createdAt: "2026-07-20T08:00:00.000Z",
    description: "Un wrap court, pratique, avec un contenu explicite pour éviter les repas trop flous.",
    ingredients: [
      ingredient({
        id: "ingredient-1",
        label: "Galette de blé",
        quantity: 1,
        unit: "piece",
      }),
      ingredient({
        ciqualCode: "22010",
        ciqualName: "Oeuf dur",
        foodState: "cooked",
        id: "ingredient-2",
        label: "Oeuf dur",
        quantity: 60,
      }),
      ingredient({
        ciqualCode: "20031",
        ciqualName: "Laitue, crue",
        foodState: "raw",
        id: "ingredient-3",
        label: "Salade",
        quantity: 30,
      }),
      ingredient({
        ciqualCode: "20009",
        ciqualName: "Carotte, crue",
        foodState: "raw",
        id: "ingredient-4",
        label: "Carotte râpée",
        quantity: 50,
      }),
      ingredient({
        id: "ingredient-5",
        label: "Sauce yaourt ou moutarde douce",
        unit: "free",
      }),
    ],
    origin: "catalog",
    prepMinutes: 10,
    servings: 1,
    steps: [
      { id: "step-1", text: "Cuire les oeufs puis les couper." },
      { id: "step-2", text: "Garnir la galette avec les crudités et les oeufs." },
      { id: "step-3", text: "Rouler serré et couper en deux." },
    ],
    tags: ["Rapide", "À emporter"],
    title: "Wrap oeuf et crudités",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    id: "catalog-bol-yaourt-fruits",
    category: "breakfast",
    cookMinutes: 0,
    createdAt: "2026-07-20T08:00:00.000Z",
    description: "Un bol de petit déjeuner très lisible, sans préparation compliquée.",
    ingredients: [
      ingredient({
        ciqualCode: "19546",
        ciqualName: "Lait fermenté type yaourt au bifidus, nature",
        foodState: "not_applicable",
        id: "ingredient-1",
        label: "Yaourt nature",
        quantity: 125,
      }),
      ingredient({
        id: "ingredient-2",
        label: "Fruit de saison",
        quantity: 1,
        unit: "piece",
      }),
      ingredient({
        ciqualCode: "32140",
        ciqualName: "Flocons d'avoine",
        foodState: "raw",
        id: "ingredient-3",
        label: "Flocons d’avoine",
        quantity: 35,
      }),
      ingredient({
        id: "ingredient-4",
        label: "Quelques noix ou graines",
        unit: "free",
      }),
    ],
    origin: "catalog",
    prepMinutes: 5,
    servings: 1,
    steps: [
      { id: "step-1", text: "Verser le yaourt dans un bol." },
      { id: "step-2", text: "Ajouter le fruit coupé, les flocons et les noix." },
    ],
    tags: ["Simple", "Sans cuisson"],
    title: "Bol yaourt, fruit et avoine",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    id: "catalog-poelee-legumes-riz",
    category: "dinner",
    cookMinutes: 18,
    createdAt: "2026-07-20T08:00:00.000Z",
    description: "Une assiette chaude facile à adapter avec les légumes disponibles.",
    ingredients: [
      ingredient({
        ciqualCode: "9104",
        ciqualName: "Riz blanc, cuit, sans sel ajouté",
        foodState: "cooked",
        id: "ingredient-1",
        label: "Riz cuit",
        quantity: 280,
      }),
      ingredient({
        ciqualCode: "20021",
        ciqualName: "Courgette, chair et peau, cuite",
        foodState: "cooked",
        id: "ingredient-2",
        label: "Courgette",
        quantity: 180,
      }),
      ingredient({
        ciqualCode: "20056",
        ciqualName: "Champignon de Paris ou champignon de couche, cru",
        foodState: "raw",
        id: "ingredient-3",
        label: "Champignons",
        quantity: 120,
      }),
      ingredient({
        ciqualCode: "20507",
        ciqualName: "Pois chiche, bouilli/cuit à l'eau",
        foodState: "cooked",
        id: "ingredient-4",
        label: "Pois chiches cuits",
        quantity: 120,
      }),
      ingredient({
        id: "ingredient-5",
        label: "Épices douces",
        unit: "free",
      }),
    ],
    origin: "catalog",
    prepMinutes: 10,
    servings: 2,
    steps: [
      { id: "step-1", text: "Faire revenir les légumes coupés." },
      { id: "step-2", text: "Ajouter les pois chiches et les épices." },
      { id: "step-3", text: "Servir avec le riz chaud." },
    ],
    tags: ["Chaud", "Adaptable"],
    title: "Poêlée légumes, riz et pois chiches",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
  {
    id: "catalog-tartine-fromage-fruit",
    category: "snack",
    cookMinutes: 0,
    createdAt: "2026-07-20T08:00:00.000Z",
    description: "Une option de grignotage posée, avec peu d’éléments à noter.",
    ingredients: [
      ingredient({
        ciqualCode: "7110",
        ciqualName: "Pain complet ou intégral (à la farine T150)",
        foodState: "not_applicable",
        id: "ingredient-1",
        label: "Pain complet",
        quantity: 60,
      }),
      ingredient({
        ciqualCode: "12068",
        ciqualName: "Fromage frais ou spécialité fromagère non affinée, nature, à tartiner, en barquette, non allégée en matière grasse",
        foodState: "not_applicable",
        id: "ingredient-2",
        label: "Fromage frais",
        quantity: 35,
      }),
      ingredient({
        id: "ingredient-3",
        label: "Fruit",
        quantity: 1,
        unit: "piece",
      }),
    ],
    origin: "catalog",
    prepMinutes: 5,
    servings: 1,
    steps: [
      { id: "step-1", text: "Tartiner le pain." },
      { id: "step-2", text: "Servir avec le fruit à côté." },
    ],
    tags: ["Court", "Sans cuisson"],
    title: "Tartine fromage frais et fruit",
    updatedAt: "2026-07-20T08:00:00.000Z",
  },
];

function ingredient({
  ciqualCode = null,
  ciqualName = null,
  foodState = "unknown",
  id,
  label,
  quantity = null,
  unit = "g",
}: {
  ciqualCode?: string | null;
  ciqualName?: string | null;
  foodState?: RecipeFoodState;
  id: string;
  label: string;
  quantity?: number | null;
  unit?: RecipeIngredientUnit;
}): RecipeIngredient {
  const grams = gramsFromIngredientQuantity(quantity, unit);

  return {
    ciqualCode,
    ciqualName,
    foodState,
    grams,
    id,
    label,
    quantity,
    reliability: ciqualCode && grams !== null
      ? "ciqual_linked"
      : quantity !== null
        ? "user_declared"
        : "incomplete",
    text: formatIngredientText({ label, quantity, unit }),
    unit,
  };
}

function gramsFromIngredientQuantity(
  quantity: number | null,
  unit: RecipeIngredientUnit,
): number | null {
  if (quantity === null || quantity <= 0) {
    return null;
  }

  if (unit === "g") {
    return Math.round(quantity * 10) / 10;
  }
  if (unit === "kg") {
    return Math.round(quantity * 1000 * 10) / 10;
  }

  return null;
}

function formatIngredientText({
  label,
  quantity,
  unit,
}: {
  label: string;
  quantity: number | null;
  unit: RecipeIngredientUnit;
}): string {
  if (!quantity || unit === "free") {
    return label;
  }

  if (unit === "piece") {
    return `${quantity} ${quantity > 1 ? "pièces" : "pièce"} ${label}`;
  }
  if (unit === "tablespoon") {
    return `${quantity} c. à soupe ${label}`;
  }
  if (unit === "teaspoon") {
    return `${quantity} c. à café ${label}`;
  }
  if (unit === "pinch") {
    return `${quantity} ${quantity > 1 ? "pincées" : "pincée"} ${label}`;
  }

  return `${quantity} ${unit} ${label}`;
}
