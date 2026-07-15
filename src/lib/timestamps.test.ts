import { describe, expect, it } from "vitest";
import {
  InvalidTimestampError,
  canonicalizeTimestamp,
  tryCanonicalizeTimestamp,
} from "@/lib/timestamps";

describe("canonicalizeTimestamp", () => {
  it("retourne la même clé pour deux représentations du même instant", () => {
    expect(canonicalizeTimestamp("2026-07-14T12:00:00.000Z")).toBe(
      "2026-07-14T12:00:00.000Z",
    );
    expect(canonicalizeTimestamp("2026-07-14T14:00:00.000+02:00")).toBe(
      "2026-07-14T12:00:00.000Z",
    );
  });

  it("refuse explicitement un timestamp invalide", () => {
    expect(() => canonicalizeTimestamp("pas-une-date")).toThrow(
      InvalidTimestampError,
    );
    expect(tryCanonicalizeTimestamp("pas-une-date")).toBeNull();
  });
});
