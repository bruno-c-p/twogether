import { Plus } from "lucide-react";
import { AccountList } from "@/features/budget/components/account-list";
import { PageHeading } from "@/features/budget/components/page-heading";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { Button } from "@/components/ui/button";

export function AccountsScreen() {
  const { budget, busy, month, displayMoney, dialogs, actions, memberFilter } =
    useWorkspace();

  return (
    <>
      <PageHeading
        title="Contas"
        note={
          memberFilter === "all"
            ? "Saldo inicial mais receitas, menos despesas. Inclui as transações do casal."
            : "Saldo inicial mais receitas, menos despesas. Considera só as transações da pessoa selecionada."
        }
        action={
          <Button
            disabled={busy}
            onClick={() => dialogs.setAccount({ account: null })}
          >
            <Plus size={19} /> Nova conta
          </Button>
        }
      />
      <AccountList
        accounts={budget.state.accounts}
        transactions={budget.state.transactions}
        memberFilter={memberFilter}
        busy={busy}
        month={month}
        displayMoney={displayMoney}
        onAdd={() => dialogs.setAccount({ account: null })}
        onEdit={(account) => dialogs.setAccount({ account })}
        onDelete={(account) => void actions.removeAccount(account)}
      />
    </>
  );
}
