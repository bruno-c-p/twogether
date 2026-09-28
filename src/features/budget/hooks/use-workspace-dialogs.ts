import { useState } from "react";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";

export function useWorkspaceDialogs() {
  const [transaction, setTransaction] = useState<{
    transaction: Transaction | null;
  } | null>(null);

  const [account, setAccount] = useState<{
    account: BankAccount | null;
  } | null>(null);

  const [percentagesRevision, setPercentagesRevision] = useState<number | null>(
    null,
  );

  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [settling, setSettling] = useState<Transaction | null>(null);

  return {
    transaction,
    setTransaction,
    account,
    setAccount,
    percentagesRevision,
    setPercentagesRevision,
    deleting,
    setDeleting,
    settling,
    setSettling,
  };
}

export type WorkspaceDialogs = ReturnType<typeof useWorkspaceDialogs>;
