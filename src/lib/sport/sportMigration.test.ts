import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260715165000_v08_sport_foundation.sql"),
  "utf8",
);

const userTables = [
  "sport_profiles",
  "sport_user_equipment",
  "sport_user_limitations",
  "sport_user_capabilities",
  "sport_workout_sessions",
  "sport_workout_steps",
  "sport_workout_feedback",
];

describe("sport Supabase migration contract", () => {
  it("rattache toutes les tables utilisateur a user_id", () => {
    for (const table of userTables) {
      const tableStart = migration.indexOf(`create table if not exists public.${table}`);
      const nextTable = migration.indexOf("create table if not exists public.", tableStart + 1);
      const tableSql = migration.slice(
        tableStart,
        nextTable === -1 ? migration.length : nextTable,
      );

      expect(tableSql).toContain("user_id uuid references auth.users(id) on delete cascade not null");
    }
  });

  it("active la RLS sur toutes les tables Sport", () => {
    for (const table of [
      ...userTables,
      "sport_exercises",
      "sport_exercise_variants",
      "sport_exercise_media",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
  });

  it("cree quatre politiques own-user pour chaque table utilisateur", () => {
    for (const table of userTables) {
      expect(migration).toContain(`create policy ${table}_select_own`);
      expect(migration).toContain(`create policy ${table}_insert_own`);
      expect(migration).toContain(`create policy ${table}_update_own`);
      expect(migration).toContain(`create policy ${table}_delete_own`);
    }
  });

  it("limite le catalogue a la lecture cote client", () => {
    expect(migration).toContain(
      "create policy sport_exercises_select_catalog",
    );
    expect(migration).not.toContain("sport_exercises_insert");
    expect(migration).not.toContain("sport_exercise_variants_update");
    expect(migration).not.toContain("sport_exercise_media_delete");
  });

  it("ne contient aucune commande d'application distante", () => {
    expect(migration).not.toContain("supabase db push");
  });
});
