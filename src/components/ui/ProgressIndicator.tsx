import { cx } from "@/components/ui/styles";

export type ProgressIndicatorProps = {
  className?: string;
  compact?: boolean;
  current: number;
  label: string;
  total: number;
};

export function ProgressIndicator({
  className,
  compact = false,
  current,
  label,
  total,
}: ProgressIndicatorProps) {
  const normalizedCurrent = Math.min(Math.max(current, 0), total);
  const progressPercent = total > 0 ? (normalizedCurrent / total) * 100 : 0;

  return (
    <div
      aria-label={label}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={normalizedCurrent}
      className={cx("grid gap-2", className)}
      role="progressbar"
    >
      {compact ? (
        <div
          aria-hidden="true"
          className="h-2 overflow-hidden rounded-full bg-[var(--pc-color-surface)] shadow-[var(--pc-shadow-level-1)]"
        >
          <span
            className="block h-full rounded-full bg-[var(--pc-color-primary)] transition-[width] duration-[var(--pc-motion-state)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, index) => (
              <span
                className={cx(
                  "h-1.5 flex-1 rounded-full",
                  index < normalizedCurrent
                    ? "bg-[var(--pc-color-primary)]"
                    : "bg-[var(--pc-color-border)]",
                )}
                key={index}
              />
            ))}
          </div>
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 text-[var(--pc-color-text-muted)]">
            {normalizedCurrent} sur {total}
          </p>
        </>
      )}
    </div>
  );
}
