import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake, Mail } from "lucide-react";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { AppFooter } from "@/features/budget/components/app-footer";
import { Brand } from "@/src/ui/brand";
import { Button } from "@/src/ui/button";
import { FieldHint, Form, FormError, FormStack, Note } from "@/src/ui/field";
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
      <Brand className={styles.pageBrand}>twogether.</Brand>
      <section className={styles.accountCard}>
        <div className={styles.accountSymbol}>
          {sentTo ? (
            <Mail size={30} strokeWidth={1.5} />
          ) : (
            <HeartHandshake size={30} strokeWidth={1.5} />
          )}
        </div>
        <p className={styles.cardEyebrow}>DUAS PESSOAS. UM ORÇAMENTO.</p>
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
              <Note>
                Seu par convidou você. Confirme seu e-mail para compartilhar o
                orçamento.
              </Note>
            )}
            {sentTo ? (
              <FormStack>
                <Note>
                  O link vale por 15 minutos. Se não encontrar, confira o spam.
                </Note>
                <Button
                  variant="secondary"
                  disabled={budget.busy || cooldown > 0}
                  onClick={() => requestAccess(sentTo)}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </Button>
                <Button variant="text" onClick={() => setSentTo("")}>
                  Usar outro e-mail
                </Button>
              </FormStack>
            ) : (
              <Form
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
                <Button disabled={budget.busy}>
                  {budget.busy
                    ? isDevelopment
                      ? "Entrando…"
                      : "Enviando…"
                    : isDevelopment
                      ? "Entrar localmente"
                      : "Receber meu link"}
                  <ArrowRight size={18} />
                </Button>
              </Form>
            )}
          </>
        ) : !budget.user.name ? (
          <Form
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
            <Button disabled={budget.busy}>
              Continuar
              <ArrowRight size={18} />
            </Button>
          </Form>
        ) : (
          <FormStack>
            {invitation ? (
              <>
                <Note>
                  Ao aceitar, vocês dois poderão ver e editar todo o orçamento.
                </Note>
                <Button
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
                </Button>
                <Button variant="text" onClick={clearInvitation}>
                  Usar outro convite ou começar do zero
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={budget.busy}
                  onClick={() => budget.command({ action: "create" })}
                >
                  Começar nosso orçamento
                  <ArrowRight size={18} />
                </Button>
                <span className={styles.divider}>já recebeu um convite?</span>
                <Form
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
                  <Button variant="secondary" disabled={budget.busy}>
                    Aceitar convite
                  </Button>
                </Form>
              </>
            )}
            <Button
              variant="text"
              disabled={budget.busy}
              onClick={() => budget.command({ action: "logout" })}
            >
              Sair de {budget.user.email}
            </Button>
          </FormStack>
        )}
        {budget.error && <FormError>{budget.error}</FormError>}
        <FieldHint>
          {isDevelopment
            ? "Modo desenvolvimento: o acesso local não envia e-mail."
            : "Sem senha. Um espaço exclusivo para vocês dois."}
        </FieldHint>
      </section>
      <AppFooter className={styles.pageFooter} />
    </main>
  );
}
