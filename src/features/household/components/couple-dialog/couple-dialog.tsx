import { useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { logout } from "@/features/auth/actions";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import {
  createInvite,
  revokeInvite,
} from "@/features/household/actions";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { Button } from "@/components/ui/button/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import {
  FieldHint,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";
import styles from "@/features/household/components/couple-dialog/couple-dialog.module.css";

export function CoupleDialog({
  budget,
  onClose,
}: {
  budget: BudgetController;
  onClose: () => void;
}) {
  const router = useRouter();
  const invite = useMutation(() => createInvite());
  const revoke = useMutation(() => revokeInvite());
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const busy = invite.pending || revoke.pending;
  const error = invite.error || revoke.error;
  async function makeInvite() {
    const result = await invite.run();
    if (result?.ok) {
      setLink(`${window.location.origin}/?convite=${result.inviteToken}`);
      setCopied(false);
      setCopyError("");
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Selecione e copie o link acima.");
    }
  }
  async function cancelInvites() {
    if (await revoke.run()) {
      setLink("");
      setCopyError("Convites anteriores cancelados.");
    }
  }
  async function signOut() {
    try {
      await logout();
    } catch (error) {
      if (isRedirect(error)) {
        await router.navigate(router.resolveRedirect(error).options);
        return;
      }
      setCopyError(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "Sem conexão. Confira o orçamento antes de tentar novamente.",
      );
    }
  }
  return (
    <Dialog labelledBy="couple-title" narrow onClose={onClose}>
      <DialogContent>
        <DialogHeader onClose={onClose} closeLabel="Fechar nosso espaço">
          <h2 id="couple-title">Nosso espaço</h2>
        </DialogHeader>
        <p className={styles.intro}>
          Tudo aqui é dos dois. Ambos podem ver e editar contas, transações,
          tags e percentuais.
        </p>
        <MemberList
          members={budget.household.members}
          currentUserId={budget.user.id}
        />
        {budget.household.members.length === 1 ? (
          <FormStack>
            <p>
              Falta seu par. Gere um convite e compartilhe o link com essa
              pessoa.
            </p>
            <Button disabled={busy} onClick={() => void makeInvite()}>
              {link ? "Gerar novo convite" : "Gerar convite"}
            </Button>
            {link && (
              <>
                <label>
                  Link para seu par
                  <input
                    readOnly
                    value={link}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <Button variant="secondary" onClick={() => void copyInvite()}>
                  <Copy size={16} />
                  {copied ? "Link copiado" : "Copiar convite"}
                </Button>
                <FieldHint>
                  Expira em 48 horas. Um novo convite invalida o anterior.
                </FieldHint>
                {copyError && <p role="status">{copyError}</p>}
              </>
            )}
            <Button
              variant="text"
              disabled={busy}
              onClick={() => void cancelInvites()}
            >
              Cancelar convites pendentes
            </Button>
            {!link && copyError && <p role="status">{copyError}</p>}
          </FormStack>
        ) : (
          <Note>Vocês dois já estão aqui. O espaço está completo.</Note>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogFooter className={styles.footer}>
          <span className={styles.email}>{budget.user.email}</span>
          <Button
            variant="text"
            className={styles.logout}
            disabled={busy}
            onClick={() => void signOut()}
          >
            Sair da conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
