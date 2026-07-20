import { normalizeFoodText } from "@/lib/foodDetection";
import {
  CIQUAL_2025_SOURCE,
  type FoodReferenceMatchStatus,
} from "@/lib/nutrition/foodReference";
import ciqualIndexArtifact from "@/lib/nutrition/generated/ciqual-2025-index.json";

export interface CiqualArtifactMetadata {
  id: typeof CIQUAL_2025_SOURCE.id;
  sourceVersion: "2025";
  datasetDoi: string;
  datasetUrl: string;
  producer: string;
  license: string;
  citation: string;
  publicationDate: string;
  sourceFileDate: string;
  importDate: string;
  foodCount: number;
  nutrientCount: number;
  sourceFiles: Array<{
    name: string;
    persistentId: string;
    url: string;
    md5: string;
  }>;
}

export interface CiqualIndexedFood {
  code: string;
  name: string;
  groupName: string | null;
  subGroupName: string | null;
  subSubGroupName: string | null;
  normalizedName: string;
}

type CiqualIndexField = keyof CiqualIndexedFood;
type CiqualIndexFoodRow = [
  code: string,
  name: string,
  groupName: string | null,
  subGroupName: string | null,
  subSubGroupName: string | null,
  normalizedName: string,
];

interface CiqualIndexArtifact {
  metadata: CiqualArtifactMetadata;
  fields: CiqualIndexField[];
  foods: CiqualIndexFoodRow[];
}

export interface CiqualFoodSearchResult {
  ciqualCode: string;
  canonicalName: string;
  groupName: string | null;
  subGroupName: string | null;
  subSubGroupName: string | null;
  confidence: number;
  matchStatus: FoodReferenceMatchStatus;
  matchedText: string;
  source: typeof CIQUAL_2025_SOURCE.id;
  sourceVersion: "2025";
}

const ciqualIndex = ciqualIndexArtifact as CiqualIndexArtifact;
const searchableFoods = ciqualIndex.foods.map((row) => {
  const food = indexedFoodFromRow(row);

  return {
    ...food,
    nameTokens: tokenizeSearchText(food.normalizedName),
  };
});

export const CIQUAL_2025_INDEX_METADATA = ciqualIndex.metadata;

export function searchCiqualFoods(
  query: string,
  limit = 4,
): CiqualFoodSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const queryTokens = tokenizeSearchText(normalizedQuery);
  if (queryTokens.length === 0) return [];

  const scored = searchableFoods
    .map((food) => ({
      food,
      score: scoreFoodMatch(food, normalizedQuery, queryTokens),
    }))
    .filter((item) => item.score >= 24)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.food.name.length - b.food.name.length ||
        a.food.name.localeCompare(b.food.name),
    )
    .slice(0, Math.max(0, limit));

  return scored.map((item, index) => {
    const nextScore = scored[index + 1]?.score ?? 0;
    return toSearchResult(item.food, item.score, nextScore, normalizedQuery);
  });
}

export function normalizeCiqualFoodQuery(value: string): string {
  return normalizeSearchText(value);
}

function toSearchResult(
  food: CiqualIndexedFood,
  score: number,
  nextScore: number,
  matchedText: string,
): CiqualFoodSearchResult {
  return {
    ciqualCode: food.code,
    canonicalName: food.name,
    groupName: food.groupName,
    subGroupName: food.subGroupName,
    subSubGroupName: food.subSubGroupName,
    confidence: confidenceFromScore(score),
    matchStatus: matchStatusFromScores(score, nextScore),
    matchedText,
    source: CIQUAL_2025_SOURCE.id,
    sourceVersion: "2025",
  };
}

function indexedFoodFromRow(row: CiqualIndexFoodRow): CiqualIndexedFood {
  const [
    code,
    name,
    groupName,
    subGroupName,
    subSubGroupName,
    normalizedName,
  ] = row;

  return {
    code,
    name,
    groupName,
    subGroupName,
    subSubGroupName,
    normalizedName,
  };
}

function scoreFoodMatch(
  food: CiqualIndexedFood & { nameTokens: string[] },
  normalizedQuery: string,
  queryTokens: string[],
): number {
  let score = 0;

  if (food.normalizedName === normalizedQuery) score += 150;
  else if (food.normalizedName.startsWith(normalizedQuery)) score += 115;
  else if (food.normalizedName.includes(normalizedQuery)) score += 80;

  for (const queryToken of queryTokens) {
    score += bestTokenScore(queryToken, food.nameTokens);
  }

  return score - Math.min(25, food.nameTokens.length);
}

function bestTokenScore(queryToken: string, foodTokens: string[]): number {
  let best = 0;

  for (const foodToken of foodTokens) {
    if (foodToken === queryToken) return 48;
    if (foodToken.startsWith(queryToken)) best = Math.max(best, 34);
    if (
      queryToken.length >= 4 &&
      foodToken[0] === queryToken[0] &&
      Math.abs(queryToken.length - foodToken.length) <= 2
    ) {
      const distance = levenshteinDistance(queryToken, foodToken);
      const maxDistance = queryToken.length >= 5 ? 2 : 1;
      if (distance <= maxDistance) {
        best = Math.max(best, 46 - distance * 7);
      }
    }
  }

  return best;
}

function matchStatusFromScores(
  score: number,
  nextScore: number,
): FoodReferenceMatchStatus {
  if (score >= 130 && score - nextScore >= 20) return "safe";
  if (score >= 70 && score - nextScore >= 12) return "probable";
  return "ambiguous";
}

function confidenceFromScore(score: number): number {
  return Math.round(Math.min(0.98, Math.max(0.35, score / 150)) * 100) / 100;
}

function normalizeSearchText(value: string): string {
  return normalizeFoodText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .map(normalizePluralToken)
    .filter((token) => token.length >= 2);
}

function normalizePluralToken(token: string): string {
  if (token.length > 5 && token.endsWith("aux")) return `${token.slice(0, -3)}al`;
  if (token.length > 4 && (token.endsWith("s") || token.endsWith("x"))) {
    return token.slice(0, -1);
  }
  return token;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let aIndex = 1; aIndex <= a.length; aIndex += 1) {
    current[0] = aIndex;
    for (let bIndex = 1; bIndex <= b.length; bIndex += 1) {
      const substitutionCost = a[aIndex - 1] === b[bIndex - 1] ? 0 : 1;
      current[bIndex] = Math.min(
        current[bIndex - 1] + 1,
        previous[bIndex] + 1,
        previous[bIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}
