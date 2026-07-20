import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/components/ui/styles";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  label: string;
  children: ReactNode;
  size?: "default" | "compact";
};

export function iconButtonClassName({
  className,
  size = "default",
}: {
  className?: string;
  size?: IconButtonProps["size"];
} = {}): string {
  return cx(
    "pc-focus-ring pc-motion-safe inline-flex shrink-0 cursor-pointer items-center justify-center border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] transition-[background-color,border-color,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] hover:bg-[var(--pc-color-surface-subtle)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
    size === "compact"
      ? "h-[var(--pc-control-height)] w-[var(--pc-control-height)] rounded-[var(--pc-radius-control)]"
      : "h-[var(--pc-control-height)] w-[var(--pc-control-height)] rounded-[var(--pc-radius-card)]",
    className,
  );
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { children, className, label, size = "default", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        {...props}
        aria-label={label}
        className={iconButtonClassName({ className, size })}
        ref={ref}
        title={label}
        type={type}
      >
        {children}
      </button>
    );
  },
);
