import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { useForm, useWatch } from "react-hook-form";
import { Trash2 } from "lucide-react";
import type { Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import { Fieldset, FormError } from "@/components/ui/field/field";
import styles from "@/features/budget/components/delete-recurrence-dialog/delete-recurrence-dialog.module.css";

interface Props {
  transaction: Transaction;
  count: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onDelete: (following: boolean) => Promise<void>;
}

export function DeleteRecurrenceDialog({
  transaction,
  count,
  busy,
  error,
  onClose,
  onDelete,
}: Props) {
  const { control, setValue } = useForm<{ scope: "one" | "following" }>({
    defaultValues: { scope: "one" },
  });

  const following = useWatch({ control, name: "scope" }) === "following";

  return (
    <Dialog
      className={styles.deleteDialog}
      labelledBy="delete-title"
      onClose={onClose}
      dismissDisabled={busy}
    >
      <DialogContent>
        <DialogHeader onClose={onClose} closeDisabled={busy}>
          <h2 id="delete-title">Excluir transação</h2>
        </DialogHeader>
        <p className={styles.deleteDescription}>{transaction.description}</p>
        <Fieldset disabled={busy}>
          <BaseFieldset.Root className={styles.deleteOptions}>
            <BaseFieldset.Legend render={<legend />}>
              O que você deseja excluir?
            </BaseFieldset.Legend>
            <RadioGroup
              name="delete-scope"
              value={following ? "following" : "one"}
              disabled={busy}
              onValueChange={(next) =>
                setValue("scope", next === "following" ? "following" : "one")
              }
            >
              <label
                className={`${styles.deleteOption} ${!following ? styles.isSelected : ""}`}
              >
                <Radio.Root
                  value="one"
                  aria-label="Só esta transação"
                  className="shrink-0 w-4 h-4 rounded-full border border-solid border-border data-[checked]:border-accent flex items-center justify-center"
                >
                  <Radio.Indicator className="w-2 h-2 rounded-full bg-accent" />
                </Radio.Root>
                <span>
                  <strong>Só esta transação</strong>
                  <small>As outras ocorrências serão mantidas.</small>
                </span>
              </label>
              {count > 1 && (
                <label
                  className={`${styles.deleteOption} ${following ? styles.isSelected : ""}`}
                >
                  <Radio.Root
                    value="following"
                    aria-label="Esta e as seguintes"
                    className="shrink-0 w-4 h-4 rounded-full border border-solid border-border data-[checked]:border-accent flex items-center justify-center"
                  >
                    <Radio.Indicator className="w-2 h-2 rounded-full bg-accent" />
                  </Radio.Root>
                  <span>
                    <strong>Esta e as seguintes</strong>
                    <small>{count} transações desta recorrência.</small>
                  </span>
                </label>
              )}
            </RadioGroup>
          </BaseFieldset.Root>
          {following && (
            <p className={styles.deleteWarning}>
              As anteriores serão mantidas. Esta exclusão não pode ser desfeita.
            </p>
          )}
          {error && <FormError>{error}</FormError>}
          <DialogFooter>
            <DialogDismiss>Cancelar</DialogDismiss>
            <Button
              type="button"
              className={styles.deleteConfirm}
              onClick={() => void onDelete(following)}
            >
              <Trash2 size={16} />
              {busy
                ? "Excluindo…"
                : following
                  ? `Excluir ${count} transações`
                  : "Excluir transação"}
            </Button>
          </DialogFooter>
        </Fieldset>
      </DialogContent>
    </Dialog>
  );
}
