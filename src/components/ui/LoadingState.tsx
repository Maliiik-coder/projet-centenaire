import { LoaderCircle } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type LoadingStateProps = {
  className?: string;
  label?: string;
};

export function LoadingState({
  className,
  label = "Chargement en cours",
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={cx(
        "pc-motion-safe flex min-h-24 items-center justify-center gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]",
        className,
      )}
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
      {label}
    </div>
  );
}
