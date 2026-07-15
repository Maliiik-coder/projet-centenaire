import { cx } from "@/components/ui/styles";

export type SwitchProps = {
  checked: boolean;
  className?: string;
  description?: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  checked,
  className,
  description,
  disabled = false,
  label,
  onCheckedChange,
}: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cx(
        "pc-focus-ring pc-motion-safe flex min-h-[var(--pc-control-height)] w-full cursor-pointer items-center justify-between gap-4 rounded-[var(--pc-radius-card)] px-1 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-[length:var(--pc-font-size-body)] leading-6 font-medium text-[var(--pc-color-text)]">
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
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-[var(--pc-motion-fast)]",
          checked
            ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary)]"
            : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)]",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--pc-color-surface)] shadow-[var(--pc-shadow-level-1)] transition-transform duration-[var(--pc-motion-fast)]",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
