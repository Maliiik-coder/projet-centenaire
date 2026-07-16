"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Cigarette, Scale } from "lucide-react";
import { mealKindLabels } from "@/lib/mealKinds";
import type {
  MealComponents,
  MealEntry,
  SmokingEntry,
  WeightEntry,
} from "@/lib/types";
import { Surface } from "@/components/ui";
import { cx } from "@/components/ui/styles";

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

type TodayTimelineProps = {
  formatKg: (value: number | null | undefined) => string;
  formatMealDetail: (meal: MealEntry) => string;
  formatMealTags: (components: MealComponents) => string[];
  formatSmokingEntry: (entry: SmokingEntry) => string;
  mealActionMenuId: string | null;
  todayMeals: MealEntry[];
  todaySmokingEntries: SmokingEntry[];
  todayWeights: WeightEntry[];
  onCloseMealActionMenu: () => void;
  onDeleteMeal: (meal: MealEntry) => void;
  onEditMeal: (meal: MealEntry) => void;
  onLongPressMealCancel: () => void;
  onLongPressMealStart: (mealId: string) => void;
  onOpenMealActionMenu: (mealId: string) => void;
};

export function TodayTimeline({
  formatKg,
  formatMealDetail,
  formatMealTags,
  formatSmokingEntry,
  mealActionMenuId,
  todayMeals,
  todaySmokingEntries,
  todayWeights,
  onCloseMealActionMenu,
  onDeleteMeal,
  onEditMeal,
  onLongPressMealCancel,
  onLongPressMealStart,
  onOpenMealActionMenu,
}: TodayTimelineProps) {
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

  return (
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
        if (!menuOpen) onLongPressStart();
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
