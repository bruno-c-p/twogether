import { useRef, useState } from "react";
import { Copy, X } from "lucide-react";
import type { BudgetController } from "../hooks/use-budget";
import { useModalDialog } from "../hooks/use-modal-dialog";

export function CoupleDialog({
  budget,
  onClose,
}: {
  budget: BudgetController;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useModalDialog(dialog);
  return (
    <dialog
      ref={dialog}
      className="help-dialog couple-dialog"
      aria-labelledby="couple-title"
      onCancel={onClose}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <h2 id="couple-title">Nosso espaço</h2>
          <button
            className="icon-button"
            aria-label="Fechar nosso espaço"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <p className="percentage-intro">
          Tudo aqui é dos dois. Ambos podem ver e editar contas, transações,
          tags e percentuais.
        </p>
        <div className="couple-members">
          {budget.household?.members.map((member) => (
            <div className="couple-member" key={member.id}>
              <span className="avatar">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{member.name}</strong>
              <span>{member.id === budget.user?.id ? "Você" : "Seu par"}</span>
            </div>
          ))}
        </div>
        {budget.household?.members.length === 1 ? (
          <div className="account-form">
            <p>
              Falta seu par. Gere um convite e compartilhe o link com essa
              pessoa.
            </p>
            <button
              className="primary-button"
              disabled={budget.busy}
              onClick={async () => {
                const result = await budget.command({ action: "invite" });
                if (result?.inviteToken) {
                  setLink(
                    `${window.location.origin}/#convite=${result.inviteToken}`,
                  );
                  setCopied(false);
                  setCopyError("");
                }
              }}
            >
              {link ? "Gerar novo convite" : "Gerar convite"}
            </button>
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
                <button
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setCopyError("");
                    } catch {
                      setCopyError("Selecione e copie o link acima.");
                    }
                  }}
                >
                  <Copy size={16} />
                  {copied ? "Link copiado" : "Copiar convite"}
                </button>
                <p className="account-footnote">
                  Expira em 48 horas. Um novo convite invalida o anterior.
                </p>
                {copyError && <p role="status">{copyError}</p>}
              </>
            )}
            <button
              className="text-button"
              disabled={budget.busy}
              onClick={async () => {
                if (await budget.command({ action: "revoke-invite" })) {
                  setLink("");
                  setCopyError("Convites anteriores cancelados.");
                }
              }}
            >
              Cancelar convites pendentes
            </button>
            {!link && copyError && <p role="status">{copyError}</p>}
          </div>
        ) : (
          <p className="invitation-note">
            Vocês dois já estão aqui. O espaço está completo.
          </p>
        )}
        {budget.error && (
          <p role="alert" className="form-error">
            {budget.error}
          </p>
        )}
        <footer className="dialog-footer">
          <span className="account-email">{budget.user?.email}</span>
          <button
            className="text-button logout-button"
            disabled={budget.busy}
            onClick={() => budget.command({ action: "logout" })}
          >
            Sair da conta
          </button>
        </footer>
      </div>
    </dialog>
  );
}
