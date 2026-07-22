"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cigarette,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { calculateWeeklyAnalysis, getLatestWeight } from "@/lib/analytics";
import { dedupeDailyWeights } from "@/lib/dataStabilization";
import {
  addDays,
  daysBetween,
  formatLongDate,
  formatShortDate,
  startOfWeek,
  todayISO,
} from "@/lib/dates";
import { mealKindLabels } from "@/lib/mealKinds";
import type { AppData, ISODate, MealEntry, Profile, WeightEntry } from "@/lib/types";
import { IconButton, Surface } from "@/components/ui";
import {
  buildJournalDayEvents,
  buildJournalDayReflection,
  buildWeeklyRhythms,
  countJournalItems,
  journalMealDetailLines,
  weeklyHypothesisText,
  type JournalDayEvent,
  type JournalViewMode,
} from "@/features/journal/journalModel";

const annotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";

export type JournalScreenProps = {
  currentDate: ISODate;
  data: AppData;
  date: ISODate;
  formatKg: (value: number | null | undefined) => string;
  formatSmokingEntry: (entry: AppData["smokingEntries"][number]) => string;
  pendingSync: boolean;
  profile: Profile;
  smokingEnabled: boolean;
  view: JournalViewMode;
  weekDate: ISODate;
  onDateChange: (date: ISODate) => void;
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onViewChange: (view: JournalViewMode) => void;
  onWeekDateChange: (date: ISODate) => void;
};

export function JournalScreen({
  currentDate,
  data,
  date,
  formatKg,
  formatSmokingEntry,
  pendingSync,
  profile,
  smokingEnabled,
  view,
  weekDate,
  onDateChange,
  onDeleteMeal,
  onEditMeal,
  onViewChange,
  onWeekDateChange,
}: JournalScreenProps) {
  const selectedWeekAnalysis = calculateWeeklyAnalysis(data, weekDate);
  const canGoNextDay = date < currentDate;
  const canGoNextWeek = startOfWeek(weekDate) < startOfWeek(currentDate);

  return (
    <div className="space-y-5">
      <JournalWeightOverview
        formatKg={formatKg}
        profile={profile}
        weights={data.weights}
      />

      <JournalSegmentedControl value={view} onChange={onViewChange} />

      {pendingSync ? (
        <Surface className="px-4 py-3" variant="subtle">
          <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
            Des changements locaux attendent la synchronisation.
          </p>
        </Surface>
      ) : null}

      {view === "days" ? (
        <JournalDaysView
          canGoNext={canGoNextDay}
          currentDate={currentDate}
          date={date}
          events={buildJournalDayEvents(data, date)}
          formatKg={formatKg}
          formatSmokingEntry={formatSmokingEntry}
          onDeleteMeal={onDeleteMeal}
          onEditMeal={onEditMeal}
          onGoToday={() => onDateChange(currentDate)}
          onNext={() => onDateChange(addDays(date, 1))}
          onPrevious={() => onDateChange(addDays(date, -1))}
        />
      ) : (
        <JournalWeeksView
          analysis={selectedWeekAnalysis}
          canGoNext={canGoNextWeek}
          currentDate={currentDate}
          formatKg={formatKg}
          smokingEnabled={smokingEnabled}
          onGoCurrent={() => onWeekDateChange(currentDate)}
          onNext={() => onWeekDateChange(addDays(weekDate, 7))}
          onPrevious={() => onWeekDateChange(addDays(weekDate, -7))}
        />
      )}
    </div>
  );
}

function JournalSegmentedControl({
  value,
  onChange,
}: {
  value: JournalViewMode;
  onChange: (value: JournalViewMode) => void;
}) {
  const options: Array<{ id: JournalViewMode; label: string }> = [
    { id: "days", label: "Jours" },
    { id: "weeks", label: "Semaines" },
  ];

  return (
    <div
      aria-label="Vue du carnet"
      className="pc-journal-tabs grid grid-cols-2 gap-1 rounded-full border border-[var(--pc-color-border)] bg-[var(--pc-color-primary-soft)] p-1 shadow-[var(--pc-shadow-level-1)]"
      role="tablist"
    >
      {options.map((option) => (
        <button
          aria-selected={value === option.id}
          className={`min-h-11 rounded-full text-sm font-semibold transition active:scale-[0.98] ${
            value === option.id
              ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]"
              : "text-[var(--pc-color-text)]"
          }`}
          key={option.id}
          role="tab"
          type="button"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function JournalWeightOverview({
  formatKg,
  profile,
  weights,
}: {
  formatKg: JournalScreenProps["formatKg"];
  profile: Profile;
  weights: WeightEntry[];
}) {
  const measuredWeights = dedupeDailyWeights(weights).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latestWeight = getLatestWeight(measuredWeights);
  const chartPoints = [
    {
      date: profile.startDate,
      id: "start",
      value: profile.startWeightKg,
    },
    ...measuredWeights.map((weight) => ({
      date: weight.date,
      id: weight.id,
      value: weight.weightKg,
    })),
  ];

  return (
    <Surface as="section" className="overflow-hidden px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
            Évolution du poids
          </p>
          <h2 className="mt-1 text-2xl leading-8 font-bold text-[var(--pc-color-text)]">
            Depuis le départ
          </h2>
        </div>
        <Scale
          aria-hidden="true"
          className="mt-1 text-[var(--pc-color-primary)]"
          size={24}
          strokeWidth={2.25}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
            Départ
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--pc-color-text)]">
            {formatKg(profile.startWeightKg)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
            Dernière mesure
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--pc-color-text)]">
            {latestWeight ? formatKg(latestWeight.weightKg) : "Aucune"}
          </p>
        </div>
      </div>

      <SimpleWeightChart points={chartPoints} />
    </Surface>
  );
}

function SimpleWeightChart({
  points,
}: {
  points: Array<{ date: ISODate; id: string; value: number }>;
}) {
  const width = 320;
  const height = 132;
  const paddingX = 18;
  const paddingY = 18;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.8);
  const lower = min - span * 0.25;
  const upper = max + span * 0.25;
  const firstDate = points[0]?.date ?? todayISO();
  const lastDate = points[points.length - 1]?.date ?? firstDate;
  const totalDays = Math.max(0, daysBetween(firstDate, lastDate));
  const xRange = width - paddingX * 2;
  const yRange = height - paddingY * 2;
  const toX = (point: { date: ISODate }, index: number) => {
    if (points.length === 1) {
      return width / 2;
    }

    if (totalDays === 0) {
      return paddingX + (xRange * index) / (points.length - 1);
    }

    return paddingX + (xRange * daysBetween(firstDate, point.date)) / totalDays;
  };
  const toY = (value: number) =>
    paddingY + yRange - ((value - lower) / (upper - lower)) * yRange;
  const svgPoints = points
    .map((point, index) => `${toX(point, index)},${toY(point.value)}`)
    .join(" ");
  const visibleDots = points.filter(
    (_, index) =>
      points.length <= 15 || index === 0 || index === points.length - 1,
  );

  return (
    <div
      aria-label="Courbe simple du poids depuis le départ"
      className="mt-4 h-32 w-full"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          stroke="var(--pc-color-border)"
          strokeDasharray="4 8"
          strokeWidth="1.2"
          x1={paddingX}
          x2={width - paddingX}
          y1={height / 2}
          y2={height / 2}
        />
        {points.length > 1 ? (
          <polyline
            fill="none"
            points={svgPoints}
            stroke="var(--pc-color-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        ) : null}
        {visibleDots.map((point) => {
          const pointIndex = points.indexOf(point);
          const isEdge = pointIndex === 0 || pointIndex === points.length - 1;

          return (
            <circle
              cx={toX(point, pointIndex)}
              cy={toY(point.value)}
              fill={
                isEdge
                  ? "var(--pc-color-primary)"
                  : "var(--pc-color-primary-muted)"
              }
              key={point.id}
              r={isEdge ? 3.4 : 2.4}
            />
          );
        })}
      </svg>
    </div>
  );
}

function JournalDaysView({
  canGoNext,
  currentDate,
  date,
  events,
  formatKg,
  formatSmokingEntry,
  onDeleteMeal,
  onEditMeal,
  onGoToday,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  currentDate: ISODate;
  date: ISODate;
  events: JournalDayEvent[];
  formatKg: JournalScreenProps["formatKg"];
  formatSmokingEntry: JournalScreenProps["formatSmokingEntry"];
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onGoToday: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <section className="space-y-4" aria-labelledby="journal-days-title">
      <div className="flex items-center justify-between gap-3">
        <IconButton label="Jour précédent" onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" size={22} />
        </IconButton>
        <div className="min-w-0 text-center">
          <h2
            className="text-lg leading-6 font-bold text-[var(--pc-color-text)]"
            id="journal-days-title"
          >
            {formatLongDate(date)}
          </h2>
          <p className="mt-1 text-sm text-[var(--pc-color-text-muted)]">
            {events.length === 0
              ? "Aucun événement"
              : countJournalItems(events.length, "événement", "événements")}
          </p>
        </div>
        <IconButton
          disabled={!canGoNext}
          label="Jour suivant"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </IconButton>
      </div>

      {date !== currentDate ? (
        <div className="flex justify-center">
          <JournalActionButton onClick={onGoToday}>
            Aujourd’hui
          </JournalActionButton>
        </div>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="Rien noté ce jour-là."
          text="Une journée vide reste neutre : Haru n’en tire aucun score."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            if (event.kind === "meal") {
              return (
                <JournalMealEvent
                  key={`meal-${event.id}`}
                  meal={event.meal}
                  onDelete={() => onDeleteMeal(event.meal)}
                  onEdit={() => onEditMeal(event.meal)}
                />
              );
            }

            if (event.kind === "weight") {
              return (
                <JournalFactEvent
                  icon={Scale}
                  key={`weight-${event.id}`}
                  time={event.time}
                  title="Poids"
                  value={formatKg(event.weight.weightKg)}
                />
              );
            }

            return (
              <JournalFactEvent
                icon={Cigarette}
                key={`smoking-${event.id}`}
                time={event.time}
                title="Tabac"
                value={formatSmokingEntry(event.smoking)}
              />
            );
          })}
          <JournalDayReflection events={events} />
        </div>
      )}
    </section>
  );
}

function JournalMealEvent({
  meal,
  onDelete,
  onEdit,
}: {
  meal: MealEntry;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const detailLines = journalMealDetailLines(meal);

  return (
    <Surface as="article" className="p-3">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
        <p className="pt-1 text-sm font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
          {meal.time}
        </p>
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
              <BookOpen aria-hidden="true" size={17} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--pc-color-text)]">
                {mealKindLabels[meal.kind]}
              </p>
              <p className="mt-0.5 text-sm leading-5 text-[var(--pc-color-text)]">
                {meal.freeText}
              </p>
              {detailLines.length > 0 ? (
                <div className="mt-2 space-y-1 text-xs leading-4 text-[var(--pc-color-text-muted)]">
                  {detailLines.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 text-sm font-semibold text-[var(--pc-color-text)] transition active:scale-[0.98]"
              type="button"
              onClick={onEdit}
            >
              Modifier
            </button>
            <button
              className="min-h-10 rounded-full border border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] px-3 text-sm font-semibold text-[var(--pc-color-danger)] transition active:scale-[0.98]"
              type="button"
              onClick={onDelete}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function JournalFactEvent({
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
    <Surface as="article" className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 p-3">
      <p className="pt-1 text-sm font-semibold tabular-nums text-[var(--pc-color-text-muted)]">
        {time}
      </p>
      <div className="flex min-w-0 gap-2">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
          <Icon aria-hidden="true" size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--pc-color-text)]">
            {title}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-[var(--pc-color-text)]">
            {value}
          </p>
        </div>
      </div>
    </Surface>
  );
}

function JournalDayReflection({ events }: { events: JournalDayEvent[] }) {
  const reflection = buildJournalDayReflection(events);

  return (
    <Surface as="section" className="px-4 py-4" variant="subtle">
      <p className={annotationClass}>Lecture de la journée</p>
      {reflection.facts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {reflection.facts.map((fact) => (
            <span
              className="rounded-full bg-[var(--pc-color-surface)] px-3 py-1 text-xs font-semibold text-[var(--pc-color-text-muted)]"
              key={fact}
            >
              {fact}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
        {reflection.reading}
      </p>
    </Surface>
  );
}

function JournalWeeksView({
  analysis,
  canGoNext,
  currentDate,
  formatKg,
  smokingEnabled,
  onGoCurrent,
  onNext,
  onPrevious,
}: {
  analysis: ReturnType<typeof calculateWeeklyAnalysis>;
  canGoNext: boolean;
  currentDate: ISODate;
  formatKg: JournalScreenProps["formatKg"];
  smokingEnabled: boolean;
  onGoCurrent: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const isCurrentWeek = startOfWeek(analysis.weekStart) === startOfWeek(currentDate);
  const hasEnoughMealData = analysis.mealCount >= 5;
  const rhythms = buildWeeklyRhythms(analysis, smokingEnabled);

  return (
    <section className="space-y-4" aria-labelledby="journal-weeks-title">
      <div className="flex items-center justify-between gap-3">
        <IconButton label="Semaine précédente" onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" size={22} />
        </IconButton>
        <div className="min-w-0 text-center">
          <h2
            className="text-lg leading-6 font-bold text-[var(--pc-color-text)]"
            id="journal-weeks-title"
          >
            {formatShortDate(analysis.weekStart)} - {formatShortDate(analysis.weekEnd)}
          </h2>
          <p className="mt-1 text-sm text-[var(--pc-color-text-muted)]">
            {isCurrentWeek ? "Lecture provisoire" : "Semaine terminée"}
          </p>
        </div>
        <IconButton
          disabled={!canGoNext}
          label="Semaine suivante"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </IconButton>
      </div>

      {!isCurrentWeek ? (
        <div className="flex justify-center">
          <JournalActionButton onClick={onGoCurrent}>
            Semaine en cours
          </JournalActionButton>
        </div>
      ) : null}

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Ce qui est noté</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <JournalMetric label="Repas" value={analysis.mealCount} />
          <JournalMetric label="Resservice" value={analysis.multiPlateMeals} />
          <JournalMetric label="Sans vraie faim" value={analysis.mealsStartedWithoutHunger} />
          <JournalMetric label="Trop plein" value={analysis.mealsEndedTooFull} />
          {smokingEnabled ? (
            <JournalMetric label="Tabac" value={analysis.smokingEntries} />
          ) : null}
          <JournalMetric
            label="Poids"
            value={
              analysis.weightAverageKg === null
                ? "Non renseigné"
                : formatKg(analysis.weightAverageKg)
            }
          />
        </dl>
      </Surface>

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Rythmes observés</p>
        {rhythms.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
            Aucun rythme dominant net avec les données disponibles.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--pc-color-text)]">
            {rhythms.map((rhythm) => (
              <li
                className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-3 py-2"
                key={rhythm}
              >
                {rhythm}
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <Surface as="section" className="px-4 py-4">
        <p className={annotationClass}>Hypothèse de Haru</p>
        <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
          {weeklyHypothesisText(analysis, hasEnoughMealData)}
        </p>
      </Surface>

      <Surface as="section" className="px-4 py-4" variant="subtle">
        <p className={annotationClass}>
          {isCurrentWeek ? "À observer" : "Expérience possible"}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--pc-color-text)]">
          {hasEnoughMealData
            ? analysis.priority.action
            : "Continuer à noter quelques repas avant de choisir une action."}
        </p>
      </Surface>
    </section>
  );
}

function JournalMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--pc-color-text)]">
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
      <p className="font-serif text-xl text-[var(--pc-color-text)]">{title}</p>
      <p className="mt-2 leading-7 text-[var(--pc-color-text)]">{text}</p>
    </div>
  );
}

function JournalActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-5 text-sm font-semibold text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] transition hover:-translate-y-0.5 hover:bg-[var(--pc-color-primary-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
