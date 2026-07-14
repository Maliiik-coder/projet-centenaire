import type { MealKind } from "@/lib/types";

export const activeMealKindLabels = {
  "petit-dejeuner": "Petit déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  grignotage: "Grignotage",
} satisfies Record<Exclude<MealKind, "collation" | "autre">, string>;

export const mealKindLabels: Record<MealKind, string> = {
  ...activeMealKindLabels,
  collation: "Grignotage",
  autre: "Autre observation",
};

export function normalizeMealKind(value: unknown): MealKind {
  if (value === "collation") {
    return "grignotage";
  }

  if (
    value === "petit-dejeuner" ||
    value === "dejeuner" ||
    value === "diner" ||
    value === "grignotage" ||
    value === "autre"
  ) {
    return value;
  }

  return "dejeuner";
}
