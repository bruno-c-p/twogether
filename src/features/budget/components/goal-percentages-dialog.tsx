import { useState, type FormEvent } from "react";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import { isGoalPercentages } from "@/features/budget/domain/validate";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import { FormError } from "@/components/ui/field/field";
import styles from "@/features/budget/components/goal-percentages-dialog.module.css";

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
  const valid = isGoalPercentages(values);
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
        <div className={styles.percentageFields}>
          {GOALS.map((goal) => (
            <label key={goal.id} htmlFor={`percentage-${goal.id}`}>
              <span>{goal.name}</span>
              <span>
                <input
                  id={`percentage-${goal.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={saving}
                  required
                  value={Number.isNaN(values[goal.id]) ? "" : values[goal.id]}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      [goal.id]: event.target.valueAsNumber,
                    })
                  }
                />{" "}
                %
              </span>
            </label>
          ))}
        </div>
        <p
          className={`${styles.percentageTotal} ${valid ? "" : styles.invalid}`}
          role="status"
        >
          Total: {total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
          {!valid && " · Ajuste os percentuais para somar 100%."}
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
