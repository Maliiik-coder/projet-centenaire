import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildProfileUpdatePayload,
  patchProfile,
} from "@/services/profileService";

describe("buildProfileUpdatePayload", () => {
  it("ne renvoie pas darkMode lorsqu'on modifie seulement la mission", () => {
    const payload = buildProfileUpdatePayload({ showActiveMission: false });

    expect(payload).toMatchObject({ show_active_mission: false });
    expect(payload).not.toHaveProperty("dark_mode");
    expect(payload).not.toHaveProperty("first_name");
  });

  it("préserve l'effacement explicite de smokingGoal", () => {
    expect(buildProfileUpdatePayload({ smokingGoal: null })).toMatchObject({
      smoking_goal: null,
    });
  });

  it("envoie le portrait comportemental dans le JSONB du profil", () => {
    const assessment = {
      version: 1 as const,
      completedAt: "2026-07-16T08:00:00.000Z",
      answers: {
        rhythm: 2 as const,
        hunger: 2 as const,
        satietyControl: 1 as const,
        emotional: 3 as const,
        externalCues: 1 as const,
        habitContext: 2 as const,
        restrictionRebound: 0 as const,
      },
      contexts: ["work" as const],
      perceivedFrictions: ["emotional" as const],
      professionalSupport: "yes" as const,
      hypotheses: [{ axis: "emotional" as const, level: 3 as const }],
      evidence: "self-reported" as const,
    };

    expect(
      buildProfileUpdatePayload({ initialBehaviorAssessment: assessment }),
    ).toMatchObject({
      initial_behavior_assessment: assessment,
    });
  });
});

describe("patchProfile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("échoue lorsque Supabase ne modifie aucune ligne", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const supabase = createClient<Database>(
      "https://example.supabase.co",
      "anon-key",
    );

    await expect(
      patchProfile(supabase, "missing-user", { darkMode: true }),
    ).rejects.toThrow("n’existe pas encore");
  });
});
