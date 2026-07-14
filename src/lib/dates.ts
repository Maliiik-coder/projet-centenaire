import type { ISODate, Weekday } from "@/lib/types";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function shouldUpdateCurrentDate(
  currentDate: ISODate,
  nextDate: ISODate = todayISO(),
): boolean {
  return currentDate !== nextDate;
}

export function parseISODate(value: ISODate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysBetween(start: ISODate, end: ISODate): number {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
}

export function getWeekday(value: ISODate): Weekday {
  return WEEKDAYS[parseISODate(value).getDay()];
}

export function startOfWeek(value: ISODate): ISODate {
  const date = parseISODate(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export function getLastDates(endDate: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, index) =>
    addDays(endDate, index - count + 1),
  ).reverse();
}

export function isWithinInclusive(
  value: ISODate,
  start: ISODate,
  end: ISODate,
): boolean {
  return value >= start && value <= end;
}

export function formatLongDate(value: ISODate): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(value));
}

export function formatShortDate(value: ISODate): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(parseISODate(value));
}
