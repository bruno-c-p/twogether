import { useCallback, useRef, useState, type FormEvent } from "react";
import { getRouteApi, isRedirect, useRouter } from "@tanstack/react-router";
import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { Copy } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { setName } from "@/features/auth/actions";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { createInvite, revokeInvite } from "@/features/household/actions";
import { MemberList } from "@/features/household/components/member-list/member-list";
import { WorkspaceShell } from "@/features/budget/components/workspace-shell/workspace-shell";
import { formText } from "@/features/budget/domain/format";
import { fieldErrors, nameFormSchema } from "@/features/budget/domain/schemas";
import { isMutationFailure } from "@/server/mutation-result";
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

export function AccountSettings() {
  const { user, household } = contaRoute.useLoaderData();
  const router = useRouter();
  const signOut = useSignOut();
  const posthog = usePostHog();
  const { user: clerkUser } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
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

        setError(
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão. Tente novamente.",
        );

        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  const members = household.members;
  const memberCount = members.length;
  const memberLabel = `${memberCount} ${memberCount === 1 ? "pessoa" : "pessoas"}`;
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = nameFormSchema.safeParse({
      name: formText(new FormData(event.currentTarget), "name"),
    });

    if (!parsed.success) {
      setNameErrors(fieldErrors(parsed.error));

      return;
    }

    setNameErrors({});
    setNotice("");

    const result = await run(() =>
      setName({ data: { name: parsed.data.name } }),
    );

    if (result?.ok) {
      posthog.capture("profile_name_completed");
      setNotice("Nome atualizado.");
    }
  }

  async function makeInvite() {
    const result = await run(() => createInvite());

    if (result?.ok) {
      posthog.capture("household_invite_generated");
      setLink(`${window.location.origin}/convite/${result.inviteToken}`);
      setCopied(false);
      setCopyStatus("");
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyStatus("");
    } catch {
      setCopyStatus("Selecione e copie o link acima.");
    }
  }

  async function cancelInvites() {
    if (await run(() => revokeInvite())) {
      setLink("");
      setCopyStatus("Convites anteriores cancelados.");
    }
  }

  async function leave() {
    posthog.reset();
    await signOut();
  }

  return (
    <WorkspaceShell
      title="Sua conta"
      memberLabel={memberLabel}
      account={<UserButton />}
    >
      <div className="max-w-[720px]">
        <h1>Sua conta</h1>
        <p className="text-text-muted mt-1.5">
          Seu nome, o espaço de vocês e a saída da conta.
        </p>
        <Panel aria-labelledby="account-name-title">
          <SectionHeading
            title="Você"
            titleId="account-name-title"
            description="Como você aparece no orçamento."
          />
          <div className="px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4">
            <Form onSubmit={(event) => void submitName(event)}>
              <label>
                Seu nome
                <input
                  name="name"
                  autoComplete="given-name"
                  maxLength={50}
                  defaultValue={user.name}
                  placeholder="Como você quer aparecer?"
                  required
                  aria-describedby={
                    nameErrors.name ? "account-name-error" : undefined
                  }
                  aria-invalid={nameErrors.name ? true : undefined}
                />
                <FieldError id="account-name-error">
                  {nameErrors.name}
                </FieldError>
              </label>
              <div className="flex items-center gap-4">
                <Button disabled={busy}>Salvar nome</Button>
                {notice && (
                  <p role="status" className="text-text-muted text-[12px]">
                    {notice}
                  </p>
                )}
              </div>
            </Form>
          </div>
        </Panel>
        <Panel aria-labelledby="account-space-title">
          <SectionHeading
            title="Nosso espaço"
            titleId="account-space-title"
            count={memberCount}
            description="Tudo aqui é dos dois. Ambos podem ver e editar contas, transações, tags e percentuais."
          />
          <div className="px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4">
            <MemberList members={members} currentUserId={user.id} />
            {memberCount === 1 ? (
              <FormStack className="mt-5">
                <p>
                  Falta seu par. Gere um convite e compartilhe o link com essa
                  pessoa.
                </p>
                <Button disabled={busy} onClick={() => void makeInvite()}>
                  {link ? "Gerar novo convite" : "Gerar convite"}
                </Button>
                {link && (
                  <>
                    <label>
                      Link para seu par
                      <input
                        readOnly
                        value={link}
                        onFocus={(event) => event.target.select()}
                      />
                    </label>
                    <Button
                      variant="secondary"
                      onClick={() => void copyInvite()}
                    >
                      <Copy size={16} />
                      {copied ? "Link copiado" : "Copiar convite"}
                    </Button>
                    <FieldHint>
                      Expira em 48 horas. Um novo convite invalida o anterior.
                    </FieldHint>
                    {copyStatus && <p role="status">{copyStatus}</p>}
                  </>
                )}
                <Button
                  variant="text"
                  disabled={busy}
                  onClick={() => void cancelInvites()}
                >
                  Cancelar convites pendentes
                </Button>
                {!link && copyStatus && <p role="status">{copyStatus}</p>}
              </FormStack>
            ) : (
              <Note>Vocês dois já estão aqui. O espaço está completo.</Note>
            )}
            {error && <FormError>{error}</FormError>}
          </div>
          <footer className="flex items-center justify-between gap-4 px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4 max-bp620:items-start max-bp620:flex-col">
            <span className="text-text-muted text-[12px] break-all">
              {email}
            </span>
            <Button variant="text" disabled={busy} onClick={() => void leave()}>
              Sair da conta
            </Button>
          </footer>
        </Panel>
      </div>
    </WorkspaceShell>
  );
}
