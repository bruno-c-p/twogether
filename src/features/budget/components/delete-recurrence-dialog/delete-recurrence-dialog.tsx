import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Transaction } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const [following, setFollowing] = useState(false);

  return (
    <Dialog
      className={styles.deleteDialog}
      labelledBy="delete-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader onClose={onClose} closeDisabled={busy}>
          <h2 id="delete-title">Excluir transação</h2>
        </DialogHeader>
        <p className={styles.deleteDescription}>{transaction.description}</p>
        <Fieldset disabled={busy}>
          <fieldset className={styles.deleteOptions}>
            <legend>O que você deseja excluir?</legend>
            <label
              className={`${styles.deleteOption} ${!following ? styles.isSelected : ""}`}
            >
              <input
                type="radio"
                name="delete-scope"
                checked={!following}
                onChange={() => setFollowing(false)}
              />
              <span>
                <strong>Só esta transação</strong>
                <small>As outras ocorrências serão mantidas.</small>
              </span>
            </label>
            {count > 1 && (
              <label
                className={`${styles.deleteOption} ${following ? styles.isSelected : ""}`}
              >
                <input
                  type="radio"
                  name="delete-scope"
                  checked={following}
                  onChange={() => setFollowing(true)}
                />
                <span>
                  <strong>Esta e as seguintes</strong>
                  <small>{count} transações desta recorrência.</small>
                </span>
              </label>
            )}
          </fieldset>
          {following && (
            <p className={styles.deleteWarning}>
              As anteriores serão mantidas. Esta exclusão não pode ser desfeita.
            </p>
          )}
          {error && <FormError>{error}</FormError>}
          <DialogFooter>
            <Button type="button" variant="text" onClick={onClose}>
              Cancelar
            </Button>
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
