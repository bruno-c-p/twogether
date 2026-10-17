import type { z } from "zod";
import type {
  goalIdSchema,
  transactionObjectSchema,
  transactionKindSchema,
  viewSchema,
} from "@/features/budget/domain/schemas";

export type GoalId = z.infer<typeof goalIdSchema>;

export type TransactionKind = z.infer<typeof transactionKindSchema>;

export type View = z.infer<typeof viewSchema>;

export type Transaction = z.infer<typeof transactionObjectSchema>;

/** A transaction before `transactionSchema` checks and brands its amount. */
export type TransactionDraft = z.input<typeof transactionObjectSchema>;

export type GoalPercentages = Record<GoalId, number>;

export interface BudgetState {
  percentages: GoalPercentages;
  transactions: Transaction[];
}

export interface Goal {
  id: GoalId;
  name: string;
  description: string;
  color: string;
  background: string;
}

export interface Member {
  id: string;
  name: string;
}

export interface MemberBudget extends Member {
  percentages: GoalPercentages;
  percentagesRevision: number;
}

export interface WorkspaceHousehold {
  id: string;
  members: MemberBudget[];
}

export interface WorkspaceSnapshot {
  user: Member;
  household: WorkspaceHousehold;
  budget: BudgetState;
}
