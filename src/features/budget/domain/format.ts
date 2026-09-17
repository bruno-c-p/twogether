const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export const money = (cents: number) => moneyFormatter.format(cents / 100);

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
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

export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return localDate(new Date(year, number - 1 + offset, 1)).slice(0, 7);
}

export function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return monthFormatter
    .format(new Date(year, number - 1, 1))
    .replace(" de ", " ");
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
