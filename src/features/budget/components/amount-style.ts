// @unocss-include
import type { TransactionKind } from "@/features/budget/domain/types";

// A transfer is not spending, so it carries no sign and stays neutral.
export const AMOUNT_STYLE = {
  income: { sign: "+ ", color: "text-positive" },
  expense: { sign: "− ", color: "text-text" },
  transfer: { sign: "", color: "text-text-muted" },
} satisfies Record<TransactionKind, { sign: string; color: string }>;
