export type GoalId =
  "fixed" | "pleasure" | "comfort" | "targets" | "knowledge" | "freedom";
export type TransactionKind = "expense" | "income";
export type View = "overview" | "transactions" | "goals" | "accounts";

export interface BankAccount {
  id: string;
  name: string;
  openingBalance: number;
  revision?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  kind: TransactionKind;
  date: string;
  goal: GoalId | null;
  tags: string[];
  accountId: string;
  recurrenceId?: string;
  recurrenceIndex?: number;
  memberId?: string;
  revision?: number;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type GoalPercentages = Record<GoalId, number>;

export interface BudgetState {
  percentages: GoalPercentages;
  transactions: Transaction[];
  accounts: BankAccount[];
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
export type WorkspaceUser = Member & { email: string };
export interface WorkspaceHousehold {
  id: string;
  members: MemberBudget[];
}
export interface SharedSnapshot {
  user: WorkspaceUser | null;
  household: WorkspaceHousehold | null;
  budget: BudgetState;
}
export interface WorkspaceSnapshot {
  user: WorkspaceUser;
  household: WorkspaceHousehold;
  budget: BudgetState;
}
export type BudgetCommand =
  | { action: "profile"; name: string }
  | { action: "create" }
  | { action: "join"; token: string }
  | { action: "invite" }
  | { action: "revoke-invite" }
  | { action: "save"; transaction: Transaction; occurrences?: number }
  | {
      action: "delete";
      id: string;
      revision: number;
      following?: { id: string; revision: number }[];
    }
  | { action: "undo-delete"; id: string; revision: number }
  | { action: "save-account"; account: BankAccount }
  | { action: "delete-account"; id: string; revision: number }
  | { action: "percentages"; percentages: GoalPercentages; revision: number };
export interface CommandResult {
  inviteToken?: string;
}
