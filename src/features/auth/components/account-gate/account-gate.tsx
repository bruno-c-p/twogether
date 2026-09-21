import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getRouteApi, isRedirect, useRouter } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake, Mail } from "lucide-react";
import {
  devLogin,
  logout,
  requestLink,
  setName,
} from "@/features/auth/actions";
import {
  createHousehold,
  joinHousehold,
} from "@/features/household/actions";
import { isMutationFailure } from "@/server/mutation-result";
import { inviteToken } from "@/features/auth/invite-token";
import { EmailForm } from "@/features/auth/components/email-form";
import { InviteForm } from "@/features/auth/components/invite-form";
import { NameForm } from "@/features/auth/components/name-form";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import { Brand } from "@/components/ui/brand/brand";
import { Button } from "@/components/ui/button/button";
import {
  FieldHint,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";
import styles from "@/features/auth/components/account-gate/account-gate.module.css";

const isDevelopment = import.meta.env.DEV;
const gateRoute = getRouteApi("/entrar");

function useGate() {
  const router = useRouter();
  const snapshot = gateRoute.useLoaderData();
  const search = gateRoute.useSearch();
  const navigate = gateRoute.useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        const result = await fn();
        if (isMutationFailure(result)) {
          setError(result.message);
          return null;
        }
        await router.invalidate();
        return result;
      } catch (error) {
        if (isRedirect(error)) {
          await router.navigate(router.resolveRedirect(error).options);
          return null;
        }
        const message =
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão. Confira o orçamento antes de tentar novamente.";
        setError(message);
        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [router],
  );
  return {
    user: snapshot.user,
    error,
    busy,
    search,
    navigate,
    run,
  };
}

export function AccountGate() {
  const { user, error, busy, search, navigate, run } = useGate();
  const invitation = search.convite ?? "";
  const clearInvitation = () =>
    void navigate({
      to: "/entrar",
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
      await run(() => devLogin({ data: { email } }));
      return;
    }
    if (
      (await run(() =>
        requestLink({
          data: {
            email,
            ...(invitation ? { invite: inviteToken(invitation) } : {}),
          },
        }),
      )) !== null
    ) {
      setSentTo(email);
      setCooldown(60);
    }
  }
  async function acceptInvitation() {
    await run(() =>
      joinHousehold({
        data: { token: inviteToken(invitation) },
      }),
    );
  }
  async function submitName(name: string) {
    await run(() => setName({ data: { name } }));
  }
  async function joinWithInvite(invite: string) {
    await run(() => joinHousehold({ data: { token: invite } }));
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
          {sentTo && !user
            ? "Confira seu e-mail."
            : user
              ? user.name
                ? `Vamos começar, ${user.name}?`
                : "Como chamamos você?"
              : "A vida a dois.\nAs contas também."}
        </h1>
        <p className={styles.accountIntro}>
          {user
            ? "Tudo compartilhado: contas, transações, tags e as seis metas de vocês."
            : sentTo
              ? `Enviamos seu link para ${sentTo}. Abra o e-mail para continuar.`
              : isDevelopment
                ? "Modo desenvolvimento: informe um e-mail para entrar ou criar uma conta."
                : "Seu e-mail é a única chave. A gente envia um link, você abre e pronto."}
        </p>
        {!user ? (
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
                  disabled={busy || cooldown > 0}
                  onClick={() => void requestAccess(sentTo)}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </Button>
                <Button variant="text" onClick={() => setSentTo("")}>
                  Usar outro e-mail
                </Button>
              </FormStack>
            ) : (
              <EmailForm busy={busy} onRequest={requestAccess} />
            )}
          </>
        ) : !user.name ? (
          <NameForm busy={busy} onSubmit={submitName} />
        ) : (
          <FormStack>
            {invitation ? (
              <>
                <Note>
                  Ao aceitar, vocês dois poderão ver e editar todo o orçamento.
                </Note>
                <Button disabled={busy} onClick={() => void acceptInvitation()}>
                  {busy ? "Aguarde…" : "Aceitar convite"}
                  <ArrowRight size={18} />
                </Button>
                <Button variant="text" onClick={clearInvitation}>
                  Usar outro convite ou começar do zero
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={busy}
                  onClick={() => void run(() => createHousehold())}
                >
                  Começar nosso orçamento
                  <ArrowRight size={18} />
                </Button>
                <span className={styles.divider}>já recebeu um convite?</span>
                <InviteForm busy={busy} onJoin={joinWithInvite} />
              </>
            )}
            <Button
              variant="text"
              disabled={busy}
              onClick={() => void run(() => logout())}
            >
              Sair de {user.email}
            </Button>
          </FormStack>
        )}
        {error && <FormError>{error}</FormError>}
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
