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

const MAX_MEAL_CLARIFICATIONS = 3;

const opaqueMealDescriptors = [
  "bacon",
  "boeuf",
  "cheddar",
  "dinde",
  "falafel",
  "fromage",
  "jambon",
  "oeuf",
  "poisson",
  "porc",
  "poulet",
  "saumon",
  "steak",
  "thon",
  "vegetarien",
  "veggie",
];

const sauceDescriptors = [
  "barbecue",
  "bbq",
  "blanche",
  "creme",
  "curry",
  "fromage",
  "ketchup",
  "legere",
  "mayo",
  "mayonnaise",
  "moutarde",
  "pesto",
  "poivre",
  "soja",
  "tomate",
  "vinaigrette",
];

const drinkDescriptors = [
  "alcool",
  "biere",
  "eau",
  "jus",
  "light",
  "sucre",
  "vin",
  "zero",
];

const ambiguousFoods: Array<{
  key: string;
  question: string;
  patterns: string[];
  priority: number;
  satisfiedBy?: string[];
}> = [
  {
    key: "wrap",
    question: "Le wrap était plutôt à quoi ?",
    patterns: ["wrap", "vrap", "ourap"],
    priority: 100,
    satisfiedBy: opaqueMealDescriptors,
  },
  {
    key: "sandwich",
    question: "Le sandwich était plutôt à quoi ?",
    patterns: ["sandwich"],
    priority: 95,
    satisfiedBy: opaqueMealDescriptors,
  },
  {
    key: "burger",
    question: "Le burger était plutôt à quoi ?",
    patterns: ["burger"],
    priority: 90,
    satisfiedBy: opaqueMealDescriptors,
  },
  {
    key: "tacos",
    question: "Le tacos était plutôt à quoi ?",
    patterns: ["tacos"],
    priority: 90,
    satisfiedBy: opaqueMealDescriptors,
  },
  {
    key: "assiette-kebab",
    question: "L’assiette kebab était plutôt à quoi ?",
    patterns: ["assiette kebab", "kebab"],
    priority: 85,
    satisfiedBy: opaqueMealDescriptors,
  },
  {
    key: "sauce",
    question: "La sauce était plutôt à quoi ?",
    patterns: ["sauce"],
    priority: 80,
    satisfiedBy: sauceDescriptors,
  },
  {
    key: "boisson",
    question: "La boisson était plutôt quoi ?",
    patterns: ["boisson", "soda"],
    priority: 70,
    satisfiedBy: drinkDescriptors,
  },
  {
    key: "pizza",
    question: "La pizza était plutôt à quoi ?",
    patterns: ["pizza"],
    priority: 55,
  },
  {
    key: "dessert-maison",
    question: "Le dessert maison était plutôt quoi ?",
    patterns: ["dessert maison", "dessert fait maison"],
    priority: 45,
  },
  {
    key: "salade-composee",
    question: "La salade composée était plutôt à quoi ?",
    patterns: ["salade composee", "salade composée", "bowl"],
    priority: 20,
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

const clarificationChoicesByKey: Record<string, string[]> = {
  sauce: [
    "Tomate",
    "Crème / fromage",
    "Mayonnaise",
    "Sauce légère",
    "Je ne sais pas",
    "Autre",
  ],
  boisson: [
    "Eau",
    "Soda sucré",
    "Zéro / light",
    "Jus",
    "Alcool",
    "Je ne sais pas",
    "Autre",
  ],
  "dessert-maison": [
    "Fruit / compote",
    "Yaourt",
    "Gâteau / tarte",
    "Glace / crème",
    "Je ne sais pas",
    "Autre",
  ],
};

export function getClarificationChoices(key: string): string[] {
  return clarificationChoicesByKey[key] ?? clarificationChoices;
}

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsDescriptor(text: string, descriptor: string): boolean {
  const normalizedDescriptor = escapeRegExp(normalizeFoodText(descriptor))
    .trim()
    .replace(/\s+/g, "\\s+");

  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${normalizedDescriptor}([^\\p{L}\\p{N}]|$)`,
    "u",
  ).test(text);
}

function hasNearbyDescriptor(
  text: string,
  patterns: string[],
  descriptors: string[],
): boolean {
  return patterns.some((pattern) => {
    const normalizedPattern = normalizeFoodText(pattern);
    let index = text.indexOf(normalizedPattern);

    while (index !== -1) {
      const context = text.slice(
        Math.max(0, index - 45),
        index + normalizedPattern.length + 75,
      );

      if (descriptors.some((descriptor) => containsDescriptor(context, descriptor))) {
        return true;
      }

      index = text.indexOf(normalizedPattern, index + normalizedPattern.length);
    }

    return false;
  });
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
      food.patterns.some((pattern) => containsWord(normalized, pattern)) &&
      !(
        food.satisfiedBy &&
        hasNearbyDescriptor(normalized, food.patterns, food.satisfiedBy)
      ),
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_MEAL_CLARIFICATIONS)
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
