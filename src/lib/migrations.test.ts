import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EXPECTED_MIGRATIONS = [
  "20260711095000_v05_initial_schema.sql",
  "20260711223000_v05_stabilization.sql",
  "20260714090000_v06_preferences.sql",
  "20260714100000_v061_dark_mode_preference.sql",
  "20260714110000_v07_meal_tunnel.sql",
  "20260715133410_v071_meal_boolean_defaults.sql",
  "20260715165000_v08_sport_foundation.sql",
] as const;

const TABLES = [
  "profiles",
  "weight_entries",
  "meal_observations",
  "meal_observation_tags",
  "tobacco_events",
  "weekly_reports",
] as const;

const migrationsPath = join(process.cwd(), "supabase", "migrations");
const schemaSql = readFileSync(
  join(process.cwd(), "supabase", "schema.sql"),
  "utf8",
);

function migrationSql(file: (typeof EXPECTED_MIGRATIONS)[number]): string {
  return readFileSync(join(migrationsPath, file), "utf8");
}

function createdColumns(sql: string, table: string): string[] {
  const match = sql.match(
    new RegExp(
      `create table if not exists public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "i",
    ),
  );
  if (!match) return [];

  return match[1]
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0]);
}

function addedColumns(sql: string, table: string): string[] {
  return [
    ...sql.matchAll(
      new RegExp(
        `alter table public\\.${table}\\s+add column if not exists ([a-z_]+)`,
        "gi",
      ),
    ),
  ].map((match) => match[1]);
}

function createdColumnDefault(
  sql: string,
  table: string,
  column: string,
): string | null {
  const tableMatch = sql.match(
    new RegExp(
      `create table if not exists public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "i",
    ),
  );
  if (!tableMatch) return null;

  const columnMatch = tableMatch[1].match(
    new RegExp(`^\\s*${column}\\s+[^\\n,]*\\bdefault\\s+([^\\s,]+)`, "im"),
  );
  return columnMatch?.[1] ?? null;
}

function alteredColumnDefaults(sql: string, table: string): Map<string, string> {
  const defaults = new Map<string, string>();
  const tableStatements = sql.matchAll(
    new RegExp(`alter table public\\.${table}([\\s\\S]*?);`, "gi"),
  );

  for (const statement of tableStatements) {
    for (const match of statement[1].matchAll(
      /alter column ([a-z_]+) set default ([^,;\n]+)/gi,
    )) {
      defaults.set(match[1], match[2].trim());
    }
  }

  return defaults;
}

function namesMatching(sql: string, pattern: RegExp): string[] {
  return [
    ...new Set([...sql.matchAll(pattern)].map((match) => match[1])),
  ].sort();
}

describe("supabase migrations", () => {
  const migrationFiles = readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const allMigrationSql = migrationFiles
    .map((file) => readFileSync(join(migrationsPath, file), "utf8"))
    .join("\n");

  it("utilise des timestamps uniques et strictement croissants", () => {
    const timestamps = migrationFiles.map((file) => file.slice(0, 14));

    expect(new Set(timestamps).size).toBe(timestamps.length);
    expect(migrationFiles).toEqual(EXPECTED_MIGRATIONS);
    expect(timestamps).toEqual([...timestamps].sort());
  });

  it("contient les colonnes ajoutées en V0.6, V0.6.1 et V0.7", () => {
    expect(migrationSql(EXPECTED_MIGRATIONS[2])).toContain(
      "show_active_mission",
    );
    expect(migrationSql(EXPECTED_MIGRATIONS[3])).toContain("dark_mode");

    const v07Sql = migrationSql(EXPECTED_MIGRATIONS[4]);
    for (const column of [
      "serving_pattern",
      "starter_taken",
      "starter_text",
      "dessert_taken",
      "dessert_text",
      "snack_trigger",
      "snack_context",
      "clarifications",
      "questionnaire_version",
    ]) {
      expect(v07Sql).toContain(column);
    }
  });

  it("maintient schema.sql aligné avec les créations et évolutions", () => {
    const initialSql = migrationSql(EXPECTED_MIGRATIONS[0]);

    for (const table of TABLES) {
      const migratedColumns = new Set([
        ...createdColumns(initialSql, table),
        ...migrationFiles.flatMap((file) =>
          addedColumns(
            readFileSync(join(migrationsPath, file), "utf8"),
            table,
          ),
        ),
      ]);
      const schemaColumns = new Set(createdColumns(schemaSql, table));

      expect([...schemaColumns].sort()).toEqual([...migratedColumns].sort());
    }
  });

  it("aligne les défauts booléens repas entre migrations et schema.sql", () => {
    const migratedDefaults = alteredColumnDefaults(
      allMigrationSql,
      "meal_observations",
    );

    for (const column of ["starter_taken", "dessert_taken"]) {
      expect(migratedDefaults.get(column)).toBe("false");
      expect(
        createdColumnDefault(schemaSql, "meal_observations", column),
      ).toBe("false");
    }
  });

  it("maintient les index uniques et politiques RLS du schéma final", () => {
    const uniqueIndexPattern =
      /create unique index if not exists ([a-z_]+)/gi;
    const policyPattern = /create policy ([a-z_]+)/gi;

    expect(namesMatching(schemaSql, uniqueIndexPattern)).toEqual(
      namesMatching(allMigrationSql, uniqueIndexPattern),
    );
    expect(namesMatching(schemaSql, policyPattern)).toEqual(
      namesMatching(allMigrationSql, policyPattern),
    );

    for (const table of TABLES) {
      expect(schemaSql).toContain(
        `alter table public.${table} enable row level security;`,
      );
      for (const operation of ["select", "insert", "update", "delete"]) {
        expect(schemaSql).toContain(`${table}_${operation}_own`);
      }
    }
  });
});
