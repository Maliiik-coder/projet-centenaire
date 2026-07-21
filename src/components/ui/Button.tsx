import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "pc-halo-action border-transparent bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-hover)]",
  secondary:
    "pc-halo-action pc-halo-action-secondary border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-muted)]",
  tertiary:
    "border-transparent bg-transparent text-[var(--pc-color-primary)] hover:bg-[var(--pc-color-primary-soft)]",
  danger:
    "pc-halo-control pc-halo-danger border-[var(--pc-color-danger)] bg-[var(--pc-color-danger-soft)] text-[var(--pc-color-danger)] hover:shadow-[var(--pc-shadow-level-1)]",
};

export function buttonClassName({
  variant = "primary",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cx(
    "pc-focus-ring pc-motion-safe inline-flex min-h-[var(--pc-control-height)] cursor-pointer items-center justify-center gap-2 rounded-[var(--pc-radius-card)] border px-4 py-2 text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    variantClasses[variant],
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth,
    loading = false,
    loadingLabel = "Chargement",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, fullWidth, className })}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
      ) : null}
      {loading ? loadingLabel : children}
    </button>
  );
});
