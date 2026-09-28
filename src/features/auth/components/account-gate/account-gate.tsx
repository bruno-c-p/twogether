import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { isRedirect, useNavigate, useRouter } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { SignIn, useAuth, useUser } from "@clerk/tanstack-react-start";
import { ThemeToggle } from "@/features/theme";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { setName } from "@/features/auth/actions";
import type { SessionState } from "@/features/auth/actions/load-session";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { createHousehold, joinHousehold } from "@/features/household/actions";
import { isMutationFailure } from "@/server/mutation-result";
import { failureMessage } from "@/features/budget/hooks/use-mutation";
import { InviteForm } from "@/features/auth/components/invite-form";
import { NameForm } from "@/features/auth/components/name-form";
import { SignInSkeleton } from "@/features/auth/components/sign-in-skeleton";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import { LoadingState } from "@/features/budget/components/empty-state";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import {
  FieldHint,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";
import styles from "@/features/auth/components/account-gate/account-gate.module.css";

const SESSION_SYNC_INTERVAL_MS = 400;

// SAFETY: the TanStack wrapper forwards every prop to Clerk's SignIn, but its
// published types omit the loading fallback, so widen the signature here.
const GateSignIn = SignIn as (
  props: ComponentProps<typeof SignIn> & { fallback?: ReactNode },
) => ReactNode;

export function useGateRun() {
  const router = useRouter();
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
      } catch (cause) {
        if (isRedirect(cause)) {
          await router.navigate(router.resolveRedirect(cause).options);

          return null;
        }

        setError(failureMessage(cause));

        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  return { error, busy, run };
}

type GateUser = SessionState["user"];

const SIGNED_OUT_HEADLINE = "A vida a dois.\nAs contas também.";

function gateHeadline(user: GateUser) {
  if (!user) return SIGNED_OUT_HEADLINE;

  return user.name ? `Vamos começar, ${user.name}?` : "Como chamamos você?";
}

function gateIntro(user: GateUser) {
  return user
    ? "Tudo compartilhado: contas, transações, tags e as seis metas de vocês."
    : "Seu e-mail é a única chave. Sem senha: enviamos um código de acesso.";
}

function SignInStep({
  invitation,
  isSignedIn,
  signIn,
}: {
  invitation: string;
  isSignedIn: boolean | undefined;
  signIn: ReactNode;
}) {
  return (
    <>
      {invitation && (
        <Note>Seu par convidou você. Entre para compartilhar o orçamento.</Note>
      )}
      {isSignedIn ? <LoadingState>Carregando…</LoadingState> : signIn}
    </>
  );
}

function afterAuth(invitation: string) {
  return invitation ? `/convite/${invitation}` : "/entrar";
}

function ClerkSignIn({ invitation }: { invitation: string }) {
  return (
    <GateSignIn
      routing="hash"
      withSignUp
      fallback={<SignInSkeleton />}
      forceRedirectUrl={afterAuth(invitation)}
      signUpForceRedirectUrl={afterAuth(invitation)}
      appearance={{
        elements: {
          rootBox: styles.clerkRoot,
          cardBox: styles.clerkCardBox,
          card: styles.clerkCard,
          header: styles.clerkHeader,
        },
      }}
    />
  );
}

function InvitationChoice({
  busy,
  onAccept,
  onClear,
}: {
  busy: boolean;
  onAccept: () => void;
  onClear: () => void;
}) {
  return (
    <>
      <Note>Ao aceitar, vocês dois poderão ver e editar todo o orçamento.</Note>
      <Button disabled={busy} onClick={onAccept}>
        {busy ? "Aguarde…" : "Aceitar convite"}
        <ArrowRight size={18} />
      </Button>
      <Button variant="text" onClick={onClear}>
        Usar outro convite ou começar do zero
      </Button>
    </>
  );
}

function StartChoice({
  busy,
  onStart,
  onJoin,
}: {
  busy: boolean;
  onStart: () => void;
  onJoin: (invite: string) => Promise<void>;
}) {
  return (
    <>
      <Button disabled={busy} onClick={onStart}>
        Começar nosso orçamento
        <ArrowRight size={18} />
      </Button>
      <span className={styles.divider}>já recebeu um convite?</span>
      <InviteForm busy={busy} onJoin={onJoin} />
    </>
  );
}

function useGateActions(
  run: ReturnType<typeof useGateRun>["run"],
  invitation: string,
) {
  const posthog = usePostHog();
  const signOut = useSignOut();

  async function joinWith(token: string) {
    const result = await run(() => joinHousehold({ data: { token } }));

    if (result) posthog.capture("household_joined");
  }

  async function submitName(name: string) {
    const result = await run(() => setName({ data: { name } }));

    if (result) posthog.capture("profile_name_completed");
  }

  async function startHousehold() {
    const result = await run(() => createHousehold());

    if (result) posthog.capture("household_created");
  }

  async function leave() {
    posthog.reset();
    await signOut();
  }

  return {
    acceptInvitation: () => joinWith(invitation),
    joinWithInvite: joinWith,
    submitName,
    startHousehold,
    leave,
  };
}

type GateActions = ReturnType<typeof useGateActions>;

export function AccountGateView({
  user,
  invitation,
  isSignedIn,
  email,
  busy,
  error,
  actions,
  onClearInvitation,
  signIn,
}: {
  user: GateUser;
  invitation: string;
  isSignedIn: boolean | undefined;
  email: string;
  busy: boolean;
  error: string;
  actions: Pick<
    GateActions,
    | "acceptInvitation"
    | "joinWithInvite"
    | "submitName"
    | "startHousehold"
    | "leave"
  >;
  onClearInvitation: () => void;
  signIn: ReactNode;
}) {
  return (
    <main className={styles.accountPage}>
      <ThemeToggle className={styles.pageTheme} />
      <Brand className={styles.pageBrand}>twogether.</Brand>
      <section className={styles.accountCard}>
        <div className={styles.accountSymbol}>
          <HeartHandshake size={30} strokeWidth={1.5} />
        </div>
        <p className={styles.cardEyebrow}>DUAS PESSOAS. UM ORÇAMENTO.</p>
        <h1>{gateHeadline(user)}</h1>
        <p className={styles.accountIntro}>{gateIntro(user)}</p>
        {!user && (
          <SignInStep
            invitation={invitation}
            isSignedIn={isSignedIn}
            signIn={signIn}
          />
        )}
        {user && !user.name && (
          <NameForm busy={busy} onSubmit={actions.submitName} />
        )}
        {user?.name && (
          <FormStack>
            {invitation ? (
              <InvitationChoice
                busy={busy}
                onAccept={() => void actions.acceptInvitation()}
                onClear={onClearInvitation}
              />
            ) : (
              <StartChoice
                busy={busy}
                onStart={() => void actions.startHousehold()}
                onJoin={actions.joinWithInvite}
              />
            )}
            <Button
              variant="text"
              disabled={busy}
              onClick={() => void actions.leave()}
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

export function AccountGate({
  session,
  invite = "",
}: {
  session: SessionState;
  invite?: string;
}) {
  const { error, busy, run } = useGateRun();
  const user = session.user;
  const router = useRouter();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const invitation = invite;
  const actions = useGateActions(run, invitation);

  // Clerk signs in before the server session exists; poll until it does.
  useEffect(() => {
    if (!isSignedIn || user) return;

    void router.invalidate();

    const timer = setInterval(
      () => void router.invalidate(),
      SESSION_SYNC_INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [isSignedIn, router, user]);

  return (
    <AccountGateView
      user={user}
      invitation={invitation}
      isSignedIn={isSignedIn}
      email={clerkUser?.primaryEmailAddress?.emailAddress ?? ""}
      busy={busy}
      error={error}
      actions={actions}
      onClearInvitation={() => void navigate({ to: "/entrar" })}
      signIn={<ClerkSignIn invitation={invitation} />}
    />
  );
}
