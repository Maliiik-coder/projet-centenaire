"use client";

import {
  BookOpen,
  ChevronLeft,
  Cigarette,
  Plus,
  Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { mealKindLabels } from "@/lib/mealKinds";
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
import { IconButton, Surface } from "@/components/ui";
import { cx } from "@/components/ui/styles";

const WEIGHT_MIN_KG = 40;
const WEIGHT_MAX_KG = 300;
const WEIGHT_WHEEL_ITEM_HEIGHT = 46;
const WEIGHT_WHEEL_VISIBLE_ITEMS = 5;

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
  weightDraft: string;
  weightOpen: boolean;
  onCancelWeight: () => void;
  onChangeWeightDraft: (value: string) => void;
  onCloseMealActionMenu: () => void;
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onLongPressMealCancel: () => void;
  onLongPressMealStart: (mealId: string) => void;
  onOpenMeal: () => void;
  onOpenMealActionMenu: (mealId: string) => void;
  onOpenSmoking: () => void;
  onOpenWeight: () => void;
  onSubmitWeight: (event: FormEvent<HTMLFormElement>) => boolean;
};

type TodayEvent =
  | {
      createdAt: string;
      id: string;
      kind: "weight";
      time: string;
      weight: WeightEntry;
    }
  | {
      createdAt: string;
      id: string;
      kind: "meal";
      meal: MealEntry;
      time: string;
    }
  | {
      createdAt: string;
      id: string;
      kind: "smoking";
      smoking: SmokingEntry;
      time: string;
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
  weightDraft,
  weightOpen,
  onCancelWeight,
  onChangeWeightDraft,
  onCloseMealActionMenu,
  onDeleteMeal,
  onEditMeal,
  onLongPressMealCancel,
  onLongPressMealStart,
  onOpenMeal,
  onOpenMealActionMenu,
  onOpenSmoking,
  onOpenWeight,
  onSubmitWeight,
}: TodayScreenProps) {
  const weightOpenRef = useRef(weightOpen);
  const pushedWeightHistoryRef = useRef(false);
  const isInitialObservationWeek = isInitialObservationDay(dayNumber);
  const repereTitle = isInitialObservationWeek ? "Cette semaine" : "En ce moment";
  const repereBody = isInitialObservationWeek
    ? "Pendant 7 jours, note simplement tes repas et tes sensations sans modifier tes habitudes."
    : repereText;
  const mealSummary =
    todayMeals.length === 0
      ? "Rien noté"
      : `${todayMeals.length} repas ${todayMeals.length > 1 ? "notés" : "noté"}`;
  const weightDateLabel = latestWeight
    ? latestWeight.date === currentDate
      ? "Pesée du jour"
      : `Dernière pesée · ${formatShortDate(latestWeight.date)}`
    : "Aucune pesée pour le moment";
  const dayEvents = useMemo<TodayEvent[]>(
    () =>
      [
        ...todayWeights.map((weight) => ({
          createdAt: weight.createdAt,
          id: weight.id,
          kind: "weight" as const,
          time: weight.time,
          weight,
        })),
        ...todayMeals.map((meal) => ({
          createdAt: meal.createdAt,
          id: meal.id,
          kind: "meal" as const,
          meal,
          time: meal.time,
        })),
        ...todaySmokingEntries.map((smoking) => ({
          createdAt: smoking.createdAt,
          id: smoking.id,
          kind: "smoking" as const,
          smoking,
          time: smoking.time,
        })),
      ].sort(
        (a, b) =>
          a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt),
      ),
    [todayMeals, todaySmokingEntries, todayWeights],
  );

  useEffect(() => {
    weightOpenRef.current = weightOpen;
  }, [weightOpen]);

  const clearWeightHistoryState = useCallback(() => {
    if (
      pushedWeightHistoryRef.current &&
      typeof window !== "undefined" &&
      window.history.state?.pcWeightInteraction === true
    ) {
      pushedWeightHistoryRef.current = false;
      window.history.back();
    }
  }, []);

  const cancelWeightInteraction = useCallback(() => {
    onCancelWeight();
    clearWeightHistoryState();
  }, [clearWeightHistoryState, onCancelWeight]);

  const submitWeight = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const saved = onSubmitWeight(event);

      if (saved) {
        clearWeightHistoryState();
      }
    },
    [clearWeightHistoryState, onSubmitWeight],
  );

  useEffect(() => {
    if (!weightOpen || typeof window === "undefined") {
      return;
    }

    if (window.history.state?.pcWeightInteraction !== true) {
      window.history.pushState(
        { ...(window.history.state ?? {}), pcWeightInteraction: true },
        "",
        window.location.href,
      );
      pushedWeightHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (weightOpenRef.current) {
        onCancelWeight();
      }
      pushedWeightHistoryRef.current = false;
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelWeightInteraction();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelWeightInteraction, onCancelWeight, weightOpen]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          Aujourd’hui
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
          {isInitialObservationWeek ? (
            <span className="rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary-soft)] px-2.5 py-1 font-semibold text-[var(--pc-color-primary)]">
              Jour {dayNumber} sur {INITIAL_OBSERVATION_DAYS}
            </span>
          ) : null}
          <span>{formatLongDate(currentDate)}</span>
        </div>
      </header>

      {showRepere || isInitialObservationWeek ? (
        <Surface as="section" className="px-4 py-3" variant="subtle">
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
            draft={weightDraft}
            formatKg={formatKg}
            latestWeight={latestWeight}
            open={weightOpen}
            weightDateLabel={weightDateLabel}
            onCancel={cancelWeightInteraction}
            onChange={onChangeWeightDraft}
            onOpen={onOpenWeight}
            onSubmit={submitWeight}
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

      <section aria-labelledby="today-events-title">
        <h2
          className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold text-[var(--pc-color-text)]"
          id="today-events-title"
        >
          Ma journée
        </h2>
        {mealActionMenuId ? (
          <button
            aria-label="Fermer le menu repas"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            type="button"
            onClick={onCloseMealActionMenu}
          />
        ) : null}
        <div className="mt-4 space-y-3">
          {dayEvents.length === 0 ? (
            <Surface
              className="flex items-center gap-3 px-4 py-3 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]"
              variant="subtle"
            >
              <BookOpen
                aria-hidden="true"
                className="shrink-0 text-[var(--pc-color-primary)]"
                size={18}
              />
              <p>Rien noté pour l’instant.</p>
            </Surface>
          ) : (
            dayEvents.map((event) => {
              if (event.kind === "weight") {
                return (
                  <TodayFactEvent
                    icon={Scale}
                    key={`weight-${event.id}`}
                    time={event.time}
                    title="Poids"
                    value={formatKg(event.weight.weightKg)}
                  />
                );
              }

              if (event.kind === "smoking") {
                return (
                  <TodayFactEvent
                    icon={Cigarette}
                    key={`smoking-${event.id}`}
                    time={event.time}
                    title="Tabac"
                    value={formatSmokingEntry(event.smoking)}
                  />
                );
              }

              return (
                <TodayMealEvent
                  formatDetail={formatMealDetail}
                  formatTags={formatMealTags}
                  key={`meal-${event.id}`}
                  meal={event.meal}
                  menuOpen={mealActionMenuId === event.meal.id}
                  onDelete={() => onDeleteMeal(event.meal)}
                  onEdit={() => onEditMeal(event.meal)}
                  onLongPressCancel={onLongPressMealCancel}
                  onLongPressStart={() => onLongPressMealStart(event.meal.id)}
                  onOpenMenu={() => onOpenMealActionMenu(event.meal.id)}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function TodayWeightCard({
  currentDate,
  draft,
  formatKg,
  latestWeight,
  open,
  weightDateLabel,
  onCancel,
  onChange,
  onOpen,
  onSubmit,
}: {
  currentDate: ISODate;
  draft: string;
  formatKg: (value: number | null | undefined) => string;
  latestWeight: WeightEntry | null;
  open: boolean;
  weightDateLabel: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onOpen: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <button
        aria-label={
          latestWeight
            ? `Modifier le poids, dernière pesée ${formatKg(latestWeight.weightKg)}${
                latestWeight.date === currentDate ? "" : ` le ${formatLongDate(latestWeight.date)}`
              }`
            : "Ajouter le poids"
        }
        className="pc-focus-ring pc-motion-safe flex min-h-24 w-full items-center justify-between gap-4 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 text-left text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] transition-[background-color,border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] hover:border-[var(--pc-color-primary)] hover:shadow-[var(--pc-shadow-level-2)] active:translate-y-px"
        type="button"
        onClick={onOpen}
      >
        <span className="min-w-0">
          <span className="block text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold">
            Poids
          </span>
          <span className="mt-1 block text-2xl leading-8 font-bold tabular-nums text-[var(--pc-color-text)]">
            {latestWeight ? formatKg(latestWeight.weightKg) : "Ajouter"}
          </span>
          <span className="mt-1 block text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
            {weightDateLabel}
          </span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
          <Scale aria-hidden="true" size={20} strokeWidth={2.25} />
        </span>
      </button>

      {open ? (
        <>
          <button
            aria-label="Fermer sans enregistrer le poids"
            className="fixed inset-0 z-[var(--pc-z-scrim)] cursor-default bg-transparent"
            type="button"
            onClick={onCancel}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[var(--pc-z-panel)] mx-auto w-full max-w-[var(--pc-shell-max-width)] px-[var(--pc-safe-left)]">
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-2 -inset-y-5 rounded-[2.25rem] bg-[rgba(17,24,32,0.12)] backdrop-blur-[3px]"
              />
              <WeightExpandedPanel
                draft={draft}
                onCancel={onCancel}
                onChange={onChange}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

type WeightExpandedPanelProps = {
  draft: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function WeightExpandedPanel({
  draft,
  onCancel,
  onChange,
  onSubmit,
}: WeightExpandedPanelProps) {
  const value = parseWeightValue(draft);
  const wheelValue = getWeightWheelValue(value);
  const displayValue = formatWeightDraft(wheelValue.kg, wheelValue.tenth);
  const inputDisplayValue = formatWeightInputDraft(wheelValue.kg, wheelValue.tenth);
  const [directEditing, setDirectEditing] = useState(false);
  const [directValue, setDirectValue] = useState(inputDisplayValue);

  const updateWheelValue = (kg: number, tenth: number) => {
    const nextTenth = kg >= WEIGHT_MAX_KG ? 0 : tenth;
    onChange(`${kg}.${nextTenth}`);
  };

  return (
    <form
      className="soft-enter pointer-events-auto max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[1.75rem] border border-[color-mix(in_srgb,var(--pc-color-primary-muted)_20%,transparent)] bg-[color-mix(in_srgb,var(--pc-color-surface)_36%,transparent)] p-4 shadow-[0_8px_22px_rgba(36,56,74,0.06)] backdrop-blur-2xl"
      onSubmit={onSubmit}
    >
      <div className="flex items-start justify-between gap-3">
        <IconButton
          className="rounded-full bg-[color-mix(in_srgb,var(--pc-color-surface)_58%,transparent)] backdrop-blur-xl"
          label="Annuler la modification du poids"
          onClick={onCancel}
        >
          <ChevronLeft aria-hidden="true" size={24} />
        </IconButton>
        <div className="min-w-0 text-right">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Modifier le poids
          </p>
          <label className="mt-0.5 flex min-h-11 items-center justify-end gap-1 rounded-full px-2 focus-within:bg-[color-mix(in_srgb,var(--pc-color-primary-soft)_58%,transparent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--pc-color-focus)_24%,transparent)]">
            <span className="sr-only">Saisir le poids en kilogrammes</span>
            <input
              aria-label="Saisir le poids en kilogrammes"
              className="w-[5.7rem] bg-transparent text-right text-3xl leading-10 font-bold tabular-nums text-[var(--pc-color-text)] outline-none"
              inputMode="decimal"
              value={directEditing ? directValue : inputDisplayValue}
              onBlur={() => setDirectEditing(false)}
              onChange={(event) => {
                setDirectValue(event.target.value);
                onChange(event.target.value);
              }}
              onFocus={(event) => {
                setDirectEditing(true);
                setDirectValue(inputDisplayValue);
                event.currentTarget.select();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
            <span className="text-3xl leading-10 font-bold text-[var(--pc-color-text)]">
              kg
            </span>
          </label>
          <p aria-live="polite" className="sr-only">
            {displayValue}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.15fr)_minmax(5.25rem,0.85fr)] gap-3">
        <WeightNumberWheel
          ariaLabel="Kilogrammes"
          formatOption={(option) => `${option}`}
          max={WEIGHT_MAX_KG}
          min={WEIGHT_MIN_KG}
          value={wheelValue.kg}
          onChange={(nextKg) => updateWheelValue(nextKg, wheelValue.tenth)}
        />
        <WeightNumberWheel
          ariaLabel="Dixièmes"
          formatOption={(option) => `,${option}`}
          max={wheelValue.kg >= WEIGHT_MAX_KG ? 0 : 9}
          min={0}
          value={wheelValue.tenth}
          onChange={(nextTenth) => updateWheelValue(wheelValue.kg, nextTenth)}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="pc-focus-ring pc-motion-safe inline-flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-full border border-transparent bg-[var(--pc-color-primary)] px-5 text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] transition-[background-color,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] hover:bg-[var(--pc-color-primary-hover)] active:translate-y-px"
          type="submit"
        >
          OK
        </button>
      </div>
    </form>
  );
}

function WeightNumberWheel({
  ariaLabel,
  formatOption,
  max,
  min,
  value,
  onChange,
}: {
  ariaLabel: string;
  formatOption: (value: number) => string;
  max: number;
  min: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const options = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [max, min],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));
  const verticalPadding =
    WEIGHT_WHEEL_ITEM_HEIGHT * Math.floor(WEIGHT_WHEEL_VISIBLE_ITEMS / 2);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: selectedIndex * WEIGHT_WHEEL_ITEM_HEIGHT,
    });
  }, [selectedIndex]);

  const selectIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const boundedIndex = Math.min(options.length - 1, Math.max(0, index));
      const option = options[boundedIndex];

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      scrollerRef.current?.scrollTo({
        behavior,
        top: boundedIndex * WEIGHT_WHEEL_ITEM_HEIGHT,
      });
      onChange(option);
    },
    [onChange, options],
  );

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    const scrollTop = event.currentTarget.scrollTop;
    frameRef.current = window.requestAnimationFrame(() => {
      const index = Math.min(
        options.length - 1,
        Math.max(0, Math.round(scrollTop / WEIGHT_WHEEL_ITEM_HEIGHT)),
      );
      const option = options[index];

      if (option !== value) {
        onChange(option);
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === "Home") {
      selectIndex(0);
      return;
    }

    if (event.key === "End") {
      selectIndex(options.length - 1);
      return;
    }

    selectIndex(selectedIndex + (event.key === "ArrowDown" ? 1 : -1));
  };

  return (
    <div className="relative rounded-[var(--pc-radius-panel)] bg-[color-mix(in_srgb,var(--pc-color-surface-subtle)_18%,transparent)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-[46px] -translate-y-1/2 rounded-[var(--pc-radius-control)] border border-[color-mix(in_srgb,var(--pc-color-primary)_72%,transparent)] bg-[color-mix(in_srgb,var(--pc-color-primary-soft)_54%,transparent)] shadow-[0_3px_10px_rgba(36,56,74,0.06)]"
      />
      <div
        aria-label={ariaLabel}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        aria-valuetext={formatOption(value)}
        className="pc-focus-ring relative z-20 h-[230px] touch-pan-y snap-y snap-mandatory select-none overflow-y-auto overscroll-contain rounded-[var(--pc-radius-panel)] border border-[color-mix(in_srgb,var(--pc-color-border)_58%,transparent)] bg-transparent outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        ref={scrollerRef}
        role="spinbutton"
        style={{ paddingBlock: verticalPadding }}
        tabIndex={0}
      >
        {options.map((option, index) => {
          const selected = option === value;

          return (
            <div
              aria-hidden="true"
              className={cx(
                "flex snap-center items-center justify-center px-2 text-center text-xl transition-[color,opacity,transform] duration-[var(--pc-motion-fast)]",
                selected
                  ? "font-bold text-[var(--pc-color-text)]"
                  : "font-medium text-[var(--pc-color-text-muted)] opacity-55",
              )}
              key={option}
              onClick={() => selectIndex(index)}
              style={{ height: WEIGHT_WHEEL_ITEM_HEIGHT }}
            >
              {formatOption(option)}
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px top-px z-30 h-16 rounded-t-[var(--pc-radius-panel)] bg-gradient-to-b from-[color-mix(in_srgb,var(--pc-color-surface-subtle)_44%,transparent)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px bottom-px z-30 h-16 rounded-b-[var(--pc-radius-panel)] bg-gradient-to-t from-[color-mix(in_srgb,var(--pc-color-surface-subtle)_44%,transparent)] to-transparent"
      />
    </div>
  );
}

function TodayFactEvent({
  icon: Icon,
  time,
  title,
  value,
}: {
  icon: LucideIcon;
  time: string;
  title: string;
  value: string;
}) {
  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)]">
      <p className="pt-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
        {time}
      </p>
      <div className="flex min-w-0 gap-2">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
          <Icon aria-hidden="true" size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
            {title}
          </p>
          <p className="mt-0.5 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function TodayMealEvent({
  formatDetail,
  formatTags,
  meal,
  menuOpen,
  onDelete,
  onEdit,
  onLongPressCancel,
  onLongPressStart,
  onOpenMenu,
}: {
  formatDetail: (meal: MealEntry) => string;
  formatTags: (components: MealComponents) => string[];
  meal: MealEntry;
  menuOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onLongPressCancel: () => void;
  onLongPressStart: () => void;
  onOpenMenu: () => void;
}) {
  const tags = formatTags(meal.components);

  return (
    <article
      aria-label="Repas. Appui long pour modifier ou supprimer."
      className={cx(
        "pc-focus-ring pc-motion-safe relative grid cursor-pointer select-none grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)] transition-[border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] [-webkit-touch-callout:none] [-webkit-user-select:none] hover:border-[var(--pc-color-primary)] active:translate-y-px",
        menuOpen && "z-20",
      )}
      role="button"
      tabIndex={0}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenMenu();
        }
      }}
      onPointerCancel={onLongPressCancel}
      onPointerDown={() => {
        if (!menuOpen) {
          onLongPressStart();
        }
      }}
      onPointerLeave={onLongPressCancel}
      onPointerUp={onLongPressCancel}
    >
      <p className="pt-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
        {meal.time}
      </p>
      {menuOpen ? (
        <div className="absolute right-2 top-11 z-30 grid min-w-32 gap-1 rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-1 text-sm shadow-[var(--pc-shadow-level-2)]">
          <button
            className="rounded-[12px] px-3 py-2 text-left font-semibold text-[var(--pc-color-text)] transition hover:bg-[var(--pc-color-primary-soft)]"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEdit}
          >
            Modifier
          </button>
          <button
            className="rounded-[12px] px-3 py-2 text-left font-semibold text-[#8A3B32] transition hover:bg-[#FFF7F3]"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onDelete}
          >
            Supprimer
          </button>
        </div>
      ) : null}
      <div className="flex min-w-0 gap-2">
        <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]" />
        <div className="min-w-0">
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
            {mealKindLabels[meal.kind]}
          </p>
          <p className="mt-0.5 truncate text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]">
            {meal.freeText}
          </p>
          <p className="mt-1 truncate text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
            {formatDetail(meal)}
          </p>
          {tags.length > 0 ? (
            <p className="mt-1 truncate text-[11px] leading-4 font-semibold text-[var(--pc-color-text-subtle)]">
              {tags.slice(0, 3).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function parseWeightValue(value: string): number | null {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function getWeightWheelValue(value: number | null): { kg: number; tenth: number } {
  const boundedValue = Math.min(
    WEIGHT_MAX_KG,
    Math.max(WEIGHT_MIN_KG, value ?? 70),
  );
  const roundedValue = Math.round(boundedValue * 10) / 10;
  let kg = Math.trunc(roundedValue);
  let tenth = Math.round((roundedValue - kg) * 10);

  if (tenth === 10) {
    kg += 1;
    tenth = 0;
  }

  if (kg >= WEIGHT_MAX_KG) {
    kg = WEIGHT_MAX_KG;
    tenth = 0;
  }

  return { kg, tenth };
}

function formatWeightDraft(kg: number, tenth: number): string {
  return `${kg.toLocaleString("fr-FR")},${tenth} kg`;
}

function formatWeightInputDraft(kg: number, tenth: number): string {
  return `${kg},${tenth}`;
}
