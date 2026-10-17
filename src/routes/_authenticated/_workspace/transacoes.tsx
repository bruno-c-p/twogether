import { createFileRoute } from "@tanstack/react-router";
import { validateTransactionFilters } from "@/features/budget";
import { TransactionsScreen } from "@/features/budget/components/screens/transactions-screen";

export const Route = createFileRoute("/_authenticated/_workspace/transacoes")({
  validateSearch: validateTransactionFilters,
  component: TransactionsScreen,
});
