import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "@/components/ui/styles";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, invalid = false, ...props }, ref) {
    return (
      <input
        {...props}
        aria-invalid={invalid || undefined}
        className={cx(
          "pc-halo-control pc-focus-ring min-h-[var(--pc-control-height)] w-full rounded-[var(--pc-radius-control)] border bg-[var(--pc-color-surface)] px-4 py-3 text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--pc-motion-fast)] placeholder:text-[var(--pc-color-text-subtle)] disabled:cursor-not-allowed disabled:bg-[var(--pc-color-surface-subtle)] disabled:opacity-70",
          invalid
            ? "border-[var(--pc-color-danger)]"
            : "border-[var(--pc-color-border)] hover:border-[var(--pc-color-text-subtle)]",
          className,
        )}
        ref={ref}
      />
    );
  },
);
