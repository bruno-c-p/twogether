import type { ComponentProps, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { SignIn, useAuth, useUser } from "@clerk/tanstack-react-start";
import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import { authActions } from "@/features/auth/actions";
import type { SessionState } from "@/features/auth/actions/load-session";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import {
  useActionRun,
  type ActionRun,
} from "@/features/auth/hooks/use-action-run";
import { householdActions } from "@/features/household";
import { InviteForm } from "@/features/auth/components/invite-form";
import { NameForm } from "@/features/auth/components/name-form";
import { SignInSkeleton } from "@/features/auth/components/sign-in-skeleton";
import { AppFooter } from "@/components/ui/app-footer/app-footer";
import { Brand } from "@/components/ui/brand";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/glaze/ui/alert";
import { Button } from "@/components/glaze/ui/button";
import { Card, CardContent } from "@/components/glaze/ui/card";
import { FieldDescription, FieldSeparator } from "@/components/glaze/ui/field";
import { Icon, ArrowRight } from "@/components/glaze/icon";
import { preloadClerkUI } from "@/lib/clerk-ui";
import { useBrowserSync } from "@/lib/use-browser-sync";

const SESSION_SYNC_INTERVAL_MS = 400;

// SAFETY: the TanStack wrapper forwards every prop to Clerk's SignIn, but its
// published types omit the loading fallback, so widen the signature here.
const GateSignIn = SignIn as (
  props: ComponentProps<typeof SignIn> & { fallback?: ReactNode },
) => ReactNode;

type GateUser = SessionState["user"];

const SIGNED_OUT_HEADLINE = "A vida a dois.\nAs contas também.";

function gateHeadline(user: GateUser) {
  if (!user) return SIGNED_OUT_HEADLINE;

  return user.name ? `Vamos começar, ${user.name}?` : "Como chamamos você?";
}

function gateIntro(user: GateUser) {
  return user
    ? "Tudo compartilhado: transações e as seis metas de vocês."
    : "Seu e-mail é a única chave. Sem senha: enviamos um código de acesso.";
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Alert announce={false}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
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
      {isSignedIn ? (
        <p
          aria-live="polite"
          className="py-10 text-center type-body text-text-2"
        >
          Carregando…
        </p>
      ) : (
        signIn
      )}
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
          rootBox: "w-full",
          cardBox: "w-full border-0 bg-transparent overflow-visible",
          card: "p-0 border-0 bg-transparent",
          header: "hidden",
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
      <Button pending={busy} pendingLabel="Aguarde" onClick={onAccept}>
        Aceitar convite
        <Icon icon={ArrowRight} />
      </Button>
      <Button variant="ghost" onClick={onClear}>
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
        <Icon icon={ArrowRight} />
      </Button>
      <FieldSeparator>já recebeu um convite?</FieldSeparator>
      <InviteForm busy={busy} onJoin={onJoin} />
    </>
  );
}

function useGateActions(run: ActionRun, invitation: string) {
  const signOut = useSignOut();

  async function joinWith(token: string) {
    await run(() => householdActions.joinHousehold({ data: { token } }));
  }

  async function submitName(name: string) {
    await run(() => authActions.setName({ data: { name } }));
  }

  async function startHousehold() {
    await run(() => householdActions.createHousehold());
  }

  return {
    acceptInvitation: () => joinWith(invitation),
    joinWithInvite: joinWith,
    submitName,
    startHousehold,
    leave: signOut,
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
  actions: GateActions;
  onClearInvitation: () => void;
  signIn: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center gap-6 bg-page px-4 py-6 text-text-1 sm:gap-8 sm:px-5 sm:py-10">
      <ThemeToggle />
      <Brand>twogether.</Brand>
      <Card
        role="group"
        aria-labelledby="account-gate-title"
        className="w-full max-w-md"
      >
        <CardContent className="flex flex-col gap-6 p-6 max-sm:p-4">
          <div className="flex flex-col gap-2">
            <h1
              id="account-gate-title"
              className="type-title whitespace-pre-line [overflow-wrap:anywhere]"
            >
              {gateHeadline(user)}
            </h1>
            <p className="type-body text-text-2">{gateIntro(user)}</p>
          </div>
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
            <div className="flex flex-col gap-4">
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
                variant="ghost"
                disabled={busy}
                onClick={() => void actions.leave()}
              >
                {`Sair de ${email || "sua conta"}`}
              </Button>
            </div>
          )}
          {error && (
            <Alert status="fail">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          <FieldDescription>
            Sem senha. Um espaço exclusivo para vocês dois.
          </FieldDescription>
        </CardContent>
      </Card>
      <AppFooter className="mt-auto w-full max-w-md px-0" />
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
  const { error, busy, run } = useActionRun();
  const user = session.user;
  const router = useRouter();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();

  // The sign-in form is Clerk's UI; fetch it alongside clerk-js.
  useBrowserSync(
    ["clerk-ui"],
    () => void preloadClerkUI().catch(() => undefined),
    !user,
  );
  const actions = useGateActions(run, invite);

  // Clerk signs in before the server session exists; poll until it does.
  useQuery({
    queryKey: ["session-sync"],
    queryFn: async () => {
      await router.invalidate();

      return null;
    },
    enabled: Boolean(isSignedIn) && !user,
    refetchInterval: SESSION_SYNC_INTERVAL_MS,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  return (
    <AccountGateView
      user={user}
      invitation={invite}
      isSignedIn={isSignedIn}
      email={clerkUser?.primaryEmailAddress?.emailAddress ?? ""}
      busy={busy}
      error={error}
      actions={actions}
      onClearInvitation={() => void navigate({ to: "/entrar" })}
      signIn={<ClerkSignIn invitation={invite} />}
    />
  );
}
