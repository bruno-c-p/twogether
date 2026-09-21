import { useState, type FormEvent } from "react";
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
import styles from "@/features/budget/components/goal-percentages-dialog/goal-percentages-dialog.module.css";

export function GoalPercentagesDialog({
  percentages,
  onSave,
  onClose,
  error,
}: {
  percentages: GoalPercentages;
  error: string;
  onSave: (values: GoalPercentages) => Promise<boolean>;
  onClose: () => void;
}) {
  const [values, setValues] = useState(percentages);
  const [saving, setSaving] = useState(false);
  const parsed = goalPercentagesSchema.safeParse(values);
  const valid = parsed.success;
  const invalidMessage = parsed.success ? "" : parsed.error.issues[0].message;
  const total = GOALS.reduce(
    (sum, goal) =>
      sum + (Number.isFinite(values[goal.id]) ? values[goal.id] : 0),
    0,
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    if (await onSave(values)) onClose();
    setSaving(false);
  }
  return (
    <Dialog labelledBy="percentages-title" narrow onClose={onClose}>
      <DialogContent
        as="form"
        onSubmit={(event) => void submit(event)}
      >
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
          disabled={saving}
          onChange={(goal, value) => setValues({ ...values, [goal]: value })}
        />
        <p
          className={`${styles.percentageTotal} ${valid ? "" : styles.invalid}`}
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
            disabled={saving}
            onClick={() => setValues({ ...DEFAULT_PERCENTAGES })}
          >
            Restaurar padrão
          </Button>
          <Button disabled={!valid || saving}>Salvar percentuais</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
