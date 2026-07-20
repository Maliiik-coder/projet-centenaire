"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { iconButtonClassName } from "@/components/ui/IconButton";

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
    <Link
      aria-label={label}
      className={iconButtonClassName({
        className: `rounded-full ${className ?? ""}`,
      })}
      href={fallbackHref}
      title={label}
      onClick={(event) => {
        if (
          canUseInAppHistory({
            currentOrigin: window.location.origin,
            historyLength: window.history.length,
            referrer: document.referrer,
          })
        ) {
          event.preventDefault();
          window.history.back();
        }
      }}
    >
      <ChevronLeft aria-hidden="true" size={24} />
    </Link>
  );
}
