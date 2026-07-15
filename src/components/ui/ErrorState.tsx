import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type ErrorStateProps = {
  action?: ReactNode;
  className?: string;
  message: string;
  title?: string;
};

export function ErrorState({
  action,
  className,
  message,
  title,
}: ErrorStateProps) {
  return (
    <div
      className={cx(
        "flex gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] p-3 text-[var(--pc-color-text)]",
        className,
      )}
      role="alert"
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-[var(--pc-color-danger)]"
        size={19}
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-danger)]">
            {title}
          </p>
        ) : null}
        <p
          className={cx(
            "text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]",
            title && "mt-1",
          )}
        >
          {message}
        </p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
