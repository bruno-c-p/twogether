const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const money = (cents: number) => moneyFormatter.format(cents / 100);

export function formText(form: FormData, name: string): string {
  const value = form.get(name);

  return value instanceof File ? "" : (value ?? "");
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const whole = (digits.slice(0, -2) || "0").replace(/^0+/, "") || "0";
  const cents = digits.slice(-2).padStart(2, "0");

  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents}`;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function currentMonth(date = new Date()): string {
  return localDate(date).slice(0, 7);
}

// Calendar values carry no time zone, so they are read and formatted as
// UTC: the day or month shown is always the one written, wherever this runs.
const longMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

const shortDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-09" → "setembro", or "set" when short. Only the month part is read.
export function monthName(month: string, short = false) {
  const formatter = short ? shortMonthFormatter : longMonthFormatter;
  const date = new Date(Date.UTC(2000, Number(month.slice(-2)) - 1, 1));

  return formatter.format(date).replace(".", "");
}

// "2026-09" → "setembro 2026", or "set 2026" when short.
export function monthLabel(month: string, short = false) {
  if (!MONTH.test(month)) return "Mês";

  return `${monthName(month, short)} ${month.slice(0, 4)}`;
}

// "2026-09-17" → "17 set". An ISO instant (such as split.paidAt) shows the
// local day it happened on.
export function shortDay(value: string) {
  const day = DATE_ONLY.test(value) ? value : localDate(new Date(value));

  return shortDayFormatter
    .format(new Date(`${day}T00:00:00Z`))
    .replace(" de ", " ")
    .replace(".", "");
}

function parseCents(value: string, min: number): number | null {
  const normalized = value.trim().replace(/^R\$\s*/, "");

  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized))
    return null;
  const [whole, decimals = ""] = normalized.replaceAll(".", "").split(",");
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));

  return Number.isSafeInteger(cents) && cents >= min && cents <= 99999999999
    ? cents
    : null;
}

export function parseAmount(value: string): number | null {
  return parseCents(value, 1);
}

export function parseBalance(value: string): number | null {
  if (!value.trim()) return 0;

  return parseCents(value, 0);
}

export function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

export function newId(): string {
  if (crypto.randomUUID !== undefined) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
