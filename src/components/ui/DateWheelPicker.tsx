"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { cx } from "@/components/ui/styles";

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;

type BirthDateParts = {
  day: string;
  month: string;
  year: string;
};

type WheelOption = {
  label: string;
  value: string;
};

const MONTHS: WheelOption[] = [
  { label: "janvier", value: "01" },
  { label: "février", value: "02" },
  { label: "mars", value: "03" },
  { label: "avril", value: "04" },
  { label: "mai", value: "05" },
  { label: "juin", value: "06" },
  { label: "juillet", value: "07" },
  { label: "août", value: "08" },
  { label: "septembre", value: "09" },
  { label: "octobre", value: "10" },
  { label: "novembre", value: "11" },
  { label: "décembre", value: "12" },
];

function withUnsetOption(
  options: WheelOption[],
  suggestedValue: string,
): Array<WheelOption | null> {
  const result: Array<WheelOption | null> = [...options];
  const suggestedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === suggestedValue),
  );
  result.splice(suggestedIndex, 0, null);
  return result;
}

export function getDaysInMonth(month: string, year: string): number {
  if (month === "") {
    return 31;
  }

  const numericYear = Number(year) || 2000;
  return new Date(Date.UTC(numericYear, Number(month), 0)).getUTCDate();
}

export function buildBirthDateValue(parts: BirthDateParts): string {
  if (!parts.day || !parts.month || !parts.year) {
    return "";
  }

  const maxDay = getDaysInMonth(parts.month, parts.year);
  if (Number(parts.day) > maxDay) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day.padStart(2, "0")}`;
}

function parseBirthDate(value: string): BirthDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? { year: match[1], month: match[2], day: String(Number(match[3])) }
    : { day: "", month: "", year: "" };
}

function buildNumericOptions(min: number, max: number): WheelOption[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    return { label: value, value };
  });
}

function WheelColumn({
  ariaLabel,
  className,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  options: Array<WheelOption | null>;
  placeholder: string;
  value: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => (option?.value ?? "") === value),
  );
  const initialIndexRef = useRef(selectedIndex);
  const verticalPadding = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  const assignScroller = useCallback((node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    if (node) {
      node.scrollTop = initialIndexRef.current * ITEM_HEIGHT;
    }
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      const boundedIndex = Math.min(options.length - 1, Math.max(0, index));
      const option = options[boundedIndex];
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      scrollerRef.current?.scrollTo({
        behavior: "auto",
        top: boundedIndex * ITEM_HEIGHT,
      });
      onChange(option?.value ?? "");
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
        Math.max(0, Math.round(scrollTop / ITEM_HEIGHT)),
      );
      const nextValue = options[index]?.value ?? "";
      if (nextValue !== value) {
        onChange(nextValue);
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    selectIndex(selectedIndex + (event.key === "ArrowDown" ? 1 : -1));
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cx(
        "pc-focus-ring relative z-20 h-[260px] touch-pan-y snap-y snap-mandatory select-none overflow-y-auto overscroll-contain bg-transparent outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      ref={assignScroller}
      role="listbox"
      style={{ paddingBlock: verticalPadding }}
      tabIndex={0}
    >
      {options.map((option, index) => {
        const optionValue = option?.value ?? "";
        const selected = optionValue === value;
        return (
          <div
            aria-label={option?.label ?? placeholder}
            aria-selected={selected}
            className={cx(
              "relative z-20 flex w-full snap-center items-center justify-center px-1 text-center text-base transition-[color,opacity] duration-[var(--pc-motion-fast)] min-[390px]:text-lg",
              selected
                ? "font-bold text-[var(--pc-color-text)]"
                : "font-medium text-[var(--pc-color-text-muted)] opacity-55",
            )}
            key={option?.value ?? "unset"}
            onClick={() => selectIndex(index)}
            role="option"
            style={{ height: ITEM_HEIGHT }}
          >
            {option?.label ?? placeholder}
          </div>
        );
      })}
    </div>
  );
}

export type DateWheelPickerProps = {
  maximumAge?: number;
  minimumAge?: number;
  onChange: (value: string) => void;
  referenceDate: string;
  value: string;
};

export function DateWheelPicker({
  maximumAge = 100,
  minimumAge = 18,
  onChange,
  referenceDate,
  value,
}: DateWheelPickerProps) {
  const [parts, setParts] = useState<BirthDateParts>(() => parseBirthDate(value));
  const referenceYear = Number(referenceDate.slice(0, 4));
  const minimumYear = referenceYear - maximumAge;
  const maximumYear = referenceYear - minimumAge;
  const dayCount = getDaysInMonth(parts.month, parts.year);
  const dayOptions = useMemo(
    () => withUnsetOption(buildNumericOptions(1, dayCount), "15"),
    [dayCount],
  );
  const monthOptions = useMemo(
    () => withUnsetOption(MONTHS, "06"),
    [],
  );
  const yearOptions = useMemo(
    () =>
      withUnsetOption(
        buildNumericOptions(minimumYear, maximumYear),
        String(referenceYear - 35),
      ),
    [maximumYear, minimumYear, referenceYear],
  );

  const updatePart = useCallback(
    (part: keyof BirthDateParts, nextValue: string) => {
      const nextParts = { ...parts, [part]: nextValue };
      const nextDayCount = getDaysInMonth(nextParts.month, nextParts.year);
      if (nextParts.day && Number(nextParts.day) > nextDayCount) {
        nextParts.day = String(nextDayCount);
      }
      setParts(nextParts);
      onChange(buildBirthDateValue(nextParts));
    },
    [onChange, parts],
  );

  return (
    <div className="relative overflow-hidden rounded-[var(--pc-radius-panel)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] shadow-[var(--pc-shadow-level-1)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-[52px] -translate-y-1/2 rounded-[var(--pc-radius-control)] border border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)]"
      />
      <div className="relative z-20 grid grid-cols-[0.8fr_1.45fr_1fr]">
        <WheelColumn
          ariaLabel="Jour de naissance"
          key={`day-${dayCount}`}
          onChange={(day) => updatePart("day", day)}
          options={dayOptions}
          placeholder="Jour"
          value={parts.day}
        />
        <WheelColumn
          ariaLabel="Mois de naissance"
          onChange={(month) => updatePart("month", month)}
          options={monthOptions}
          placeholder="Mois"
          value={parts.month}
        />
        <WheelColumn
          ariaLabel="Année de naissance"
          onChange={(year) => updatePart("year", year)}
          options={yearOptions}
          placeholder="Année"
          value={parts.year}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px top-px z-30 h-20 bg-gradient-to-b from-[var(--pc-color-surface)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px bottom-px z-30 h-20 bg-gradient-to-t from-[var(--pc-color-surface)] to-transparent"
      />
      <span aria-live="polite" className="sr-only">
        {value ? `Date choisie : ${value}` : "Aucune date choisie"}
      </span>
    </div>
  );
}
