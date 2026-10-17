import type { z } from "zod";
import type {
  goalIdSchema,
  transactionKindSchema,
  viewSchema,
} from "@/features/budget/domain/schemas";
import type { Cents } from "@/lib/decimal";

export type GoalId = z.infer<typeof goalIdSchema>;

export type TransactionKind = z.infer<typeof transactionKindSchema>;

export type View = z.infer<typeof viewSchema>;

export interface TransactionSplit {
  paidAt?: string;
  paidBy?: string;
  entryIds?: string[];
}

export interface Transaction {
  id: string;
  description: string;
  amount: Cents;
  kind: TransactionKind;
  date: string;
  goal: GoalId | null;
  recurrenceId?: string;
  recurrenceIndex?: number;
  memberId?: string;
  revision?: number;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
  split?: TransactionSplit;
  settlementOf?: string;
}

/** A transaction before `transactionSchema` checks and brands its amount. */
export type TransactionDraft = Omit<Transaction, "amount"> & { amount: number };

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
