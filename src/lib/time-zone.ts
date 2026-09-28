import { z } from "zod";

export const TIME_ZONE_COOKIE = "twogether.tz.v1";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// One month formatter per time zone; building Intl formatters is costly.
const monthFormatters = new Map<string, Intl.DateTimeFormat>();

function monthFormatter(timeZone: string) {
  const cached = monthFormatters.get(timeZone);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  monthFormatters.set(timeZone, formatter);

  return formatter;
}

const timeZoneSchema = z
  .string()
  .min(1)
  .refine((timeZone) => {
    try {
      monthFormatter(timeZone);

      return true;
    } catch {
      return false;
    }
  });

export function isValidTimeZone(value: unknown): value is string {
  return timeZoneSchema.safeParse(value).success;
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function monthIn(timeZone: string, date = new Date()): string {
  const parts = monthFormatter(timeZone).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

export function rememberTimeZone(timeZone: string): void {
  try {
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  } catch {
    /* Session-only when cookies are unavailable. */
  }
}
