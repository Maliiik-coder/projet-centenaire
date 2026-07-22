"use client";

import { Cigarette, Plus } from "lucide-react";
import { formatLongDate } from "@/lib/dates";
import {
  INITIAL_OBSERVATION_DAYS,
  isInitialObservationDay,
} from "@/lib/observationPhase";
import type {
  ISODate,
  MealComponents,
  MealEntry,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";
import { TodayActionTile } from "@/components/centenaire/TodayActionTile";
import { Surface } from "@/components/ui";
import { cx } from "@/components/ui/styles";
import { TodayTimeline } from "@/features/today/TodayTimeline";
import { TodayWeightCard } from "@/features/today/TodayWeightCard";

export type TodayScreenProps = {
  currentDate: ISODate;
  dayNumber: number;
  formatKg: (value: number | null | undefined) => string;
  formatMealDetail: (meal: MealEntry) => string;
  formatMealTags: (components: MealComponents) => string[];
  formatSmokingEntry: (entry: SmokingEntry) => string;
  latestWeight: WeightEntry | null;
  mealActionMenuId: string | null;
  repereText: string;
  showRepere: boolean;
  smokingEnabled: boolean;
  smokingSummary: string;
  todayMeals: MealEntry[];
  todaySmokingEntries: SmokingEntry[];
  todayWeights: WeightEntry[];
  weightFallbackKg: number;
  onCloseMealActionMenu: () => void;
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onLongPressMealCancel: () => void;
  onLongPressMealStart: (mealId: string) => void;
  onOpenMeal: () => void;
  onOpenMealActionMenu: (mealId: string) => void;
  onOpenSmoking: () => void;
  onSubmitWeight: (draft: string) => boolean;
};

export function TodayScreen({
  currentDate,
  dayNumber,
  formatKg,
  formatMealDetail,
  formatMealTags,
  formatSmokingEntry,
  latestWeight,
  mealActionMenuId,
  repereText,
  showRepere,
  smokingEnabled,
  smokingSummary,
  todayMeals,
  todaySmokingEntries,
  todayWeights,
  weightFallbackKg,
  onCloseMealActionMenu,
  onDeleteMeal,
  onEditMeal,
  onLongPressMealCancel,
  onLongPressMealStart,
  onOpenMeal,
  onOpenMealActionMenu,
  onOpenSmoking,
  onSubmitWeight,
}: TodayScreenProps) {
  const isInitialObservationWeek = isInitialObservationDay(dayNumber);
  const repereTitle = isInitialObservationWeek ? "Cette semaine" : "En ce moment";
  const repereBody = isInitialObservationWeek
    ? "Pendant 7 jours, note simplement tes repas et tes sensations sans modifier tes habitudes."
    : repereText;
  const mealSummary =
    todayMeals.length === 0
      ? "Rien noté"
      : `${todayMeals.length} repas ${todayMeals.length > 1 ? "notés" : "noté"}`;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          Aujourd’hui
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
          {isInitialObservationWeek ? (
            <span className="pc-comic-stamp px-2.5 py-1 font-semibold">
              Jour {dayNumber} sur {INITIAL_OBSERVATION_DAYS}
            </span>
          ) : null}
          <span>{formatLongDate(currentDate)}</span>
        </div>
      </header>

      {showRepere || isInitialObservationWeek ? (
        <Surface as="section" className="pc-comic-note px-4 py-3" variant="subtle">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            {repereTitle}
          </p>
          <p className="mt-1.5 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text)]">
            {repereBody}
          </p>
        </Surface>
      ) : null}

      <section className="space-y-3" aria-labelledby="today-actions-title">
        <h2
          className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]"
          id="today-actions-title"
        >
          Repères rapides
        </h2>
        <div className="grid gap-3">
          <TodayWeightCard
            currentDate={currentDate}
            formatKg={formatKg}
            latestWeight={latestWeight}
            weightFallbackKg={weightFallbackKg}
            onSubmitWeight={onSubmitWeight}
          />
          <div
            className={cx(
              "grid gap-3",
              smokingEnabled && "min-[390px]:grid-cols-2",
            )}
          >
            <TodayActionTile
              actionLabel="Ajouter un repas"
              icon={Plus}
              label="Repas"
              primary
              value={mealSummary}
              onClick={onOpenMeal}
            />
            {smokingEnabled ? (
              <TodayActionTile
                actionLabel="Renseigner"
                icon={Cigarette}
                label="Tabac"
                value={smokingSummary}
                onClick={onOpenSmoking}
              />
            ) : null}
          </div>
        </div>
      </section>

      <TodayTimeline
        formatKg={formatKg}
        formatMealDetail={formatMealDetail}
        formatMealTags={formatMealTags}
        formatSmokingEntry={formatSmokingEntry}
        mealActionMenuId={mealActionMenuId}
        todayMeals={todayMeals}
        todaySmokingEntries={todaySmokingEntries}
        todayWeights={todayWeights}
        onCloseMealActionMenu={onCloseMealActionMenu}
        onDeleteMeal={onDeleteMeal}
        onEditMeal={onEditMeal}
        onLongPressMealCancel={onLongPressMealCancel}
        onLongPressMealStart={onLongPressMealStart}
        onOpenMealActionMenu={onOpenMealActionMenu}
      />
    </div>
  );
}
