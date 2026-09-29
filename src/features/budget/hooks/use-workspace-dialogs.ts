import { useState } from "react";
import type { PhraseDraft } from "@/features/budget/domain/phrase";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";

export function useWorkspaceDialogs() {
  const [transaction, setTransaction] = useState<{
    transaction: Transaction | null;
    draft?: PhraseDraft;
  } | null>(null);

  // Phrase input sheet opened from the mobile "+" button.
  const [register, setRegister] = useState(false);

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
    register,
    setRegister,
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
