import { useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { Copy } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { useMutation } from "@/features/budget/hooks/use-mutation";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import {
  createInvite,
  revokeInvite,
} from "@/features/household/actions";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { Button } from "@/components/ui/button";
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
  const signOut = useSignOut();
  const posthog = usePostHog();
  const { user } = useUser();
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
      posthog.capture("household_invite_generated");
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
  async function leave() {
    posthog.reset();
    await signOut();
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
          <span className={styles.email}>
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </span>
          <Button
            variant="text"
            className={styles.logout}
            disabled={busy}
            onClick={() => void leave()}
          >
            Sair da conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
