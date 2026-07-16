"use client";

import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export type BackButtonProps = {
  className?: string;
  fallbackHref?: string;
  label?: string;
};

export function canUseInAppHistory({
  currentOrigin,
  historyLength,
  referrer,
}: {
  currentOrigin: string;
  historyLength: number;
  referrer: string;
}): boolean {
  if (historyLength <= 1 || !referrer) {
    return false;
  }

  try {
    return new URL(referrer).origin === currentOrigin;
  } catch {
    return false;
  }
}

export function BackButton({
  className,
  fallbackHref = "/?app-resume=1",
  label = "Retour",
}: BackButtonProps) {
  return (
    <IconButton
      className={`rounded-full ${className ?? ""}`}
      label={label}
      onClick={() => {
        if (
          canUseInAppHistory({
            currentOrigin: window.location.origin,
            historyLength: window.history.length,
            referrer: document.referrer,
          })
        ) {
          window.history.back();
          return;
        }

        window.location.assign(fallbackHref);
      }}
    >
      <ChevronLeft aria-hidden="true" size={24} />
    </IconButton>
  );
}
