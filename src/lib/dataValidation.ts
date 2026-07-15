import {
  canonicalizeTimestamp,
  isValidISODate,
  isValidTime,
} from "@/lib/timestamps";
import type {
  MealEntry,
  MealMutationPayload,
  NonMealMutationDraft,
  Profile,
  SmokingEntry,
  StoredCloudMutation,
  WeightEntry,
} from "@/lib/types";

export class ImportValidationError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason: string,
  ) {
    super(`${path}: ${reason}`);
    this.name = "ImportValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireDate(value: unknown, path: string): asserts value is string {
  if (!isValidISODate(value)) {
    throw new ImportValidationError(path, "date invalide");
  }
}

function requireTime(value: unknown, path: string): asserts value is string {
  if (!isValidTime(value)) {
    throw new ImportValidationError(path, "heure invalide");
  }
}

function requireTimestamp(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") {
    throw new ImportValidationError(path, "timestamp manquant");
  }

  try {
    canonicalizeTimestamp(value);
  } catch {
    throw new ImportValidationError(path, "timestamp invalide");
  }
}

export function validateProfileForImport(
  value: unknown,
  path = "profile",
): asserts value is Profile {
  if (!isRecord(value)) {
    throw new ImportValidationError(path, "profil invalide");
  }

  requireDate(value.startDate, `${path}.startDate`);
  requireTimestamp(value.createdAt, `${path}.createdAt`);
}

export function validateWeightForImport(
  value: unknown,
  path = "weights[]",
): asserts value is WeightEntry {
  if (!isRecord(value)) {
    throw new ImportValidationError(path, "poids invalide");
  }

  requireDate(value.date, `${path}.date`);
  requireTime(value.time, `${path}.time`);
  requireTimestamp(value.createdAt, `${path}.createdAt`);

  if (
    typeof value.weightKg !== "number" ||
    !Number.isFinite(value.weightKg) ||
    value.weightKg < 40 ||
    value.weightKg > 300
  ) {
    throw new ImportValidationError(`${path}.weightKg`, "valeur hors plage");
  }
}

export function validateMealForImport(
  value: unknown,
  path = "meals[]",
): asserts value is MealEntry {
  if (!isRecord(value)) {
    throw new ImportValidationError(path, "repas invalide");
  }

  requireDate(value.date, `${path}.date`);
  requireTime(value.time, `${path}.time`);
  requireTimestamp(value.createdAt, `${path}.createdAt`);
}

export function validateSmokingForImport(
  value: unknown,
  path = "smokingEntries[]",
): asserts value is SmokingEntry {
  if (!isRecord(value)) {
    throw new ImportValidationError(path, "observation tabac invalide");
  }

  requireDate(value.date, `${path}.date`);
  requireTime(value.time, `${path}.time`);
  requireTimestamp(value.createdAt, `${path}.createdAt`);
}

export function validateImportedPayload(value: unknown): void {
  if (!isRecord(value)) {
    throw new ImportValidationError("fichier", "format invalide");
  }

  if ("profile" in value && value.profile !== null) {
    validateProfileForImport(value.profile);
  }

  if ("weights" in value) {
    if (!Array.isArray(value.weights)) {
      throw new ImportValidationError("weights", "liste invalide");
    }
    value.weights.forEach((entry, index) =>
      validateWeightForImport(entry, `weights[${index}]`),
    );
  }

  if ("meals" in value) {
    if (!Array.isArray(value.meals)) {
      throw new ImportValidationError("meals", "liste invalide");
    }
    value.meals.forEach((entry, index) =>
      validateMealForImport(entry, `meals[${index}]`),
    );
  }

  if ("smokingEntries" in value) {
    if (!Array.isArray(value.smokingEntries)) {
      throw new ImportValidationError("smokingEntries", "liste invalide");
    }
    value.smokingEntries.forEach((entry, index) =>
      validateSmokingForImport(entry, `smokingEntries[${index}]`),
    );
  }
}

export function validateNonMealMutationPayload(
  mutation: NonMealMutationDraft,
): void {
  if (mutation.entity === "profile") {
    if (mutation.action === "create") {
      validateProfileForImport(mutation.patch, "mutation.profile");
      return;
    }

    if ("startDate" in mutation.patch) {
      requireDate(mutation.patch.startDate, "mutation.profile.startDate");
    }
    if ("createdAt" in mutation.patch) {
      requireTimestamp(mutation.patch.createdAt, "mutation.profile.createdAt");
    }
    return;
  }

  if (mutation.entity === "weight") {
    validateWeightForImport(mutation.payload, "mutation.weight");
    if (mutation.entityKey !== mutation.payload.date) {
      throw new ImportValidationError("mutation.weight.entityKey", "clé incohérente");
    }
    return;
  }

  validateSmokingForImport(mutation.payload, "mutation.smoking");
  if (canonicalizeTimestamp(mutation.entityKey) !== mutation.payload.createdAt) {
    throw new ImportValidationError("mutation.smoking.entityKey", "clé incohérente");
  }
}

export function validateMealMutationPayload(mutation: MealMutationPayload): void {
  const entityKey = canonicalizeTimestamp(mutation.entityKey);
  const createdAt = canonicalizeTimestamp(mutation.createdAt);

  if (entityKey !== createdAt) {
    throw new ImportValidationError("mutation.meal.entityKey", "clé incohérente");
  }

  if (mutation.action === "upsert") {
    validateMealForImport(mutation.payload, "mutation.meal");
    if (canonicalizeTimestamp(mutation.payload.createdAt) !== entityKey) {
      throw new ImportValidationError(
        "mutation.meal.payload.createdAt",
        "timestamp incohérent",
      );
    }
  }
}

export function validateStoredCloudMutation(mutation: StoredCloudMutation): void {
  if (!mutation.id || !mutation.ownerUserId || !mutation.generationId) {
    throw new ImportValidationError("mutation", "identité incomplète");
  }
  requireTimestamp(mutation.queuedAt, "mutation.queuedAt");

  if (mutation.kind === "non-meal") {
    validateNonMealMutationPayload(mutation.payload);
    return;
  }

  validateMealMutationPayload(mutation.payload);
}
