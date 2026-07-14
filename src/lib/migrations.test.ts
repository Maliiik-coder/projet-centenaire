import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("supabase migrations", () => {
  it("utilise un timestamp unique par migration", () => {
    const migrationsPath = join(process.cwd(), "supabase", "migrations");
    const migrationFiles = readdirSync(migrationsPath).filter((file) =>
      file.endsWith(".sql"),
    );
    const timestamps = migrationFiles.map((file) => file.slice(0, 14));

    expect(new Set(timestamps).size).toBe(timestamps.length);
  });
});
