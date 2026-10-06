import { Button } from "@/components/ui/button";
import { GoalTable } from "@/features/budget/components/goal-table";
import { IncomeDistribution } from "@/features/budget/components/income-distribution";
import { PageHeading } from "@/features/budget/components/page-heading";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";

export function BudgetScreen() {
  const { data, busy, hidden, displayMoney, actions, memberFilter } =
    useWorkspace();

  const note =
    memberFilter === "all"
      ? `Renda base de ${displayMoney(data.summary.income)} dividida por meta. O planejado soma as metas de cada pessoa.`
      : "Renda, gastos e metas da pessoa selecionada.";

  return (
    <>
      <PageHeading
        title="Orçamento"
        note={note}
        action={
          data.canEditPercentages && (
            <Button
              variant="secondary"
              disabled={busy}
              aria-label="Editar meus percentuais"
              onClick={actions.openPercentages}
            >
              Editar percentuais
            </Button>
          )
        }
      />
      <IncomeDistribution plans={data.plans} />
      <GoalTable
        summary={data.summary}
        plans={data.plans}
        hidden={hidden}
        displayMoney={displayMoney}
      />
    </>
  );
}
