import { afterEach, describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  buildGoogleOAuthOptions,
  safeAuthNext,
} from "@/lib/authRedirect";
import {
  stabilizeSmokingEntries,
  upsertDailyWeightEntry,
} from "@/lib/dataStabilization";
import type { SmokingEntry, WeightEntry } from "@/lib/types";

function weight(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    id: "weight-1",
    date: "2026-07-11",
    time: "08:00",
    weightKg: 150,
    createdAt: "2026-07-11T08:00:00.000Z",
    ...overrides,
  };
}

function smoking(overrides: Partial<SmokingEntry> = {}): SmokingEntry {
  return {
    id: "smoking-1",
    date: "2026-07-11",
    time: "20:00",
    state: "aucun",
    createdAt: "2026-07-11T20:00:00.000Z",
    ...overrides,
  };
}

describe("data stabilization", () => {
  it("remplace la mesure officielle du jour au lieu d'ajouter un doublon", () => {
    const entries = upsertDailyWeightEntry(
      [weight()],
      weight({
        id: "weight-2",
        time: "09:15",
        weightKg: 149.4,
        createdAt: "2026-07-11T09:15:00.000Z",
      }),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "weight-1",
      date: "2026-07-11",
      time: "09:15",
      weightKg: 149.4,
      createdAt: "2026-07-11T08:00:00.000Z",
    });
  });

  it("ne garde qu'un état aucun explicite par date", () => {
    const entries = stabilizeSmokingEntries([
      smoking({ id: "smoking-1", createdAt: "2026-07-11T08:00:00.000Z" }),
      smoking({ id: "smoking-2", createdAt: "2026-07-11T21:00:00.000Z" }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("smoking-2");
  });

  it("ne transforme pas un jour non renseigné en jour sans tabac", () => {
    expect(stabilizeSmokingEntries([])).toEqual([]);
  });

  it("retire l'ancien aucun si un événement tabac est noté ensuite", () => {
    const entries = stabilizeSmokingEntries([
      smoking({ id: "smoking-none", createdAt: "2026-07-11T08:00:00.000Z" }),
      smoking({
        id: "smoking-cigarette",
        state: "cigarette",
        createdAt: "2026-07-11T21:00:00.000Z",
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "smoking-cigarette",
      state: "cigarette",
    });
  });
});

describe("safeAuthNext", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }

    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("refuse les URLs externes et les chemins commençant par double slash", () => {
    expect(safeAuthNext("/")).toBe("/");
    expect(safeAuthNext("/carnet")).toBe("/carnet");
    expect(safeAuthNext("//evil.example")).toBe("/");
    expect(safeAuthNext("https://evil.example")).toBe("/");
    expect(safeAuthNext(null)).toBe("/");
  });

  it("construit le callback depuis NEXT_PUBLIC_APP_URL quand il existe", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://centenaire.example.com/app";

    expect(buildAuthCallbackUrl("/carnet", "http://localhost:3000")).toBe(
      "https://centenaire.example.com/auth/callback?next=%2Fcarnet",
    );
  });

  it("retombe sur l'origine locale et garde un next securise", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";

    expect(buildAuthCallbackUrl("//evil.example", "http://localhost:3000")).toBe(
      "http://localhost:3000/auth/callback?next=%2F",
    );
  });

  it("demande à Google de proposer le choix du compte", () => {
    expect(
      buildGoogleOAuthOptions("https://centenaire.example.com/auth/callback"),
    ).toEqual({
      redirectTo: "https://centenaire.example.com/auth/callback",
      queryParams: { prompt: "select_account" },
    });
  });
});
