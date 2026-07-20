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
};

export function HaruModuleHeader({
  backLabel = "Retour",
  className,
  fallbackHref = "/?app-resume=1&tab=today",
  onBack,
  rightAction,
}: HaruModuleHeaderProps) {
  return (
    <header
      className={cx(
        "grid min-h-24 grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 py-1",
        className,
      )}
    >
      <div className="flex items-center justify-start">
        {onBack ? (
          <IconButton
            className="rounded-full"
            label={backLabel}
            onClick={onBack}
          >
            <ChevronLeft aria-hidden="true" size={24} />
          </IconButton>
        ) : (
          <BackButton
            fallbackHref={fallbackHref}
            label={backLabel}
          />
        )}
      </div>

      <LogoHorizontal
        className="h-20 w-auto max-w-full justify-self-center"
        priority
      />

      <div className="flex items-center justify-end">{rightAction}</div>
    </header>
  );
}
