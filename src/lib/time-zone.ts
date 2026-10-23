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

// The zone rememberTimeZone stored, read the way the server reads it.
export function rememberedTimeZone(): string | undefined {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${TIME_ZONE_COOKIE}=`))
    ?.slice(TIME_ZONE_COOKIE.length + 1);

  const timeZone = value === undefined ? undefined : decodeURIComponent(value);

  return isValidTimeZone(timeZone) ? timeZone : undefined;
}

export function rememberTimeZone(timeZone: string): void {
  try {
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  } catch {
    /* Session-only when cookies are unavailable. */
  }
}
