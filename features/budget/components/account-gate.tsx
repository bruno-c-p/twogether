import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake, Mail } from "lucide-react";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { AppFooter } from "@/features/budget/components/app-footer";
import ui from "@/src/ui.module.css";
import styles from "@/features/budget/components/account-gate.module.css";

const isDevelopment = import.meta.env.DEV;

export function inviteToken(value: string) {
  try {
    const url = new URL(value);
    return (
      url.searchParams.get("convite") ??
      new URLSearchParams(url.hash.slice(1)).get("convite") ??
      value.trim()
    );
  } catch {
    return value.trim();
  }
}
export function AccountGate({ budget }: { budget: BudgetController }) {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const invitation = search.convite ?? "";
  const clearInvitation = () =>
    void navigate({
      to: "/",
      search: (prev) => ({ ...prev, convite: undefined }),
      replace: true,
    });
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function requestAccess(email: string) {
    if (isDevelopment) {
      await budget.command({ action: "dev-login", email });
      return;
    }
    if (
      await budget.command({
        action: "request-link",
        email,
        ...(invitation ? { invite: inviteToken(invitation) } : {}),
      })
    ) {
      setSentTo(email);
      setCooldown(60);
    }
  }
  return (
    <main className={styles.accountPage}>
      <ThemeToggle className={styles.pageTheme} />
      <Link to="/" className={`${ui.brand} ${styles.pageBrand}`}>
        twogether.
      </Link>
      <section className={styles.accountCard}>
        <div className={styles.accountSymbol}>
          {sentTo ? (
            <Mail size={30} strokeWidth={1.5} />
          ) : (
            <HeartHandshake size={30} strokeWidth={1.5} />
          )}
        </div>
        <p className={`${ui.eyebrow} ${styles.cardEyebrow}`}>DUAS PESSOAS. UM ORÇAMENTO.</p>
        <h1>
          {sentTo && !budget.user
            ? "Confira seu e-mail."
            : budget.user
              ? budget.user.name
                ? `Vamos começar, ${budget.user.name}?`
                : "Como chamamos você?"
              : "A vida a dois.\nAs contas também."}
        </h1>
        <p className={styles.accountIntro}>
          {budget.user
            ? "Tudo compartilhado: contas, transações, tags e as seis metas de vocês."
            : sentTo
              ? `Enviamos seu link para ${sentTo}. Abra o e-mail para continuar.`
              : isDevelopment
                ? "Modo desenvolvimento: informe um e-mail para entrar ou criar uma conta."
                : "Seu e-mail é a única chave. A gente envia um link, você abre e pronto."}
        </p>
        {!budget.user ? (
          <>
            {invitation && (
              <p className={ui.invitationNote}>
                Seu par convidou você. Confirme seu e-mail para compartilhar o
                orçamento.
              </p>
            )}
            {sentTo ? (
              <div className={ui.accountForm}>
                <p className={ui.invitationNote}>
                  O link vale por 15 minutos. Se não encontrar, confira o spam.
                </p>
                <button
                  className={ui.secondaryButton}
                  disabled={budget.busy || cooldown > 0}
                  onClick={() => requestAccess(sentTo)}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </button>
                <button className={ui.textButton} onClick={() => setSentTo("")}>
                  Usar outro e-mail
                </button>
              </div>
            ) : (
              <form
                className={ui.accountForm}
                onSubmit={async (event) => {
                  event.preventDefault();
                  await requestAccess(
                    String(
                      new FormData(event.currentTarget).get("email") ?? "",
                    ).trim(),
                  );
                }}
              >
                <label>
                  Seu e-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="voce@exemplo.com"
                    required
                  />
                </label>
                <button className={ui.primaryButton} disabled={budget.busy}>
                  {budget.busy
                    ? isDevelopment
                      ? "Entrando…"
                      : "Enviando…"
                    : isDevelopment
                      ? "Entrar localmente"
                      : "Receber meu link"}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </>
        ) : !budget.user.name ? (
          <form
            className={ui.accountForm}
            onSubmit={async (event) => {
              event.preventDefault();
              await budget.command({
                action: "profile",
                name: String(
                  new FormData(event.currentTarget).get("name") ?? "",
                ),
              });
            }}
          >
            <label>
              Seu nome
              <input
                name="name"
                autoComplete="given-name"
                maxLength={50}
                placeholder="Como você quer aparecer?"
                required
              />
            </label>
            <button className={ui.primaryButton} disabled={budget.busy}>
              Continuar
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className={ui.accountForm}>
            {invitation ? (
              <>
                <p className={ui.invitationNote}>
                  Ao aceitar, vocês dois poderão ver e editar todo o orçamento.
                </p>
                <button
                  className={ui.primaryButton}
                  disabled={budget.busy}
                  onClick={async () => {
                    if (
                      await budget.command({
                        action: "join",
                        token: inviteToken(invitation),
                      })
                    )
                      clearInvitation();
                  }}
                >
                  {budget.busy ? "Aguarde…" : "Aceitar convite"}
                  <ArrowRight size={18} />
                </button>
                <button
                  className={ui.textButton}
                  onClick={clearInvitation}
                >
                  Usar outro convite ou começar do zero
                </button>
              </>
            ) : (
              <>
                <button
                  className={ui.primaryButton}
                  disabled={budget.busy}
                  onClick={() => budget.command({ action: "create" })}
                >
                  Começar nosso orçamento
                  <ArrowRight size={18} />
                </button>
                <span className={ui.accountDivider}>já recebeu um convite?</span>
                <form
                  className={ui.accountForm}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await budget.command({
                      action: "join",
                      token: inviteToken(
                        String(
                          new FormData(event.currentTarget).get("invite") ?? "",
                        ),
                      ),
                    });
                  }}
                >
                  <label>
                    Link de convite
                    <input
                      name="invite"
                      placeholder="Cole o link do seu par"
                      required
                    />
                  </label>
                  <button className={ui.secondaryButton} disabled={budget.busy}>
                    Aceitar convite
                  </button>
                </form>
              </>
            )}
            <button
              className={ui.textButton}
              disabled={budget.busy}
              onClick={() => budget.command({ action: "logout" })}
            >
              Sair de {budget.user.email}
            </button>
          </div>
        )}
        {budget.error && (
          <p className={ui.formError} role="alert">
            {budget.error}
          </p>
        )}
        <p className={ui.accountFootnote}>
          {isDevelopment
            ? "Modo desenvolvimento: o acesso local não envia e-mail."
            : "Sem senha. Um espaço exclusivo para vocês dois."}
        </p>
      </section>
      <AppFooter className={styles.pageFooter} />
    </main>
  );
}
