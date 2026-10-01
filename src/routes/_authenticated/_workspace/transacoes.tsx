import { createFileRoute } from "@tanstack/react-router";
import { TransactionsScreen } from "@/features/budget/components/screens/transactions-screen";
import { validateTransactionFilters } from "@/features/budget/search";

export const Route = createFileRoute("/_authenticated/_workspace/transacoes")({
  validateSearch: validateTransactionFilters,
  component: TransactionsScreen,
});
