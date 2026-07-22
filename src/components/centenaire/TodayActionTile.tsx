import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type TodayActionTileProps = {
  actionLabel: string;
  compact?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
  showActionLabel?: boolean;
  value: string;
};

export function TodayActionTile({
  actionLabel,
  compact = false,
  icon: Icon,
  label,
  onClick,
  primary = false,
  showActionLabel = true,
  value,
}: TodayActionTileProps) {
  return (
    <button
      aria-label={`${actionLabel}. ${label} : ${value}`}
      className={cx(
        "pc-today-action pc-halo-surface pc-halo-surface-interactive pc-focus-ring pc-motion-safe group flex w-full justify-between rounded-[var(--pc-radius-card)] border p-4 text-left shadow-[var(--pc-shadow-level-1)] transition-[background-color,border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] active:translate-y-px",
        compact
          ? "min-h-[4.5rem] flex-row items-center gap-3"
          : "min-h-24 flex-col gap-4",
        primary
          ? "pc-today-action-primary border-[var(--pc-color-primary)] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-action)] hover:bg-[var(--pc-color-primary-hover)]"
          : "pc-today-action-secondary border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] hover:border-[var(--pc-color-primary)] hover:shadow-[var(--pc-shadow-level-2)]",
      )}
      type="button"
      onClick={onClick}
    >
      <span className="block min-w-0">
        <span className="block text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold">
          {label}
        </span>
        <span
          className={cx(
            "mt-1 block text-[length:var(--pc-font-size-body)] leading-6",
            primary
              ? "text-[var(--pc-color-ink)]"
              : "text-[color-mix(in_srgb,var(--pc-color-on-action)_82%,transparent)]",
          )}
        >
          {value}
        </span>
      </span>
      <span
        className={cx(
          "pc-today-action-badge flex min-h-8 w-fit max-w-full shrink-0 items-center justify-center gap-2 rounded-[var(--pc-radius-compact)] px-2.5 py-1 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold",
          !showActionLabel && "w-8 px-0",
          primary
            ? "bg-[var(--pc-color-on-action)] text-[var(--pc-color-action)]"
            : "bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]",
        )}
      >
        <Icon aria-hidden="true" size={15} strokeWidth={2.25} />
        {showActionLabel ? <span>{actionLabel}</span> : null}
      </span>
    </button>
  );
}
