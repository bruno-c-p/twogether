import { createFileRoute } from "@tanstack/react-router";
import { AccountsScreen } from "@/features/budget/components/screens/accounts-screen";

export const Route = createFileRoute("/_authenticated/_workspace/contas")({
  component: AccountsScreen,
});
