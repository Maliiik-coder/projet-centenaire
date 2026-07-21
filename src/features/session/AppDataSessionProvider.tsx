"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ISODate } from "@/lib/types";
import { useCurrentDate } from "@/features/startup/useCurrentDate";
import { useAppDataSession } from "@/features/session/useAppDataSession";

type AppDataSessionContextValue = ReturnType<typeof useAppDataSession> & {
  currentDate: ISODate;
};

const AppDataSessionContext = createContext<AppDataSessionContextValue | null>(
  null,
);

export function AppDataSessionProvider({ children }: { children: ReactNode }) {
  const currentDate = useCurrentDate();
  const session = useAppDataSession(currentDate);

  return (
    <AppDataSessionContext.Provider value={{ ...session, currentDate }}>
      {children}
    </AppDataSessionContext.Provider>
  );
}

export function useSharedAppDataSession(): AppDataSessionContextValue {
  const session = useContext(AppDataSessionContext);

  if (!session) {
    throw new Error(
      "useSharedAppDataSession must be used within AppDataSessionProvider.",
    );
  }

  return session;
}
