import type { Transaction } from "@/features/budget/types";

export function summarizeExpenses(transactions: Transaction[], month: string) {
  const first = new Date(`${month}-01T12:00:00`);
  const days = Array<number>(
    new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(),
  ).fill(0);
  const tags = new Map<string | null, number>();
  let total = 0;
  for (const transaction of transactions) {
    if (
      transaction.kind !== "expense" ||
      !transaction.date.startsWith(`${month}-`)
    )
      continue;
    days[Number(transaction.date.slice(8, 10)) - 1] += transaction.amount;
    total += transaction.amount;
    const labels = transaction.tags.length
      ? [...new Set(transaction.tags)].sort()
      : [null];
    const share = Math.floor(transaction.amount / labels.length);
    const remainder = transaction.amount % labels.length;
    labels.forEach((tag, index) =>
      tags.set(tag, (tags.get(tag) ?? 0) + share + (index < remainder ? 1 : 0)),
    );
  }
  return {
    days,
    total,
    firstWeekday: first.getDay(),
    tags: [...tags]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
