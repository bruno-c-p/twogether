import { preloadClerkUI } from "@/lib/clerk-ui";
import { useBrowserSync } from "@/lib/use-browser-sync";
import { useUser } from "@clerk/tanstack-react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authActions } from "@/features/auth/actions";
import type { AuthActions } from "@/features/auth/actions/mutations";
import { NameForm } from "@/features/auth/components/name-form";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import {
  useActionRun,
  type ActionRun,
} from "@/features/auth/hooks/use-action-run";
import { householdActions, type HouseholdActions } from "@/features/household";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { workspaceQueryKey, type Member } from "@/features/budget";
import { SettingsSection } from "@/features/auth/components/settings-section";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/glaze/ui/alert";
import { Button } from "@/components/glaze/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSeparator,
} from "@/components/glaze/ui/field";
import { Input } from "@/components/glaze/ui/input";
import { Icon, Copy } from "@/components/glaze/icon";

const OFFLINE_MESSAGE = "Sem conexão. Tente novamente.";

// The confirmation shows once the name is saved and goes when the next
// save starts.
export function useNameForm({
  run,
  saveName,
  onSaved,
}: {
  run: ActionRun;
  saveName: (name: string) => ReturnType<AuthActions["setName"]>;
  onSaved: () => void;
}) {
  const save = useMutation({
    mutationFn: (name: string) => run(() => saveName(name)),
    onSuccess: (result) => {
      if (result) onSaved();
    },
  });

  return {
    notice: save.data ? "Nome atualizado." : "",
    save: async (name: string) => {
      await save.mutateAsync(name);
    },
  };
}

export type NameFormState = ReturnType<typeof useNameForm>;

// The link comes from the last invite created; cancelling the pending
// invites, or a new invite, clears what the earlier steps reported.
export function useInviteLink({
  run,
  create,
  revoke,
  onCreated,
}: {
  run: ActionRun;
  create: () => ReturnType<HouseholdActions["createInvite"]>;
  revoke: () => ReturnType<HouseholdActions["revokeInvite"]>;
  onCreated: () => void;
}) {
  const copy = useMutation({
    mutationFn: (link: string) => navigator.clipboard.writeText(link),
  });

  const cancel = useMutation({
    mutationFn: () => run(revoke),
    onSuccess: (result) => {
      if (!result) return;
      invite.reset();
      copy.reset();
    },
  });

  // Resolves to the shareable link, or null when the invite failed.
  const invite = useMutation({
    mutationFn: async () => {
      const result = await run(create);

      return result
        ? `${window.location.origin}/convite/${result.data.inviteToken}`
        : null;
    },
    onSuccess: (created) => {
      if (!created) return;
      onCreated();
      copy.reset();
      cancel.reset();
    },
  });

  const link = invite.data ?? "";

  function status() {
    if (copy.isError) return "Selecione e copie o link acima.";

    return cancel.data ? "Convites anteriores cancelados." : "";
  }

  return {
    link,
    copied: copy.isSuccess,
    status: status(),
    makeInvite: async () => {
      await invite.mutateAsync();
    },
    copyInvite: async () => {
      await copy.mutateAsync(link).catch(() => undefined);
    },
    cancelInvites: async () => {
      await cancel.mutateAsync();
    },
  };
}

export type InviteLinkState = ReturnType<typeof useInviteLink>;

function NameSection({
  name,
  defaultName,
  busy,
}: {
  name: NameFormState;
  defaultName: string;
  busy: boolean;
}) {
  return (
    <SettingsSection
      id="account-name-title"
      title="Você"
      description="Como você aparece no orçamento."
    >
      <NameForm
        busy={busy}
        defaultName={defaultName}
        submitLabel="Salvar nome"
        status={name.notice}
        onSubmit={name.save}
      />
    </SettingsSection>
  );
}

function SharedLink({ invite }: { invite: InviteLinkState }) {
  return (
    <>
      <Field>
        <FieldLabel>Link para seu par</FieldLabel>
        <Input
          readOnly
          mono
          value={invite.link}
          onFocus={(event) => event.target.select()}
        />
        <FieldDescription>
          Expira em 48 horas. Um novo convite invalida o anterior.
        </FieldDescription>
      </Field>
      <Button variant="secondary" onClick={() => void invite.copyInvite()}>
        <Icon icon={Copy} />
        {invite.copied ? "Link copiado" : "Copiar convite"}
      </Button>
      {invite.status && (
        <p role="status" className="type-body-sm text-text-2">
          {invite.status}
        </p>
      )}
    </>
  );
}

function InvitePanel({
  invite,
  busy,
}: {
  invite: InviteLinkState;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-body-sm">
        Falta seu par. Gere um convite e compartilhe o link com essa pessoa.
      </p>
      <Button disabled={busy} onClick={() => void invite.makeInvite()}>
        {invite.link ? "Gerar novo convite" : "Gerar convite"}
      </Button>
      {invite.link && <SharedLink invite={invite} />}
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => void invite.cancelInvites()}
      >
        Cancelar convites pendentes
      </Button>
      {!invite.link && invite.status && (
        <p role="status" className="type-body-sm text-text-2">
          {invite.status}
        </p>
      )}
    </div>
  );
}

export function AccountSettingsView({
  user,
  members,
  email,
  busy,
  error,
  name,
  invite,
  onLeave,
  onManage,
}: {
  user: Member;
  members: Member[];
  email: string;
  busy: boolean;
  error: string;
  name: NameFormState;
  invite: InviteLinkState;
  onLeave: () => void;
  onManage: () => void;
}) {
  const memberCount = members.length;

  return (
    <>
      <FieldSeparator />
      <NameSection name={name} defaultName={user.name} busy={busy} />
      <FieldSeparator />
      <SettingsSection
        id="account-space-title"
        title="Nosso espaço"
        count={memberCount}
        description="Tudo aqui é dos dois. Ambos podem ver e editar transações e percentuais."
      >
        <MemberList members={members} currentUserId={user.id} />
        {memberCount === 1 ? (
          <InvitePanel invite={invite} busy={busy} />
        ) : (
          <Alert announce={false}>
            <AlertDescription>
              Vocês dois já estão aqui. O espaço está completo.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert status="fail">
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
      </SettingsSection>
      <FieldSeparator />
      <div className="flex flex-col gap-2">
        <span className="type-body-sm text-text-2 break-all">{email}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onManage}>
            Gerenciar conta
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onLeave}>
            Sair da conta
          </Button>
        </div>
      </div>
    </>
  );
}

export function AccountSettings({
  user,
  members,
  onManage,
}: {
  user: Member;
  members: Member[];
  onManage: () => void;
}) {
  const signOut = useSignOut();
  const queryClient = useQueryClient();

  // The drawer is open: "Gerenciar conta" may open Clerk's profile modal next.
  useBrowserSync(
    ["clerk-ui"],
    () => void preloadClerkUI().catch(() => undefined),
  );
  const { user: clerkUser } = useUser();
  const { run, busy, error } = useActionRun(OFFLINE_MESSAGE);

  const name = useNameForm({
    run,
    saveName: (value) => authActions.setName({ data: { name: value } }),
    onSaved: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const invite = useInviteLink({
    run,
    create: () => householdActions.createInvite(),
    revoke: () => householdActions.revokeInvite(),
    onCreated: () => undefined,
  });

  return (
    <AccountSettingsView
      user={user}
      members={members}
      email={clerkUser?.primaryEmailAddress?.emailAddress ?? ""}
      busy={busy}
      error={error}
      name={name}
      invite={invite}
      onLeave={() => void signOut()}
      onManage={onManage}
    />
  );
}
