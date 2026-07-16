"use client";

import { useEffect, useState } from "react";
import { shouldUpdateCurrentDate, todayISO } from "@/lib/dates";
import type { ISODate } from "@/lib/types";

export function useCurrentDate(): ISODate {
  const [currentDate, setCurrentDate] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    const syncCurrentDate = () => {
      setCurrentDate((current) => {
        const next = todayISO();
        return shouldUpdateCurrentDate(current, next) ? next : current;
      });
    };

    const syncOnVisibility = () => {
      if (document.visibilityState === "visible") {
        syncCurrentDate();
      }
    };

    const interval = window.setInterval(syncCurrentDate, 60_000);
    window.addEventListener("focus", syncCurrentDate);
    document.addEventListener("visibilitychange", syncOnVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncCurrentDate);
      document.removeEventListener("visibilitychange", syncOnVisibility);
    };
  }, []);

  return currentDate;
}
