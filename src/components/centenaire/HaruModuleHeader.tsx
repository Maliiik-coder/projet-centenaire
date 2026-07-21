import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { LogoHorizontal } from "@/components/Logo";
import { BackButton, IconButton } from "@/components/ui";
import { cx } from "@/components/ui/styles";

type HaruModuleHeaderProps = {
  backLabel?: string;
  className?: string;
  fallbackHref?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  showBack?: boolean;
};

export function HaruModuleHeader({
  backLabel = "Retour",
  className,
  fallbackHref = "/?app-resume=1&tab=today",
  onBack,
  rightAction,
  showBack = true,
}: HaruModuleHeaderProps) {
  return (
    <header className={cx("flex min-h-24 items-center gap-3 py-1", className)}>
      {!showBack ? null : (
        <div className="flex shrink-0 items-center justify-start">
          {onBack ? (
            <IconButton
              className="rounded-full"
              label={backLabel}
              onClick={onBack}
            >
              <ChevronLeft aria-hidden="true" size={24} />
            </IconButton>
          ) : (
            <BackButton fallbackHref={fallbackHref} label={backLabel} />
          )}
        </div>
      )}

      <LogoHorizontal
        className={cx(
          "h-20 w-auto shrink-0",
          showBack ? "max-w-[58vw]" : "max-w-[78vw]",
        )}
        priority
      />

      <div className="ml-auto flex shrink-0 items-center justify-end">
        {rightAction}
      </div>
    </header>
  );
}
