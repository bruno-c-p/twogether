// The only module that reads the system clock (enforced by `clock/no-direct-clock`).
// Calendar answers take the time zone whose calendar they mean, so server code
// never falls back to the process time zone.

// One formatter per time zone; building Intl formatters is costly.
const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string) {
  const cached = dayFormatters.get(timeZone);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  dayFormatters.set(timeZone, formatter);

  return formatter;
}

export function now(): Date {
  return new Date();
}

// "2026-10-31" for 2026-11-01T02:30Z in America/Sao_Paulo.
export function today(timeZone: string, at = now()): string {
  const parts = dayFormatter(timeZone).formatToParts(at);

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function currentMonth(timeZone: string, at = now()): string {
  return today(timeZone, at).slice(0, 7);
}
