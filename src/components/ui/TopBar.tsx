import { LogoHorizontal } from "@/components/Logo";
import { cx } from "@/components/ui/styles";

export type TopBarProps = {
  className?: string;
  label: string;
};

export function TopBar({ className, label }: TopBarProps) {
  return (
    <header
      className={cx(
        "flex min-h-16 items-center justify-between gap-3 border-b border-[var(--pc-color-border)] py-3",
        className,
      )}
    >
      <LogoHorizontal
        className="h-20 w-auto max-w-[72vw] shrink-0"
        priority
      />
      <p className="shrink-0 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-text-muted)]">
        {label}
      </p>
    </header>
  );
}
