import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/panel/panel";
import { GoalList } from "@/features/budget/components/goal-list/goal-list";
import { planGoals, summarize } from "@/features/budget/domain/calc";
import type { GoalId, View } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/goals-section/goals-section.module.css";

export function GoalsSection({
  view,
  summary,
  plans,
  hidden,
  displayMoney,
  memberFilter,
  userId,
  busy,
  onEditPercentages,
  onFilterGoal,
}: {
  view: View;
  summary: ReturnType<typeof summarize>;
  plans: ReturnType<typeof planGoals>;
  hidden: boolean;
  displayMoney: (value: number) => string;
  memberFilter: string;
  userId: string;
  busy: boolean;
  onEditPercentages: () => void;
  onFilterGoal: (id: GoalId) => void;
}) {
  return (
    <section className={styles.goalsSection} aria-labelledby="goals-title">
      <SectionHeading title="Metas do orçamento" titleId="goals-title">
        {(memberFilter === "all" || memberFilter === userId) && (
          <Button variant="text" disabled={busy} onClick={onEditPercentages}>
            Editar meus percentuais
          </Button>
        )}
      </SectionHeading>
      <GoalList
        summary={summary}
        plans={plans}
        expanded={view === "goals"}
        hidden={hidden}
        displayMoney={displayMoney}
        onFilterGoal={onFilterGoal}
      />
    </section>
  );
}
