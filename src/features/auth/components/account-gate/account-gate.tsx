import { useCallback, useEffect, useRef, useState } from "react";
import { getRouteApi, isRedirect, useRouter } from "@tanstack/react-router";
import {
  SignIn,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/tanstack-react-start";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { setName } from "@/features/auth/actions";
import {
  createHousehold,
  joinHousehold,
} from "@/features/household/actions";
import { isMutationFailure } from "@/server/mutation-result";
import { inviteToken } from "@/features/auth/invite-token";
import { InviteForm } from "@/features/auth/components/invite-form";
import { NameForm } from "@/features/auth/components/name-form";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import { LoadingState } from "@/features/budget/components/empty-state/empty-state";
import { Brand } from "@/components/ui/brand/brand";
import { Button } from "@/components/ui/button/button";
import {
  FieldHint,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";
import styles from "@/features/auth/components/account-gate/account-gate.module.css";

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
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const invitation = search.convite ?? "";
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  useEffect(() => {
    if (isSignedIn) void router.invalidate();
  }, [isSignedIn, router]);
  const clearInvitation = () =>
    void navigate({
      to: "/entrar",
      search: (prev) => ({ ...prev, convite: undefined }),
      replace: true,
    });
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
  async function leave() {
    await signOut({ redirectUrl: "/entrar" });
    await router.invalidate();
  }
  return (
    <main className={styles.accountPage}>
      <ThemeToggle className={styles.pageTheme} />
      <Brand className={styles.pageBrand}>twogether.</Brand>
      <section className={styles.accountCard}>
        <div className={styles.accountSymbol}>
          <HeartHandshake size={30} strokeWidth={1.5} />
        </div>
        <p className={styles.cardEyebrow}>DUAS PESSOAS. UM ORÇAMENTO.</p>
        <h1>
          {user
            ? user.name
              ? `Vamos começar, ${user.name}?`
              : "Como chamamos você?"
            : "A vida a dois.\nAs contas também."}
        </h1>
        <p className={styles.accountIntro}>
          {user
            ? "Tudo compartilhado: contas, transações, tags e as seis metas de vocês."
            : "Seu e-mail é a única chave. Sem senha: enviamos um código de acesso."}
        </p>
        {!user ? (
          <>
            {invitation && (
              <Note>
                Seu par convidou você. Entre para compartilhar o orçamento.
              </Note>
            )}
            {isSignedIn ? (
              <LoadingState>Carregando…</LoadingState>
            ) : (
              <SignIn
                routing="hash"
                forceRedirectUrl={
                  invitation ? `/entrar?convite=${invitation}` : "/entrar"
                }
                appearance={{
                  elements: {
                    rootBox: styles.clerkRoot,
                    cardBox: styles.clerkCardBox,
                    card: styles.clerkCard,
                    header: styles.clerkHeader,
                  },
                }}
              />
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
              onClick={() => void leave()}
            >
              Sair de {email || "sua conta"}
            </Button>
          </FormStack>
        )}
        {error && <FormError>{error}</FormError>}
        <FieldHint>Sem senha. Um espaço exclusivo para vocês dois.</FieldHint>
      </section>
      <AppFooter className={styles.pageFooter} />
    </main>
  );
}
