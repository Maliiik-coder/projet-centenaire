"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { cx } from "@/components/ui/styles";

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;

export type NumericWheelOption = number | null;

export function buildNumericWheelOptions(
  min: number,
  max: number,
  suggestedValue: number,
): NumericWheelOption[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error("Invalid numeric wheel range.");
  }

  const suggestion = Math.min(max, Math.max(min, Math.round(suggestedValue)));
  const values: NumericWheelOption[] = Array.from(
    { length: max - min + 1 },
    (_, index) => min + index,
  );
  values.splice(suggestion - min, 0, null);
  return values;
}

export type WheelPickerProps = {
  ariaLabel: string;
  className?: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  suggestedValue: number;
  unit: string;
  value: string;
};

export function WheelPicker({
  ariaLabel,
  className,
  max,
  min,
  onChange,
  suggestedValue,
  unit,
  value,
}: WheelPickerProps) {
  const options = useMemo(
    () => buildNumericWheelOptions(min, max, suggestedValue),
    [max, min, suggestedValue],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const numericValue = value === "" ? null : Number(value);
  const selectedIndex = Math.max(0, options.indexOf(numericValue));
  const initialIndexRef = useRef(selectedIndex);
  const verticalPadding = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  const assignScroller = useCallback((node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    if (node) {
      node.scrollTop = initialIndexRef.current * ITEM_HEIGHT;
    }
  }, []);

  const selectIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const boundedIndex = Math.min(options.length - 1, Math.max(0, index));
      const option = options[boundedIndex];
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      scrollerRef.current?.scrollTo({
        behavior,
        top: boundedIndex * ITEM_HEIGHT,
      });
      onChange(option === null ? "" : String(option));
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
      const option = options[index];
      const nextValue = option === null ? "" : String(option);
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
      className={cx(
        "relative rounded-[var(--pc-radius-panel)] bg-[var(--pc-color-surface)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-[52px] -translate-y-1/2 rounded-[var(--pc-radius-control)] border border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] shadow-[var(--pc-shadow-level-1)]"
      />
      <div
        aria-label={ariaLabel}
        className="pc-focus-ring relative z-20 h-[260px] touch-pan-y snap-y snap-mandatory select-none overflow-y-auto overscroll-contain rounded-[var(--pc-radius-panel)] border border-[var(--pc-color-border)] bg-transparent outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        ref={assignScroller}
        role="listbox"
        style={{ paddingBlock: verticalPadding }}
        tabIndex={0}
      >
        {options.map((option, index) => {
          const optionValue = option === null ? "" : String(option);
          const selected = optionValue === value;
          return (
            <div
              aria-label={
                option === null ? `Choisir ${ariaLabel.toLowerCase()}` : `${option} ${unit}`
              }
              aria-selected={selected}
              className={cx(
                "relative z-20 flex w-full snap-center items-center justify-center px-4 text-center text-xl transition-[color,opacity,transform] duration-[var(--pc-motion-fast)]",
                selected
                  ? "font-bold text-[var(--pc-color-text)]"
                  : "font-medium text-[var(--pc-color-text-muted)] opacity-55",
              )}
              key={option === null ? "unset" : option}
              onClick={() => selectIndex(index)}
              role="option"
              style={{ height: ITEM_HEIGHT }}
            >
              {option === null ? "Choisir" : `${option} ${unit}`}
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px top-px z-30 h-20 rounded-t-[var(--pc-radius-panel)] bg-gradient-to-b from-[var(--pc-color-surface)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-px bottom-px z-30 h-20 rounded-b-[var(--pc-radius-panel)] bg-gradient-to-t from-[var(--pc-color-surface)] to-transparent"
      />
      <span aria-live="polite" className="sr-only">
        {numericValue === null ? "Aucune valeur choisie" : `${numericValue} ${unit}`}
      </span>
    </div>
  );
}
