import { describe, expect, it } from "vitest";
import {
  buildSmokingDaySummary,
  formatKg,
  smokingEntryLine,
} from "@/features/today/todayViewModel";
import type { SmokingEntry } from "@/lib/types";

function smokingEntry(
  state: SmokingEntry["state"],
  createdAt: string,
  note = "",
): SmokingEntry {
  return {
    createdAt,
    date: "2026-07-16",
    id: createdAt,
    note,
    state,
    time: "12:00",
  };
}

describe("todayViewModel", () => {
  it("distingue une journée non renseignée d’une journée explicitement sans tabac", () => {
    expect(buildSmokingDaySummary([])).toBe("Non renseigné");
    expect(
      buildSmokingDaySummary([smokingEntry("aucun", "2026-07-16T12:00:00Z")]),
    ).toBe("Aucun");
  });

  it("résume en priorité les cigarettes puis les envies", () => {
    expect(
      buildSmokingDaySummary([
        smokingEntry("envie", "2026-07-16T12:00:00Z"),
        smokingEntry("cigarette", "2026-07-16T13:00:00Z"),
        smokingEntry("cigarette", "2026-07-16T14:00:00Z"),
      ]),
    ).toBe("2 cigarettes");
  });

  it("formate les faits quotidiens sans modifier leurs données", () => {
    expect(formatKg(150.5)).toBe("150,5 kg");
    expect(
      smokingEntryLine(
        smokingEntry("envie", "2026-07-16T12:00:00Z", "stress"),
      ),
    ).toBe("Envie forte · stress");
  });
});
