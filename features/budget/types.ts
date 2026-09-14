export type GoalId =
  "fixed" | "pleasure" | "comfort" | "targets" | "knowledge" | "freedom";
export type TransactionKind = "expense" | "income";
export type View = "overview" | "transactions" | "goals" | "tags";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  kind: TransactionKind;
  date: string;
  goal: GoalId | null;
  tags: string[];
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
export interface SharedSnapshot {
  user: (Member & { email: string }) | null;
  household: {
    id: string;
    members: Member[];
    percentagesRevision: number;
  } | null;
  budget: BudgetState;
}
export type BudgetCommand =
  | { action: "request-link"; email: string; invite?: string }
  | { action: "dev-login"; email: string }
  | { action: "verify-link"; token: string }
  | { action: "profile"; name: string }
  | { action: "logout" }
  | { action: "create" }
  | { action: "join"; token: string }
  | { action: "invite" }
  | { action: "revoke-invite" }
  | { action: "save"; transaction: Transaction }
  | { action: "delete"; id: string; revision: number }
  | { action: "undo-delete"; id: string; revision: number }
  | { action: "percentages"; percentages: GoalPercentages; revision: number };
export interface CommandResult {
  snapshot: SharedSnapshot;
  inviteToken?: string;
}
