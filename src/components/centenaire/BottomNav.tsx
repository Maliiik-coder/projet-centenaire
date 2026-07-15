import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/styles";

export type BottomNavItem<T extends string> = {
  accessibleLabel?: string;
  icon: LucideIcon;
  id: T;
  label: string;
};

export type BottomNavProps<T extends string> = {
  activeId: T;
  items: BottomNavItem<T>[];
  onChange: (id: T) => void;
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
      <div className="mx-auto grid max-w-[var(--pc-content-max-width)] grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === activeId;

          return (
            <button
              aria-label={item.accessibleLabel ?? item.label}
              aria-current={selected ? "page" : undefined}
              className={cx(
                "pc-focus-ring pc-motion-safe relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--pc-radius-card)] px-1 py-1 text-center transition-[color,transform] duration-[var(--pc-motion-fast)] ease-[var(--pc-ease-standard)] active:translate-y-px",
                selected
                  ? "text-[var(--pc-color-primary)]"
                  : "text-[var(--pc-color-text-muted)] hover:text-[var(--pc-color-text)]",
              )}
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
            >
              <span
                className={cx(
                  "flex h-7 min-w-11 items-center justify-center rounded-full px-3 transition-colors duration-[var(--pc-motion-fast)]",
                  selected && "bg-[var(--pc-color-primary-soft)]",
                )}
              >
                <Icon
                  aria-hidden="true"
                  size={21}
                  strokeWidth={selected ? 2.25 : 1.9}
                />
              </span>
              <span className="max-w-full whitespace-nowrap text-[11px] leading-4 font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
