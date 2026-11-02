import type { TransactionKind } from "@/features/budget/domain/types";

// A transfer is not spending, so it carries no sign and stays neutral.
export const AMOUNT_STYLE = {
  income: { sign: "+ ", color: "text-text-1" },
  expense: { sign: "− ", color: "text-text-1" },
  transfer: { sign: "", color: "text-text-2" },
} satisfies Record<TransactionKind, { sign: string; color: string }>;
