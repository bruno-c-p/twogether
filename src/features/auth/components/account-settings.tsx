import { useState, type FormEvent, type ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { Copy } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { setName } from "@/features/auth/actions";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import {
  useActionRun,
  type ActionRun,
} from "@/features/auth/hooks/use-action-run";
import { createInvite, revokeInvite } from "@/features/household/actions";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell/workspace-shell";
import { formText } from "@/features/budget/domain/format";
import { fieldErrors, nameFormSchema } from "@/features/budget/domain/schemas";
import type { Member } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import {
  FieldError,
  FieldHint,
  Form,
  FormError,
  FormStack,
  Note,
} from "@/components/ui/field/field";

const contaRoute = getRouteApi("/_authenticated/conta");

const OFFLINE_MESSAGE = "Sem conexão. Tente novamente.";

const PANEL_BODY = "px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4";

export function useNameForm({
  run,
  saveName,
  onSaved,
}: {
  run: ActionRun;
  saveName: (name: string) => ReturnType<typeof setName>;
  onSaved: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = nameFormSchema.safeParse({
      name: formText(new FormData(event.currentTarget), "name"),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));

      return;
    }

    setErrors({});
    setNotice("");

    const result = await run(() => saveName(parsed.data.name));

    if (!result?.ok) return;

    onSaved();
    setNotice("Nome atualizado.");
  }

  return { errors, notice, submit };
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

    if (!result?.ok) return;

    onCreated();
    setLink(`${window.location.origin}/convite/${result.inviteToken}`);
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
        <Form onSubmit={(event) => void name.submit(event)}>
          <label>
            Seu nome
            <input
              name="name"
              autoComplete="given-name"
              maxLength={50}
              defaultValue={defaultName}
              placeholder="Como você quer aparecer?"
              required
              aria-describedby={
                name.errors.name ? "account-name-error" : undefined
              }
              aria-invalid={name.errors.name ? true : undefined}
            />
            <FieldError id="account-name-error">{name.errors.name}</FieldError>
          </label>
          <div className="flex items-center gap-4">
            <Button disabled={busy}>Salvar nome</Button>
            {name.notice && (
              <p role="status" className="text-text-muted text-[12px]">
                {name.notice}
              </p>
            )}
          </div>
        </Form>
      </div>
    </Panel>
  );
}

function SharedLink({ invite }: { invite: InviteLinkState }) {
  return (
    <>
      <label>
        Link para seu par
        <input
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
  account,
}: {
  user: Member;
  members: Member[];
  email: string;
  busy: boolean;
  error: string;
  name: NameFormState;
  invite: InviteLinkState;
  onLeave: () => void;
  account?: ReactNode;
}) {
  const memberCount = members.length;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;

  return (
    <WorkspaceShell
      title="Sua conta"
      memberLabel={memberLabel}
      account={account}
    >
      <div className="max-w-[720px]">
        <h1>Sua conta</h1>
        <p className="text-text-muted mt-1.5">
          Seu nome, o espaço de vocês e a saída da conta.
        </p>
        <NameSection name={name} defaultName={user.name} busy={busy} />
        <Panel aria-labelledby="account-space-title">
          <SectionHeading
            title="Nosso espaço"
            titleId="account-space-title"
            count={memberCount}
            description="Tudo aqui é dos dois. Ambos podem ver e editar contas, transações, tags e percentuais."
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
          <footer className="flex items-center justify-between gap-4 px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4 max-bp620:items-start max-bp620:flex-col">
            <span className="text-text-muted text-[12px] break-all">
              {email}
            </span>
            <Button variant="text" disabled={busy} onClick={onLeave}>
              Sair da conta
            </Button>
          </footer>
        </Panel>
      </div>
    </WorkspaceShell>
  );
}

export function AccountSettings() {
  const { user, household } = contaRoute.useLoaderData();
  const signOut = useSignOut();
  const posthog = usePostHog();
  const { user: clerkUser } = useUser();
  const { run, busy, error } = useActionRun(OFFLINE_MESSAGE);

  const name = useNameForm({
    run,
    saveName: (value) => setName({ data: { name: value } }),
    onSaved: () => posthog.capture("profile_name_completed"),
  });

  const invite = useInviteLink({
    run,
    create: () => createInvite(),
    revoke: () => revokeInvite(),
    onCreated: () => posthog.capture("household_invite_generated"),
  });

  async function leave() {
    posthog.reset();
    await signOut();
  }

  return (
    <AccountSettingsView
      user={user}
      members={household.members}
      email={clerkUser?.primaryEmailAddress?.emailAddress ?? ""}
      busy={busy}
      error={error}
      name={name}
      invite={invite}
      onLeave={() => void leave()}
      account={<UserButton />}
    />
  );
}
