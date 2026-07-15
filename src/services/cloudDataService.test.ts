import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { NonMealMutationDraft } from "@/lib/types";

const createProfileIfMissingMock = vi.hoisted(() => vi.fn());
const patchProfileMock = vi.hoisted(() => vi.fn());
const upsertWeightEntryMock = vi.hoisted(() => vi.fn());
const upsertTobaccoEventMock = vi.hoisted(() => vi.fn());
const upsertMealObservationMock = vi.hoisted(() => vi.fn());
const upsertWeeklyReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/profileService", () => ({
  createProfileIfMissing: createProfileIfMissingMock,
  deleteProfile: vi.fn(),
  getProfile: vi.fn(),
  patchProfile: patchProfileMock,
}));

vi.mock("@/services/weightService", () => ({
  deleteWeightEntries: vi.fn(),
  listWeightEntries: vi.fn(),
  upsertWeightEntry: upsertWeightEntryMock,
}));

vi.mock("@/services/tobaccoService", () => ({
  deleteTobaccoEvents: vi.fn(),
  listTobaccoEvents: vi.fn(),
  upsertTobaccoEvent: upsertTobaccoEventMock,
}));

vi.mock("@/services/mealService", () => ({
  deleteMealObservations: vi.fn(),
  listMealObservations: vi.fn(),
  upsertMealObservation: upsertMealObservationMock,
}));

vi.mock("@/services/reportService", () => ({
  deleteWeeklyReports: vi.fn(),
  upsertWeeklyReport: upsertWeeklyReportMock,
}));

import { applyNonMealMutation } from "@/services/cloudDataService";

const supabase = createClient<Database>(
  "https://example.supabase.co",
  "anon-key",
);

describe("applyNonMealMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProfileIfMissingMock.mockResolvedValue(undefined);
    patchProfileMock.mockResolvedValue(undefined);
    upsertWeightEntryMock.mockResolvedValue(undefined);
    upsertTobaccoEventMock.mockResolvedValue(undefined);
  });

  it("applique uniquement le patch profil fourni", async () => {
    const mutation: NonMealMutationDraft = {
      entity: "profile",
      action: "patch",
      entityKey: "profile",
      patch: { showActiveMission: false },
    };

    await applyNonMealMutation(supabase, "user-a", mutation);

    expect(patchProfileMock).toHaveBeenCalledWith(
      supabase,
      "user-a",
      { showActiveMission: false },
      undefined,
    );
    expect(createProfileIfMissingMock).not.toHaveBeenCalled();
    expect(upsertWeightEntryMock).not.toHaveBeenCalled();
    expect(upsertTobaccoEventMock).not.toHaveBeenCalled();
    expect(upsertMealObservationMock).not.toHaveBeenCalled();
    expect(upsertWeeklyReportMock).not.toHaveBeenCalled();
  });

  it("envoie uniquement la date de poids ciblée", async () => {
    const entry = {
      id: "weight-15",
      date: "2026-07-15",
      time: "08:00",
      weightKg: 148,
      createdAt: "2026-07-15T06:00:00.000Z",
    };
    const mutation: NonMealMutationDraft = {
      entity: "weight",
      action: "upsert",
      entityKey: entry.date,
      payload: entry,
    };

    await applyNonMealMutation(supabase, "user-a", mutation);

    expect(upsertWeightEntryMock).toHaveBeenCalledWith(
      supabase,
      "user-a",
      entry,
      undefined,
    );
    expect(patchProfileMock).not.toHaveBeenCalled();
    expect(upsertTobaccoEventMock).not.toHaveBeenCalled();
  });

  it("applique une création profil sans upsert destructif", async () => {
    const mutation: NonMealMutationDraft = {
      entity: "profile",
      action: "create",
      entityKey: "profile",
      patch: { firstName: "Olaf", darkMode: false },
    };

    await applyNonMealMutation(supabase, "user-a", mutation);

    expect(createProfileIfMissingMock).toHaveBeenCalledWith(
      supabase,
      "user-a",
      mutation.patch,
      undefined,
    );
    expect(patchProfileMock).not.toHaveBeenCalled();
  });
});
