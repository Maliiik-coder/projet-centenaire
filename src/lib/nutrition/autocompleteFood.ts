import { normalizeFoodText } from "@/lib/foodDetection";
import {
  type CiqualFoodSearchResult,
  searchCiqualFoods,
} from "@/lib/nutrition/ciqualFoods";
import { CIQUAL_2025_SOURCE } from "@/lib/nutrition/foodReference";
import type { MealQuantityUnit } from "@/lib/types";

export const FOOD_AUTOCOMPLETE_SOURCE = "haru-food-seed-v0";

export type FoodAutocompleteCategory =
  | "starch"
  | "protein"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "drink"
  | "prepared"
  | "dessert";

export interface FoodAutocompleteEntry {
  id: string;
  label: string;
  aliases: string[];
  category: FoodAutocompleteCategory;
  defaultUnit: MealQuantityUnit;
  imageSrc: string;
  ciqualCode: string | null;
  source: typeof FOOD_AUTOCOMPLETE_SOURCE;
}

export interface FoodAutocompleteSuggestion {
  id: string;
  label: string;
  category: FoodAutocompleteCategory;
  defaultUnit: MealQuantityUnit;
  imageSrc: string;
  ciqualCode: string | null;
  source: typeof FOOD_AUTOCOMPLETE_SOURCE | typeof CIQUAL_2025_SOURCE.id;
  sourceVersion: string | null;
  matchStatus: CiqualFoodSearchResult["matchStatus"];
  confidence: number;
  matchedText: string;
}

export const foodAutocompleteSeed: FoodAutocompleteEntry[] = [
  food("rice", "Riz", ["ri", "riz", "riz blanc", "riz complet"], "starch", "plate"),
  food("pasta", "Pâtes", ["pate", "pates", "pâtes", "spaghetti"], "starch", "plate"),
  food("fries", "Frites", ["frite", "frites"], "starch", "portion"),
  food("potato", "Pommes de terre", ["pomme de terre", "patate"], "starch", "portion"),
  food("bread", "Pain", ["pain", "baguette"], "starch", "slice"),
  food("steak", "Steak", ["steak", "ste", "staik", "steque"], "protein", "piece"),
  food("chicken", "Poulet", ["poulet", "blanc de poulet"], "protein", "piece"),
  food("ham", "Jambon", ["jambon"], "protein", "slice"),
  food("egg", "Oeuf", ["oeuf", "œuf", "omelette"], "protein", "piece"),
  food("salmon", "Saumon", ["saumon"], "protein", "piece"),
  food("tuna", "Thon", ["thon"], "protein", "portion"),
  food("burger", "Burger", ["burger", "hamburger"], "prepared", "piece"),
  food("pizza", "Pizza", ["pizza"], "prepared", "slice"),
  food("wrap", "Wrap", ["wrap", "vrap", "ourap"], "prepared", "piece"),
  food("sandwich", "Sandwich", ["sandwich"], "prepared", "piece"),
  food("salad", "Salade", ["salade", "salade verte"], "vegetable", "bowl"),
  food("tomato", "Tomate", ["tomate", "tomates"], "vegetable", "piece"),
  food("mushroom", "Champignons", ["champignon", "champignons"], "vegetable", "portion"),
  food("carrot", "Carottes", ["carotte", "carottes"], "vegetable", "portion"),
  food("apple", "Pomme", ["pomme"], "fruit", "piece"),
  food("banana", "Banane", ["banane"], "fruit", "piece"),
  food("yogurt", "Yaourt", ["yaourt", "yogourt"], "dairy", "piece"),
  food("cheese", "Fromage", ["fromage"], "dairy", "portion"),
  food("soup", "Soupe", ["soupe", "potage"], "prepared", "bowl"),
  food("water", "Eau", ["eau"], "drink", "glass"),
  food("soda-zero", "Soda zéro", ["coca zero", "coca zéro", "zero", "zéro"], "drink", "glass"),
  food("soda", "Soda sucré", ["soda", "coca", "pepsi", "sprite"], "drink", "glass"),
  food("cake", "Gâteau", ["gateau", "gâteau", "cake"], "dessert", "slice"),
  food("ice-cream", "Glace", ["glace"], "dessert", "portion"),
];

export function searchFoodAutocomplete(
  text: string,
  limit = 4,
): FoodAutocompleteSuggestion[] {
  const segment = activeFoodSegment(text);
  if (foodAutocompleteQuery(segment.raw).normalized.length < 2) return [];

  return searchCiqualFoods(segment.raw, limit).map((result) => {
    const metadata = foodUxMetadata(result);

    return {
      id: result.ciqualCode,
      label: result.canonicalName,
      category: metadata.category,
      defaultUnit: metadata.defaultUnit,
      imageSrc: metadata.imageSrc,
      ciqualCode: result.ciqualCode,
      source: result.source,
      sourceVersion: result.sourceVersion,
      matchStatus: result.matchStatus,
      confidence: result.confidence,
      matchedText: segment.raw || result.matchedText,
    };
  });
}

export function activeFoodSegment(text: string): {
  raw: string;
  start: number;
  end: number;
} {
  const delimiters = [",", ";", "\n", "+"];
  const lastDelimiter = Math.max(
    ...delimiters.map((delimiter) => text.lastIndexOf(delimiter)),
  );
  const start = lastDelimiter >= 0 ? lastDelimiter + 1 : 0;
  const raw = text.slice(start);
  const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;

  return {
    raw: raw.trim(),
    start: start + leadingWhitespace,
    end: text.length,
  };
}

export function removeActiveFoodSegment(text: string): string {
  const segment = activeFoodSegment(text);
  if (!segment.raw) return cleanFoodInputText(text);

  return cleanFoodInputText(`${text.slice(0, segment.start)}${text.slice(segment.end)}`);
}

export function appendFoodInputText(text: string, rawText: string): string {
  const cleanText = cleanFoodInputText(text);
  const cleanRawText = cleanFoodInputText(rawText);

  if (!cleanRawText) return cleanText;
  if (!cleanText) return cleanRawText;
  return `${cleanText}, ${cleanRawText}`;
}

export function cleanFoodInputText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*([,;+])\s*/g, "$1 ")
    .replace(/(?:[,;+]\s*){2,}/g, ", ")
    .replace(/^[,;+\s]+/, "")
    .replace(/[,;+\s]+$/, "")
    .trim();
}

function food(
  id: string,
  label: string,
  aliases: string[],
  category: FoodAutocompleteCategory,
  defaultUnit: MealQuantityUnit,
): FoodAutocompleteEntry {
  return {
    id,
    label,
    aliases,
    category,
    defaultUnit,
    imageSrc: `/food-autocomplete/${id}.png`,
    ciqualCode: null,
    source: FOOD_AUTOCOMPLETE_SOURCE,
  };
}

function foodAutocompleteQuery(text: string): { raw: string; normalized: string } {
  const segment = activeFoodSegment(text);

  return {
    raw: segment.raw,
    normalized: normalizeFoodText(segment.raw),
  };
}

function foodUxMetadata(result: CiqualFoodSearchResult): {
  category: FoodAutocompleteCategory;
  defaultUnit: MealQuantityUnit;
  imageSrc: string;
} {
  const normalized = normalizeFoodText(
    [
      result.canonicalName,
      result.groupName,
      result.subGroupName,
      result.subSubGroupName,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const seed = foodAutocompleteSeed.find((entry) =>
    entry.aliases.some((alias) => normalized.includes(normalizeFoodText(alias))),
  );

  return {
    category: seed?.category ?? "prepared",
    defaultUnit: seed?.defaultUnit ?? "portion",
    imageSrc: seed?.imageSrc ?? "/food-autocomplete/fallback.png",
  };
}
