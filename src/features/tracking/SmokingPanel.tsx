"use client";

import { useState, type ReactNode } from "react";
import { Archive } from "lucide-react";
import type { SmokingDayState } from "@/lib/types";

const inputClass =
  "pc-halo-control min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";

const smokingDayLabels: Record<SmokingDayState, string> = {
  aucun: "Aucun",
  envie: "Envie forte",
  cigarette: "Cigarette",
};

const smokingTriggerOptions = [
  "voiture",
  "stress",
  "après-repas",
  "hôtel",
  "ennui",
  "autre",
];

export function SmokingPanel({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (state: SmokingDayState, note: string) => void;
}) {
  const [state, setState] = useState<SmokingDayState>("aucun");
  const [note, setNote] = useState("");
  const showTrigger = state === "envie" || state === "cigarette";

  return (
    <TrackingPanel title="Tabac" onClose={onClose}>
      <div className="space-y-6">
        <TrackingChoiceLine
          options={smokingDayLabels}
          value={state}
          onChange={(value) => {
            setState(value);
            if (value === "aucun") setNote("");
          }}
        />
        {showTrigger ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--pc-color-text)]">
              Déclencheur facultatif
            </p>
            <div className="flex flex-wrap gap-2">
              {smokingTriggerOptions.map((trigger) => {
                const selected = note === trigger;

                return (
                  <button
                    className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                      selected
                        ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)]"
                        : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text-muted)] shadow-[var(--pc-shadow-level-1)]"
                    }`}
                    key={trigger}
                    type="button"
                    onClick={() => setNote(selected ? "" : trigger)}
                  >
                    {trigger}
                  </button>
                );
              })}
            </div>
            <input
              className={inputClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Autre déclencheur"
            />
          </div>
        ) : null}
        <TrackingButton onClick={() => onSubmit(state, note)}>
          <Archive aria-hidden="true" size={17} />
          Ajouter au carnet
        </TrackingButton>
      </div>
    </TrackingPanel>
  );
}

function TrackingPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="app-fixed-panel z-30">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <div className="pc-halo-surface flex flex-col items-start gap-3 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
          <h1 className="text-2xl leading-tight font-bold text-[var(--pc-color-text)] min-[390px]:text-3xl">
            {title}
          </h1>
          <button
            className="text-sm font-semibold text-[var(--pc-color-primary)]"
            type="button"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
      </div>
    </div>
  );
}

function TrackingButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="pc-halo-action inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--pc-color-primary)] px-5 text-sm font-semibold text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] transition hover:-translate-y-0.5 hover:bg-[var(--pc-color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TrackingChoiceLine<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`pc-halo-surface pc-halo-surface-interactive min-h-12 cursor-pointer rounded-[16px] border px-4 text-left text-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px ${
              selected
                ? "pc-halo-selected border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onChange(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}
