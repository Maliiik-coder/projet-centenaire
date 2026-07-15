import { forwardRef, type SelectHTMLAttributes } from "react";
import { cx } from "@/components/ui/styles";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { children, className, invalid = false, ...props },
  ref,
) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(
        "pc-focus-ring min-h-[var(--pc-control-height)] w-full cursor-pointer rounded-[var(--pc-radius-control)] border bg-[var(--pc-color-surface)] px-3 py-2 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--pc-motion-fast)] disabled:cursor-not-allowed disabled:bg-[var(--pc-color-surface-subtle)] disabled:opacity-70",
        invalid
          ? "border-[var(--pc-color-danger)]"
          : "border-[var(--pc-color-border)] hover:border-[var(--pc-color-text-subtle)]",
        className,
      )}
      ref={ref}
    >
      {children}
    </select>
  );
});
