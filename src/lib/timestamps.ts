export class InvalidTimestampError extends Error {
  constructor(value: string) {
    super(`Timestamp invalide : ${value || "valeur vide"}`);
    this.name = "InvalidTimestampError";
  }
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function canonicalizeTimestamp(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
    value,
  );
  const validClock =
    match !== null &&
    Number(match[2]) <= 23 &&
    Number(match[3]) <= 59 &&
    Number(match[4]) <= 59;
  const timestamp = new Date(value);

  if (
    !match ||
    !isValidISODate(match[1]) ||
    !validClock ||
    Number.isNaN(timestamp.getTime())
  ) {
    throw new InvalidTimestampError(value);
  }

  return timestamp.toISOString();
}

export function tryCanonicalizeTimestamp(value: string): string | null {
  try {
    return canonicalizeTimestamp(value);
  } catch {
    return null;
  }
}
