import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type BottomNavItem<T extends string> = {
  accessibleLabel?: string;
  href?: string;
  icon: LucideIcon;
  id: T;
  label: string;
};

export type BottomNavProps<T extends string> = {
  activeId: T;
  items: readonly BottomNavItem<T>[];
  onChange?: (id: T) => void;
};

export function BottomNav<T extends string>({
  activeId,
  items,
  onChange,
}: BottomNavProps<T>) {
  return (
    <nav
      aria-label="Navigation principale"
      className="pc-bottom-nav fixed inset-x-0 bottom-0 z-[var(--pc-z-navigation)] border-t border-[var(--pc-color-border)] bg-[color-mix(in_srgb,var(--pc-color-surface)_94%,transparent)] px-[var(--pc-safe-left)] pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl"
    >
      <div
        className="mx-auto grid max-w-[var(--pc-content-max-width)] gap-1"
        style={{
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === activeId;
          const className = cx(
            "pc-bottom-nav-item pc-focus-ring pc-motion-safe relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--pc-radius-card)] px-1 py-1 text-center transition-colors duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)]",
            selected
              ? "pc-bottom-nav-item-active text-[var(--pc-color-primary)]"
              : "text-[var(--pc-color-text-muted)] hover:text-[var(--pc-color-text)]",
          );
          const content = (
            <>
              <span className="relative flex h-7 w-full items-center justify-center">
                <span
                  className={cx(
                    "pc-bottom-nav-icon-frame relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.2,0.9,0.25,1.35)]",
                    selected
                      ? "-translate-y-3 scale-[1.06] bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[0_9px_22px_color-mix(in_srgb,var(--pc-color-primary)_28%,transparent)]"
                      : "scale-[0.86] bg-transparent",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    size={21}
                    strokeWidth={selected ? 2.35 : 1.9}
                  />
                </span>
              </span>
              <span
                className={cx(
                  "relative z-10 max-w-full whitespace-nowrap text-[11px] leading-4 font-semibold transition-colors duration-200",
                  selected && "font-bold",
                )}
              >
                {item.label}
              </span>
            </>
          );

          if (item.href) {
            return (
              <Link
                aria-label={item.accessibleLabel ?? item.label}
                aria-current={selected ? "page" : undefined}
                className={className}
                href={item.href}
                key={item.id}
                onClick={() => onChange?.(item.id)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              aria-label={item.accessibleLabel ?? item.label}
              aria-current={selected ? "page" : undefined}
              className={className}
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
