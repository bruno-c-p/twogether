import type { Transaction } from "@/features/budget/domain/types";

export function summarizeHistory(
  transactions: Transaction[],
  month: string,
  count: number,
) {
  const [year, monthNumber] = month.split("-").map(Number);

  const months = Array.from({ length: count }, (_, index) => {
    const date = new Date(year, monthNumber - count + index, 1, 12);

    return {
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date
        .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        .replace(" de ", "/")
        .replace(".", ""),
      income: 0,
      expense: 0,
    };
  });

  const byMonth = new Map(months.map((item) => [item.month, item]));

  for (const transaction of transactions) {
    const entry = byMonth.get(transaction.date.slice(0, 7));

    if (entry) entry[transaction.kind] += transaction.amount;
  }

  return months;
}
