import type { ChangeEventHandler } from "react";
import { Check } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type ChoiceCardProps = {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: "checkbox" | "radio";
  value: string;
};

export function ChoiceCard({
  checked,
  description,
  disabled = false,
  label,
  name,
  onChange,
  type = "radio",
  value,
}: ChoiceCardProps) {
  return (
    <label
      className={cx(
        "pc-halo-surface pc-motion-safe relative flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-[var(--pc-radius-card)] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] active:translate-y-px",
        checked
          ? "pc-halo-selected border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] shadow-[var(--pc-shadow-level-1)]"
          : "pc-halo-surface-interactive border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] hover:border-[var(--pc-color-primary)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        name={name}
        onChange={onChange}
        type={type}
        value={value}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[var(--pc-radius-card)] peer-focus-visible:ring-3 peer-focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--pc-color-background)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[length:var(--pc-font-size-body)] leading-6 font-semibold text-[var(--pc-color-text)]">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          checked
            ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)]"
            : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-transparent",
        )}
      >
        <Check size={15} strokeWidth={2.5} />
      </span>
      <span className="sr-only">{checked ? "Sélectionné" : "Non sélectionné"}</span>
    </label>
  );
}
