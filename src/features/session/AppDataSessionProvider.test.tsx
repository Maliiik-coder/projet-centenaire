import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  useAppDataSession: vi.fn(() => ({ cloudUserId: "user-a" })),
  useCurrentDate: vi.fn(() => "2026-07-21"),
}));

vi.mock("@/features/session/useAppDataSession", () => ({
  useAppDataSession: sessionMocks.useAppDataSession,
}));

vi.mock("@/features/startup/useCurrentDate", () => ({
  useCurrentDate: sessionMocks.useCurrentDate,
}));

import {
  AppDataSessionProvider,
  useSharedAppDataSession,
} from "@/features/session/AppDataSessionProvider";

function SessionConsumer({ label }: { label: string }) {
  const { cloudUserId, currentDate } = useSharedAppDataSession();

  return <span>{`${label}:${cloudUserId}:${currentDate}`}</span>;
}

describe("AppDataSessionProvider", () => {
  it("partage une seule session entre les écrans persistants", () => {
    const html = renderToStaticMarkup(
      <AppDataSessionProvider>
        <SessionConsumer label="journal" />
        <SessionConsumer label="profile" />
      </AppDataSessionProvider>,
    );

    expect(html).toContain("journal:user-a:2026-07-21");
    expect(html).toContain("profile:user-a:2026-07-21");
    expect(sessionMocks.useCurrentDate).toHaveBeenCalledTimes(1);
    expect(sessionMocks.useAppDataSession).toHaveBeenCalledTimes(1);
    expect(sessionMocks.useAppDataSession).toHaveBeenCalledWith("2026-07-21");
  });
});
