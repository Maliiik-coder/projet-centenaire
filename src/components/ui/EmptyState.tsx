import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

export type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <Surface className="grid justify-items-start gap-3 p-5" variant="subtle">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
      >
        {icon ?? <Inbox size={20} />}
      </span>
      <div className="space-y-1">
        <h2 className="text-[length:var(--pc-font-size-card-title)] leading-6 font-semibold text-[var(--pc-color-text)]">
          {title}
        </h2>
        <p className="text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
          {description}
        </p>
      </div>
      {action}
    </Surface>
  );
}
