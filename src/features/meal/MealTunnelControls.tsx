"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { getClarificationChoices } from "@/lib/foodDetection";
import type { FoodAutocompleteSuggestion } from "@/lib/nutrition/autocompleteFood";
import type { MealClarification, MealQuantityUnit } from "@/lib/types";
import {
  quickQuantityUnits,
  quantityUnitLabels,
  type MealDraftFoodSelection,
  type MealQuantityDraft,
} from "@/features/meal/mealDraftModel";

export const mealInputClass =
  "min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";
export const mealAnnotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";

export function MealTunnelButton({
  children,
  onClick,
  variant = "ink",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "ink" | "line";
}) {
  const classes =
    variant === "ink"
      ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-hover)]"
      : "border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-muted)]";

  return (
    <button
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99] ${classes}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TunnelQuestion({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
        {title}
      </h1>
      {children}
    </section>
  );
}

export function QuantityFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MealQuantityDraft;
  onChange: (value: MealQuantityDraft) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className={mealAnnotationClass}>{label}</p>
      <div className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-2">
        <input
          className={mealInputClass}
          inputMode="decimal"
          value={value.amount}
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
          placeholder="1"
        />
        <select
          className={mealInputClass}
          value={value.unit}
          onChange={(event) =>
            onChange({
              ...value,
              unit: event.target.value as MealQuantityUnit,
            })
          }
        >
          {quickQuantityUnits.map((unit) => (
            <option key={unit} value={unit}>
              {quantityUnitLabels[unit]}
            </option>
          ))}
        </select>
      </div>
      {value.unit === "other" || value.unit === "unknown" ? (
        <input
          className={mealInputClass}
          value={value.note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="Précise si tu veux"
        />
      ) : null}
    </div>
  );
}

export function TunnelChoiceLine<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onPick: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`min-h-12 cursor-pointer rounded-[18px] border px-4 text-left text-base transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px active:scale-[0.99] ${
              selected
                ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onPick(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}

export function SelectedFoodChips({
  foods,
  onRemove,
}: {
  foods: MealDraftFoodSelection[];
  onRemove: (foodId: string) => void;
}) {
  if (foods.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {foods.map((food) => (
        <span
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 text-sm font-semibold text-[var(--pc-color-text)]"
          key={food.id}
        >
          {food.canonicalName}
          <button
            aria-label={`Retirer ${food.canonicalName}`}
            className="inline-flex size-5 items-center justify-center rounded-full text-[var(--pc-color-text-muted)] transition hover:bg-[var(--pc-color-primary-muted)] hover:text-[var(--pc-color-text)]"
            type="button"
            onClick={() => onRemove(food.id)}
          >
            <X aria-hidden="true" size={13} strokeWidth={2.5} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function FoodSuggestionPicker({
  suggestions,
  onPick,
}: {
  suggestions: FoodAutocompleteSuggestion[];
  onPick: (suggestion: FoodAutocompleteSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="grid gap-2">
      <p className={mealAnnotationClass}>Suggestions</p>
      <div className="grid gap-2">
        {suggestions.map((suggestion) => (
          <button
            className="flex min-h-12 items-center gap-3 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-3 text-left text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] transition hover:-translate-y-0.5 hover:border-[var(--pc-color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px"
            key={suggestion.id}
            type="button"
            onClick={() => onPick(suggestion)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-sm font-bold text-[var(--pc-color-primary)]">
              {suggestion.label.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">
                {suggestion.label}
              </span>
              <span className="block text-xs font-semibold text-[var(--pc-color-text-muted)]">
                {categoryLabels[suggestion.category]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ClarificationQuestion({
  clarification,
  onChange,
}: {
  clarification: MealClarification;
  onChange: (clarification: MealClarification) => void;
}) {
  const choices = getClarificationChoices(clarification.key);

  return (
    <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)]">
      <p className="mb-3 text-sm font-semibold text-[var(--pc-color-text)]">
        {clarification.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = clarification.value === choice;

          return (
            <button
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                selected
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)]"
              }`}
              key={choice}
              type="button"
              onClick={() =>
                onChange({
                  ...clarification,
                  value: choice,
                  customText:
                    choice === "Autre" ? clarification.customText ?? "" : null,
                })
              }
            >
              {choice}
            </button>
          );
        })}
      </div>
      {clarification.value === "Autre" ? (
        <input
          className={`${mealInputClass} mt-3`}
          value={clarification.customText ?? ""}
          onChange={(event) =>
            onChange({ ...clarification, customText: event.target.value })
          }
          placeholder="Précise en quelques mots"
        />
      ) : null}
    </div>
  );
}

const categoryLabels: Record<FoodAutocompleteSuggestion["category"], string> = {
  dairy: "Produit laitier",
  dessert: "Dessert",
  drink: "Boisson",
  fruit: "Fruit",
  prepared: "Préparation",
  protein: "Protéine",
  starch: "Féculent",
  vegetable: "Végétal",
};

export function FindingPart({
  title,
  text,
  emphasized = false,
}: {
  title: string;
  text: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className={mealAnnotationClass}>{title}</p>
      <p
        className={
          emphasized
            ? "mt-2 font-serif text-3xl leading-tight text-[var(--pc-color-text)]"
            : "mt-2 leading-7 text-[var(--pc-color-text)]"
        }
      >
        {text}
      </p>
    </div>
  );
}
