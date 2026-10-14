import type { FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import { goalPercentagesSchema } from "@/features/budget/domain/schemas";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { GoalPercentageList } from "@/features/budget/components/goal-percentage-list/goal-percentage-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import { FormError } from "@/components/ui/field/field";
import { sum } from "@/lib/decimal";
import styles from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog.module.css";

export function GoalPercentagesDialog({
  percentages,
  busy,
  error,
  onSave,
  onClose,
}: {
  percentages: GoalPercentages;
  // The save is in flight; the caller closes the dialog when it succeeds.
  busy: boolean;
  error: string;
  onSave: (values: GoalPercentages) => Promise<void>;
  onClose: () => void;
}) {
  const { control, setValue, reset } = useForm({ defaultValues: percentages });
  const values: GoalPercentages = { ...percentages, ...useWatch({ control }) };
  const parsed = goalPercentagesSchema.safeParse(values);
  const valid = parsed.success;
  const invalidMessage = parsed.success ? "" : parsed.error.issues[0].message;

  const total = sum(
    GOALS.map((goal) =>
      Number.isFinite(values[goal.id]) ? values[goal.id] : 0,
    ),
  );

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!valid || busy) return;
    void onSave(values);
  }

  return (
    <Dialog labelledBy="percentages-title" narrow onClose={onClose}>
      <DialogContent as="form" onSubmit={submit}>
        <DialogHeader onClose={onClose} closeLabel="Fechar percentuais">
          <h2 id="percentages-title">Divisão da minha renda</h2>
        </DialogHeader>
        <p className={styles.intro}>
          Defina a porcentagem da sua renda destinada a cada meta. A soma deve
          ser 100% e vale para todos os meses. Cada pessoa define seus próprios
          percentuais.
        </p>
        <GoalPercentageList
          values={values}
          disabled={busy}
          onChange={(goal, value) => setValue(goal, value)}
        />
        <p
          className={`${styles.percentageTotal} tabular-nums ${valid ? "" : styles.invalid}`}
          role="status"
        >
          Total: {total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
          {!valid && ` · ${invalidMessage}`}
        </p>
        {error && <FormError>{error}</FormError>}
        <DialogFooter>
          <Button
            type="button"
            variant="text"
            disabled={busy}
            onClick={() => reset({ ...DEFAULT_PERCENTAGES })}
          >
            Restaurar padrão
          </Button>
          <Button type="submit" disabled={!valid || busy}>
            Salvar percentuais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
