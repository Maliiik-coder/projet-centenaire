import type { MealClarification, MealComponents } from "@/lib/types";

export const EMPTY_COMPONENTS: MealComponents = {
  proteins: false,
  vegetables: false,
  starches: false,
  fried: false,
  dessert: false,
  richSauce: false,
  ultraProcessed: false,
  sugaryDrink: false,
  zeroDrink: false,
  alcohol: false,
};

const componentKeywords: Array<{
  key: keyof MealComponents;
  words: string[];
}> = [
  {
    key: "proteins",
    words: [
      "bacon",
      "boeuf",
      "burger",
      "dinde",
      "jambon",
      "lardon",
      "merguez",
      "oeuf",
      "omelette",
      "poisson",
      "porc",
      "poulet",
      "saumon",
      "saucisse",
      "steak",
      "thon",
      "viande",
    ],
  },
  {
    key: "vegetables",
    words: [
      "aubergine",
      "brocoli",
      "carotte",
      "champignon",
      "concombre",
      "courgette",
      "epinard",
      "haricot",
      "legume",
      "lentille",
      "oignon",
      "poireau",
      "poivron",
      "salade",
      "tomate",
    ],
  },
  {
    key: "starches",
    words: [
      "bagel",
      "biscotte",
      "brioche",
      "bun",
      "cereale",
      "croissant",
      "frites",
      "galette",
      "muffin",
      "pain",
      "pate",
      "pates",
      "pizza",
      "pomme de terre",
      "quinoa",
      "riz",
      "semoule",
      "tacos",
      "tortilla",
      "wrap",
    ],
  },
  {
    key: "fried",
    words: ["beignet", "chips", "cordon bleu", "frit", "frites", "nuggets", "pane"],
  },
  {
    key: "dessert",
    words: [
      "bonbon",
      "brownie",
      "chocolat",
      "cookie",
      "dessert",
      "flan",
      "gateau",
      "glace",
      "tarte",
    ],
  },
  {
    key: "richSauce",
    words: [
      "beurre",
      "cheddar",
      "creme",
      "fromage",
      "ketchup",
      "mayonnaise",
      "mozzarella",
      "raclette",
      "sauce",
    ],
  },
  {
    key: "ultraProcessed",
    words: [
      "bacon",
      "burger",
      "chips",
      "cordon bleu",
      "hot dog",
      "kebab",
      "muffin",
      "nuggets",
      "pizza",
      "sandwich industriel",
      "saucisse",
      "tacos",
      "viennoiserie",
    ],
  },
  {
    key: "sugaryDrink",
    words: ["coca", "ice tea", "jus", "limonade", "orangina", "soda", "sprite"],
  },
  { key: "zeroDrink", words: ["coca zero", "light", "pepsi max", "pepsi zero", "zéro", "zero"] },
  {
    key: "alcohol",
    words: ["alcool", "aperitif", "biere", "champagne", "cocktail", "vin", "whisky"],
  },
];

const savoryMuffinContext = ["bacon", "oeuf", "jambon", "cheddar", "fromage"];

const ambiguousFoods = [
  {
    key: "wrap",
    question: "Le wrap était plutôt à quoi ?",
    patterns: ["wrap", "vrap", "ourap"],
  },
  {
    key: "sandwich",
    question: "Le sandwich était plutôt à quoi ?",
    patterns: ["sandwich"],
  },
  {
    key: "burger",
    question: "Le burger était plutôt à quoi ?",
    patterns: ["burger"],
  },
  {
    key: "tacos",
    question: "Le tacos était plutôt à quoi ?",
    patterns: ["tacos"],
  },
  {
    key: "pizza",
    question: "La pizza était plutôt à quoi ?",
    patterns: ["pizza"],
  },
  {
    key: "salade-composee",
    question: "La salade composée était plutôt à quoi ?",
    patterns: ["salade composee", "salade composée", "bowl"],
  },
  {
    key: "assiette-kebab",
    question: "L’assiette kebab était plutôt à quoi ?",
    patterns: ["assiette kebab", "kebab"],
  },
];

export const clarificationChoices = [
  "Poulet",
  "Thon",
  "Bœuf",
  "Fromage",
  "Végétarien",
  "Je ne sais pas",
  "Autre",
];

export function normalizeFoodText(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("œ", "oe")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function containsWord(text: string, word: string): boolean {
  return text.includes(normalizeFoodText(word));
}

export function detectMealComponents(text: string): MealComponents {
  const normalized = normalizeFoodText(text);
  const components = componentKeywords.reduce<MealComponents>(
    (current, item) => ({
      ...current,
      [item.key]: item.words.some((word) => containsWord(normalized, word)),
    }),
    { ...EMPTY_COMPONENTS },
  );

  if (
    containsWord(normalized, "muffin") &&
    savoryMuffinContext.some((word) => containsWord(normalized, word))
  ) {
    components.dessert = false;
  }

  if (components.zeroDrink) {
    components.sugaryDrink = false;
  }

  return components;
}

export function detectMealClarifications(text: string): MealClarification[] {
  const normalized = normalizeFoodText(text);

  return ambiguousFoods
    .filter((food) =>
      food.patterns.some((pattern) => containsWord(normalized, pattern)),
    )
    .slice(0, 2)
    .map((food) => ({
      key: food.key,
      question: food.question,
      value: null,
      customText: null,
    }));
}

export function mergeDetectedClarifications(
  text: string,
  existing: MealClarification[],
): MealClarification[] {
  const byKey = new Map(existing.map((item) => [item.key, item]));

  return detectMealClarifications(text).map((item) => byKey.get(item.key) ?? item);
}
