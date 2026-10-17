import { z } from "zod";

export const TIME_ZONE_COOKIE = "twogether.tz.v1";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const timeZoneSchema = z
  .string()
  .min(1)
  .refine((timeZone) => {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone });

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

export function rememberTimeZone(timeZone: string): void {
  try {
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  } catch {
    /* Session-only when cookies are unavailable. */
  }
}
