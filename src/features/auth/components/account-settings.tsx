import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { setName } from "@/features/auth/actions";
import { NameForm } from "@/features/auth/components/name-form";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import {
  useActionRun,
  type ActionRun,
} from "@/features/auth/hooks/use-action-run";
import { createInvite, revokeInvite } from "@/features/household/actions";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { workspaceQueryKey } from "@/features/budget/workspace";
import type { Member } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import {
  FieldHint,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";

const OFFLINE_MESSAGE = "Sem conexão. Tente novamente.";

const PANEL_BODY = "px-6 pb-6 max-bp620:px-4 max-bp620:pb-4";

export function useNameForm({
  run,
  saveName,
  onSaved,
}: {
  run: ActionRun;
  saveName: (name: string) => ReturnType<typeof setName>;
  onSaved: () => void;
}) {
  const [notice, setNotice] = useState("");

  async function save(name: string) {
    setNotice("");

    if (!(await run(() => saveName(name)))) return;

    onSaved();
    setNotice("Nome atualizado.");
  }

  return { notice, save };
}

export type NameFormState = ReturnType<typeof useNameForm>;

export function useInviteLink({
  run,
  create,
  revoke,
  onCreated,
}: {
  run: ActionRun;
  create: () => ReturnType<typeof createInvite>;
  revoke: () => ReturnType<typeof revokeInvite>;
  onCreated: () => void;
}) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  async function makeInvite() {
    const result = await run(create);

    if (!result) return;

    onCreated();
    setLink(`${window.location.origin}/convite/${result.data.inviteToken}`);
    setCopied(false);
    setStatus("");
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setStatus("");
    } catch {
      setStatus("Selecione e copie o link acima.");
    }
  }

  async function cancelInvites() {
    if (!(await run(revoke))) return;

    setLink("");
    setStatus("Convites anteriores cancelados.");
  }

  return { link, copied, status, makeInvite, copyInvite, cancelInvites };
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
    <Panel aria-labelledby="account-name-title">
      <SectionHeading
        title="Você"
        titleId="account-name-title"
        description="Como você aparece no orçamento."
      />
      <div className={PANEL_BODY}>
        <NameForm
          busy={busy}
          defaultName={defaultName}
          submitLabel="Salvar nome"
          status={name.notice}
          onSubmit={name.save}
        />
      </div>
    </Panel>
  );
}

function SharedLink({ invite }: { invite: InviteLinkState }) {
  return (
    <>
      <label>
        Link para seu par
        <Input
          readOnly
          value={invite.link}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <Button variant="secondary" onClick={() => void invite.copyInvite()}>
        <Copy size={16} />
        {invite.copied ? "Link copiado" : "Copiar convite"}
      </Button>
      <FieldHint>
        Expira em 48 horas. Um novo convite invalida o anterior.
      </FieldHint>
      {invite.status && <p role="status">{invite.status}</p>}
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
    <FormStack className="mt-5">
      <p>
        Falta seu par. Gere um convite e compartilhe o link com essa pessoa.
      </p>
      <Button disabled={busy} onClick={() => void invite.makeInvite()}>
        {invite.link ? "Gerar novo convite" : "Gerar convite"}
      </Button>
      {invite.link && <SharedLink invite={invite} />}
      <Button
        variant="text"
        disabled={busy}
        onClick={() => void invite.cancelInvites()}
      >
        Cancelar convites pendentes
      </Button>
      {!invite.link && invite.status && <p role="status">{invite.status}</p>}
    </FormStack>
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
      <NameSection name={name} defaultName={user.name} busy={busy} />
      <Panel aria-labelledby="account-space-title">
        <SectionHeading
          title="Nosso espaço"
          titleId="account-space-title"
          count={memberCount}
          description="Tudo aqui é dos dois. Ambos podem ver e editar transações, tags e percentuais."
        />
        <div className={PANEL_BODY}>
          <MemberList members={members} currentUserId={user.id} />
          {memberCount === 1 ? (
            <InvitePanel invite={invite} busy={busy} />
          ) : (
            <Note>Vocês dois já estão aqui. O espaço está completo.</Note>
          )}
          {error && <FormError>{error}</FormError>}
        </div>
        <footer className="flex items-center justify-between gap-4 px-6 pb-6 max-bp620:px-4 max-bp620:pb-4 max-bp620:items-start max-bp620:flex-col">
          <span className="text-text-muted text-xs break-all">{email}</span>
          <div className="flex items-center gap-4">
            <Button variant="text" onClick={onManage}>
              Gerenciar conta
            </Button>
            <Button variant="text" disabled={busy} onClick={onLeave}>
              Sair da conta
            </Button>
          </div>
        </footer>
      </Panel>
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
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const { run, busy, error } = useActionRun(OFFLINE_MESSAGE);

  const name = useNameForm({
    run,
    saveName: (value) => setName({ data: { name: value } }),
    onSaved: () => {
      posthog.capture("profile_name_completed");
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const invite = useInviteLink({
    run,
    create: () => createInvite(),
    revoke: () => revokeInvite(),
    onCreated: () => posthog.capture("household_invite_generated"),
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
