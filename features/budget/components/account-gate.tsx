import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake, Mail } from "lucide-react";
import type { BudgetController } from "../hooks/use-budget";
import { inviteToken } from "../services/invite";
import { AppFooter } from "./app-footer";

const isDevelopment = import.meta.env.DEV;

export function AccountGate({ budget }: { budget: BudgetController }) {
  const [invitation, setInvitation] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    const readInvitation = () =>
      setInvitation(
        new URLSearchParams(window.location.hash.slice(1)).get("convite") ?? "",
      );
    readInvitation();
    window.addEventListener("hashchange", readInvitation);
    return () => window.removeEventListener("hashchange", readInvitation);
  }, []);
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
    <main className="account-page">
      <ThemeToggle />
      <Link to="/" className="brand">
        twogether.
      </Link>
      <section className="account-card">
        <div className="account-symbol">
          {sentTo ? (
            <Mail size={30} strokeWidth={1.5} />
          ) : (
            <HeartHandshake size={30} strokeWidth={1.5} />
          )}
        </div>
        <p className="eyebrow">DUAS PESSOAS. UM ORÇAMENTO.</p>
        <h1>
          {budget.accessToken
            ? "Seu espaço está aqui."
            : sentTo && !budget.user
              ? "Confira seu e-mail."
              : budget.user
                ? budget.user.name
                  ? `Vamos começar, ${budget.user.name}?`
                  : "Como chamamos você?"
                : "A vida a dois.\nAs contas também."}
        </h1>
        <p className="account-intro">
          {budget.accessToken
            ? "Confirme para abrir seu orçamento com segurança."
            : budget.user
              ? "Tudo compartilhado: contas, transações, tags e as seis metas de vocês."
              : sentTo
                ? `Enviamos seu link para ${sentTo}. Abra o e-mail para continuar.`
                : isDevelopment
                  ? "Modo desenvolvimento: informe um e-mail para entrar ou criar uma conta."
                  : "Seu e-mail é a única chave. A gente envia um link, você abre e pronto."}
        </p>
        {budget.accessToken ? (
          <div className="account-form">
            <button
              className="primary-button"
              disabled={budget.busy}
              onClick={async () => {
                if (
                  await budget.command({
                    action: "verify-link",
                    token: budget.accessToken,
                  })
                )
                  budget.finishAccess();
              }}
            >
              {budget.busy ? "Aguarde…" : "Continuar"}
              <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              disabled={budget.busy}
              onClick={budget.finishAccess}
            >
              Pedir outro link
            </button>
          </div>
        ) : !budget.user ? (
          <>
            {invitation && (
              <p className="invitation-note">
                Seu par convidou você. Confirme seu e-mail para compartilhar o
                orçamento.
              </p>
            )}
            {sentTo ? (
              <div className="account-form">
                <p className="invitation-note">
                  O link vale por 15 minutos. Se não encontrar, confira o spam.
                </p>
                <button
                  className="secondary-button"
                  disabled={budget.busy || cooldown > 0}
                  onClick={() => requestAccess(sentTo)}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </button>
                <button className="text-button" onClick={() => setSentTo("")}>
                  Usar outro e-mail
                </button>
              </div>
            ) : (
              <form
                className="account-form"
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
                <button className="primary-button" disabled={budget.busy}>
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
            className="account-form"
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
            <button className="primary-button" disabled={budget.busy}>
              Continuar
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="account-form">
            {invitation ? (
              <>
                <p className="invitation-note">
                  Ao aceitar, vocês dois poderão ver e editar todo o orçamento.
                </p>
                <button
                  className="primary-button"
                  disabled={budget.busy}
                  onClick={async () => {
                    if (
                      await budget.command({
                        action: "join",
                        token: inviteToken(invitation),
                      })
                    )
                      window.history.replaceState(
                        null,
                        "",
                        window.location.pathname,
                      );
                  }}
                >
                  {budget.busy ? "Aguarde…" : "Aceitar convite"}
                  <ArrowRight size={18} />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setInvitation("");
                    window.history.replaceState(
                      null,
                      "",
                      window.location.pathname,
                    );
                  }}
                >
                  Usar outro convite ou começar do zero
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  disabled={budget.busy}
                  onClick={() => budget.command({ action: "create" })}
                >
                  Começar nosso orçamento
                  <ArrowRight size={18} />
                </button>
                <span className="account-divider">já recebeu um convite?</span>
                <form
                  className="account-form"
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
                  <button className="secondary-button" disabled={budget.busy}>
                    Aceitar convite
                  </button>
                </form>
              </>
            )}
            <button
              className="text-button"
              disabled={budget.busy}
              onClick={() => budget.command({ action: "logout" })}
            >
              Sair de {budget.user.email}
            </button>
          </div>
        )}
        {budget.error && (
          <p className="form-error" role="alert">
            {budget.error}
          </p>
        )}
        <p className="account-footnote">
          {isDevelopment
            ? "Modo desenvolvimento: o acesso local não envia e-mail."
            : "Sem senha. Um espaço exclusivo para vocês dois."}
        </p>
      </section>
      <AppFooter />
    </main>
  );
}
