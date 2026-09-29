import { GoalTable } from "@/features/budget/components/goal-table";
import { IncomeDistribution } from "@/features/budget/components/income-distribution";
import { PageHeading } from "@/features/budget/components/page-heading";
import type { ScreenProps } from "@/features/budget/components/screens/screen-props";

export function BudgetScreen({
  budget,
  search,
  data,
  busy,
  hidden,
  displayMoney,
  dialogs,
}: ScreenProps) {
  const ownMember = budget.household.members.find(
    (member) => member.id === budget.user.id,
  );

  const canEdit =
    search.memberFilter === "all" || search.memberFilter === budget.user.id;

  const note =
    search.memberFilter === "all"
      ? `Renda base de ${displayMoney(data.summary.income)} dividida por meta. O planejado soma as metas de cada pessoa.`
      : "Renda, gastos e metas da pessoa selecionada.";

  return (
    <>
      <PageHeading
        title="Orçamento"
        note={note}
        action={
          canEdit && (
            <button
              className="h-[40px] px-[16px] rounded-[10px] border border-solid border-green bg-surface text-green text-[14px] font-600 cursor-pointer disabled:opacity-60"
              disabled={busy}
              aria-label="Editar meus percentuais"
              onClick={() =>
                dialogs.setPercentagesRevision(
                  ownMember?.percentagesRevision ?? 0,
                )
              }
            >
              Editar percentuais
            </button>
          )
        }
      />
      <IncomeDistribution plans={data.plans} />
      <GoalTable
        summary={data.summary}
        plans={data.plans}
        hidden={hidden}
        displayMoney={displayMoney}
        onFilterGoal={search.filterGoal}
      />
    </>
  );
}
