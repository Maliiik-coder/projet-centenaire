"use client";

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
import { ChevronLeft, Scale } from "lucide-react";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import type { ISODate, WeightEntry } from "@/lib/types";
import { IconButton } from "@/components/ui";
import { cx } from "@/components/ui/styles";

const WEIGHT_MIN_KG = 40;
const WEIGHT_MAX_KG = 300;
const WEIGHT_WHEEL_ITEM_HEIGHT = 46;
const WEIGHT_WHEEL_VISIBLE_ITEMS = 5;

type TodayWeightCardProps = {
  currentDate: ISODate;
  formatKg: (value: number | null | undefined) => string;
  latestWeight: WeightEntry | null;
  weightFallbackKg: number;
  onSubmitWeight: (draft: string) => boolean;
};

export function TodayWeightCard({
  currentDate,
  formatKg,
  latestWeight,
  weightFallbackKg,
  onSubmitWeight,
}: TodayWeightCardProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  const pushedHistoryRef = useRef(false);
  const weightDateLabel = latestWeight
    ? latestWeight.date === currentDate
      ? "Pesée du jour"
      : `Dernière pesée · ${formatShortDate(latestWeight.date)}`
    : "Aucune pesée pour le moment";

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const clearHistoryState = useCallback(() => {
    if (
      pushedHistoryRef.current &&
      typeof window !== "undefined" &&
      window.history.state?.pcWeightInteraction === true
    ) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
  }, []);

  const cancelInteraction = useCallback(() => {
    setOpen(false);
    clearHistoryState();
  }, [clearHistoryState]);

  const openInteraction = useCallback(() => {
    setDraft(String(latestWeight?.weightKg ?? weightFallbackKg));
    setOpen(true);
  }, [latestWeight, weightFallbackKg]);

  const submitWeight = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const saved = onSubmitWeight(draft);

      if (saved) {
        setDraft("");
        setOpen(false);
        clearHistoryState();
      }
    },
    [clearHistoryState, draft, onSubmitWeight],
  );

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    if (window.history.state?.pcWeightInteraction !== true) {
      window.history.pushState(
        { ...(window.history.state ?? {}), pcWeightInteraction: true },
        "",
        window.location.href,
      );
      pushedHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (openRef.current) {
        setOpen(false);
      }
      pushedHistoryRef.current = false;
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelInteraction();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelInteraction, open]);

  return (
    <>
      <button
        aria-label={
          latestWeight
            ? `Modifier le poids, dernière pesée ${formatKg(latestWeight.weightKg)}${
                latestWeight.date === currentDate
                  ? ""
                  : ` le ${formatLongDate(latestWeight.date)}`
              }`
            : "Ajouter le poids"
        }
        className="pc-focus-ring pc-motion-safe flex min-h-24 w-full items-center justify-between gap-4 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 text-left text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] transition-[background-color,border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] hover:border-[var(--pc-color-primary)] hover:shadow-[var(--pc-shadow-level-2)] active:translate-y-px"
        type="button"
        onClick={openInteraction}
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
            onClick={cancelInteraction}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[var(--pc-z-panel)] mx-auto w-full max-w-[var(--pc-shell-max-width)] px-[var(--pc-safe-left)]">
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 backdrop-blur-[9px]"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 92% 58% at 50% 72%, #000 0%, rgba(0,0,0,0.96) 28%, rgba(0,0,0,0.82) 44%, rgba(0,0,0,0.52) 60%, rgba(0,0,0,0.24) 74%, rgba(0,0,0,0.08) 86%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 92% 58% at 50% 72%, #000 0%, rgba(0,0,0,0.96) 28%, rgba(0,0,0,0.82) 44%, rgba(0,0,0,0.52) 60%, rgba(0,0,0,0.24) 74%, rgba(0,0,0,0.08) 86%, transparent 100%)",
                  WebkitBackdropFilter: "blur(9px)",
                }}
              />
              <WeightExpandedPanel
                draft={draft}
                onCancel={cancelInteraction}
                onChange={setDraft}
                onSubmit={submitWeight}
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
  const inputDisplayValue = formatWeightInputDraft(
    wheelValue.kg,
    wheelValue.tenth,
  );
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
