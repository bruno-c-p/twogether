import type { FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import { goalPercentagesSchema } from "@/features/budget/domain/schemas";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { GoalPercentageList } from "@/features/budget/components/goal-percentage-list/goal-percentage-list";
import { Button } from "@/components/glaze/ui/button";
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import { FieldError, FormStatus } from "@/components/glaze/ui/field";
import { sum } from "@/lib/decimal";

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* The footer sits on the shell outside the panel, so the whole popup is the form. */}
      <DialogContent size="sm" render={<form onSubmit={submit} />}>
        <DialogHeader>
          <DialogTitle>Divisão da minha renda</DialogTitle>
          <DialogDescription>
            Defina a porcentagem da sua renda destinada a cada meta. A soma deve
            ser 100% e vale para todos os meses. Cada pessoa define seus
            próprios percentuais.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <GoalPercentageList
            values={values}
            disabled={busy}
            onChange={(goal, value) => setValue(goal, value)}
          />
          <FormStatus
            status={valid ? undefined : "fail"}
            className="tabular-nums"
          >
            Total: {total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            %{!valid && ` · ${invalidMessage}`}
          </FormStatus>
          {error && <FieldError>{error}</FieldError>}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => reset({ ...DEFAULT_PERCENTAGES })}
          >
            Restaurar padrão
          </Button>
          <DialogAction type="submit" disabled={!valid || busy} pending={busy}>
            Salvar percentuais
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
