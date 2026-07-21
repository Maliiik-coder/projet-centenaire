"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Check } from "lucide-react";
import { cx } from "@/components/ui/styles";

export const DEFAULT_HOLD_DURATION_MS = 500;

export function holdChoiceInstanceKey(
  questionId: string,
  value: string | number | null,
): string {
  return `${questionId}-${value ?? "unknown"}`;
}

export type HoldChoiceCardProps = {
  checked: boolean;
  disabled?: boolean;
  holdDurationMs?: number;
  label: string;
  onConfirm: () => void;
};

export function HoldChoiceCard({
  checked,
  disabled = false,
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  label,
  onConfirm,
}: HoldChoiceCardProps) {
  const instructionId = useId();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);

  const clearHoldTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const startHold = () => {
    if (disabled || holding) return;

    clearHoldTimer();
    confirmedRef.current = false;
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      confirmedRef.current = true;
      setHolding(false);
      onConfirm();
    }, holdDurationMs);
  };

  const cancelHold = () => {
    if (confirmedRef.current) return;
    clearHoldTimer();
    setHolding(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    startHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      cancelHold();
    }
  };

  const fillVisible = checked || holding;

  const content = (active: boolean) => (
    <span className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left">
      <span
        className={cx(
          "min-w-0 flex-1 text-[length:var(--pc-font-size-body)] leading-6 font-semibold",
          active
            ? "text-[var(--pc-color-on-primary)]"
            : "text-[var(--pc-color-text)]",
        )}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          active
            ? "border-[color-mix(in_srgb,var(--pc-color-on-primary)_72%,transparent)] bg-[color-mix(in_srgb,var(--pc-color-on-primary)_18%,transparent)] text-[var(--pc-color-on-primary)]"
            : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-transparent",
        )}
      >
        <Check size={15} strokeWidth={2.5} />
      </span>
    </span>
  );

  return (
    <button
      aria-checked={checked}
      aria-describedby={instructionId}
      className={cx(
        "pc-halo-surface pc-halo-surface-interactive pc-focus-ring pc-motion-safe relative w-full touch-manipulation select-none overflow-hidden rounded-[var(--pc-radius-card)] border bg-[var(--pc-color-surface)] text-left shadow-[var(--pc-shadow-level-1)] transition-[border-color,box-shadow,transform] active:translate-y-px [-webkit-touch-callout:none]",
        fillVisible
          ? "border-[var(--pc-color-primary)]"
          : "border-[var(--pc-color-border)] hover:border-[var(--pc-color-primary)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
      role="radio"
      type="button"
      onClick={(event) => {
        event.preventDefault();
        if (event.detail === 0 && !confirmedRef.current) {
          onConfirm();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerCancel={cancelHold}
      onPointerDown={handlePointerDown}
      onPointerLeave={cancelHold}
      onPointerUp={cancelHold}
    >
      {content(false)}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--pc-color-primary)] transition-[clip-path] ease-linear"
        style={{
          clipPath: fillVisible ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transitionDuration: holding ? `${holdDurationMs}ms` : "120ms",
        }}
      >
        {content(true)}
      </span>
      <span className="sr-only" id={instructionId}>
        Maintenir une demi-seconde pour valider.
      </span>
    </button>
  );
}
