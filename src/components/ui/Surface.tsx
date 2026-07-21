import { createElement, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "@/components/ui/styles";

export type SurfaceVariant = "default" | "subtle" | "interactive" | "selected";

const surfaceClasses: Record<SurfaceVariant, string> = {
  default:
    "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] shadow-[var(--pc-shadow-level-1)]",
  subtle:
    "border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)]",
  interactive:
    "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] shadow-[var(--pc-shadow-level-1)] transition-[background-color,border-color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] hover:border-[var(--pc-color-primary)] hover:shadow-[var(--pc-shadow-level-2)] active:translate-y-px",
  selected:
    "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] shadow-[var(--pc-shadow-level-1)]",
};

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
  children: ReactNode;
  variant?: SurfaceVariant;
};

export function Surface({
  as = "div",
  children,
  className,
  variant = "default",
  ...props
}: SurfaceProps) {
  return createElement(
    as,
    {
      ...props,
      className: cx(
        "pc-halo-surface rounded-[var(--pc-radius-card)] border",
        variant === "subtle" && "pc-halo-surface-subtle",
        variant === "interactive" && "pc-halo-surface-interactive",
        variant === "selected" && "pc-halo-selected",
        surfaceClasses[variant],
        className,
      ),
    },
    children,
  );
}
