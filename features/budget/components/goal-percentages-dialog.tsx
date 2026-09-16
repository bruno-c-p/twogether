import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import { isGoalPercentages } from "@/features/budget/services/budget";
import type { GoalPercentages } from "@/features/budget/types";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(percentages);
  const [saving, setSaving] = useState(false);
  const valid = isGoalPercentages(values);
  const total = GOALS.reduce(
    (sum, goal) =>
      sum + (Number.isFinite(values[goal.id]) ? values[goal.id] : 0),
    0,
  );
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="percentages-title"
      onCancel={onClose}
    >
      <form
        className="dialog-content"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || saving) return;
          setSaving(true);
          if (await onSave(values)) onClose();
          setSaving(false);
        }}
      >
        <header className="dialog-header">
          <h2 id="percentages-title">Divisão da minha renda</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar percentuais"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <p className="percentage-intro">
          Defina a porcentagem da sua renda destinada a cada meta. A soma deve
          ser 100% e vale para todos os meses. Cada pessoa define seus próprios
          percentuais.
        </p>
        <div className="percentage-fields">
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
          className={`percentage-total ${valid ? "" : "invalid"}`}
          role="status"
        >
          Total: {total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
          {!valid && " · Ajuste os percentuais para somar 100%."}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer className="dialog-footer">
          <button
            type="button"
            className="text-button"
            disabled={saving}
            onClick={() => setValues({ ...DEFAULT_PERCENTAGES })}
          >
            Restaurar padrão
          </button>
          <button className="primary-button" disabled={!valid || saving}>
            Salvar percentuais
          </button>
        </footer>
      </form>
    </dialog>
  );
}
