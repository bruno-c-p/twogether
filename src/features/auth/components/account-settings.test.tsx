import { describe, expect, test, vi } from "vitest";
import {
  AccountSettingsView,
  useInviteLink,
  useNameForm,
} from "@/features/auth/components/account-settings";
import { useActionRun } from "@/features/auth/hooks/use-action-run";
import type { Member } from "@/features/budget/domain/types";
import type { MutationResult } from "@/server/mutation-result";
import { renderWithProviders } from "@/test/render";

const ana: Member = { id: "ana", name: "Ana" };

const bia: Member = { id: "bia", name: "Bia" };

type Calls = {
  saveName: (name: string) => Promise<MutationResult>;
  create: () => Promise<MutationResult<{ inviteToken: string }>>;
  revoke: () => Promise<MutationResult>;
};

function fakeCalls(overrides: Partial<Calls> = {}): Calls {
  return {
    saveName: vi.fn<Calls["saveName"]>(() => Promise.resolve({ ok: true })),
    create: vi.fn<Calls["create"]>(() =>
      Promise.resolve({ ok: true, inviteToken: "tok123" }),
    ),
    revoke: vi.fn<Calls["revoke"]>(() => Promise.resolve({ ok: true })),
    ...overrides,
  };
}

function Page({
  calls,
  members,
  onSaved,
  onCreated,
  onLeave,
}: {
  calls: Calls;
  members: Member[];
  onSaved: () => void;
  onCreated: () => void;
  onLeave: () => void;
}) {
  const { run, busy, error } = useActionRun("Sem conexão. Tente novamente.");
  const name = useNameForm({ run, saveName: calls.saveName, onSaved });

  const invite = useInviteLink({
    run,
    create: calls.create,
    revoke: calls.revoke,
    onCreated,
  });

  return (
    <AccountSettingsView
      user={ana}
      members={members}
      email="ana@example.com"
      busy={busy}
      error={error}
      name={name}
      invite={invite}
      onLeave={onLeave}
    />
  );
}

async function renderPage({
  calls = fakeCalls(),
  members = [ana],
}: { calls?: Calls; members?: Member[] } = {}) {
  const spies = { onSaved: vi.fn(), onCreated: vi.fn(), onLeave: vi.fn() };

  const view = await renderWithProviders(
    <Page calls={calls} members={members} {...spies} />,
    "/conta",
  );

  return { ...view, calls, ...spies };
}

describe("AccountSettings", () => {
  test("renames the person and confirms it", async () => {
    const { screen, user, calls, onSaved } = await renderPage();
    const input = screen.getByLabelText(/Seu nome/);

    expect(input).toHaveProperty("value", "Ana");
    await user.clear(input);
    await user.type(input, "Ana Paula");
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));

    expect(await screen.findByText("Nome atualizado.")).toBeTruthy();
    expect(calls.saveName).toHaveBeenCalledWith("Ana Paula");
    expect(onSaved).toHaveBeenCalled();
  });

  test("rejects a blank name without calling the server", async () => {
    const { screen, user, calls, container } = await renderPage();
    const input = screen.getByLabelText(/Seu nome/);

    await user.clear(input);
    await user.type(input, "   ");
    container.ownerDocument.querySelector("form")?.requestSubmit();

    const error = await screen.findByRole("alert");

    expect(error.id).toBe("account-name-error");
    expect(calls.saveName).not.toHaveBeenCalled();
  });

  test("shows the server's message when saving fails", async () => {
    const { screen, user, onSaved } = await renderPage({
      calls: fakeCalls({
        saveName: () =>
          Promise.resolve({
            ok: false,
            code: "invalid",
            message: "Nome inválido.",
          }),
      }),
    });

    await user.click(screen.getByRole("button", { name: "Salvar nome" }));

    expect(await screen.findByText("Nome inválido.")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("generates, copies and cancels an invite link", async () => {
    const { screen, user, calls, onCreated } = await renderPage();

    await user.click(screen.getByRole("button", { name: "Gerar convite" }));

    const link = await screen.findByLabelText("Link para seu par");

    expect(link).toHaveProperty(
      "value",
      `${window.location.origin}/convite/tok123`,
    );
    expect(onCreated).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Copiar convite" }));
    expect(
      await screen.findByRole("button", { name: "Link copiado" }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Cancelar convites pendentes" }),
    );
    expect(
      await screen.findByText("Convites anteriores cancelados."),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Link para seu par")).toBeNull();
    expect(calls.revoke).toHaveBeenCalled();
  });

  test("asks to copy by hand when the clipboard is unavailable", async () => {
    const { screen, user } = await renderPage();

    await user.click(screen.getByRole("button", { name: "Gerar convite" }));
    await screen.findByLabelText("Link para seu par");
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    await user.click(screen.getByRole("button", { name: "Copiar convite" }));

    expect(
      await screen.findByText("Selecione e copie o link acima."),
    ).toBeTruthy();
  });

  test("a failed invite shows the error and no link", async () => {
    const { screen, user, onCreated } = await renderPage({
      calls: fakeCalls({
        create: () =>
          Promise.resolve({
            ok: false,
            code: "limited",
            message: "Muitos convites.",
          }),
      }),
    });

    await user.click(screen.getByRole("button", { name: "Gerar convite" }));

    expect(await screen.findByText("Muitos convites.")).toBeTruthy();
    expect(screen.queryByLabelText("Link para seu par")).toBeNull();
    expect(onCreated).not.toHaveBeenCalled();
  });

  test("a full couple sees no invite and can leave", async () => {
    const { screen, user, onLeave } = await renderPage({ members: [ana, bia] });

    expect(
      screen.getByText("Vocês dois já estão aqui. O espaço está completo."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gerar convite" })).toBeNull();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Sair da conta" }));
    expect(onLeave).toHaveBeenCalled();
  });
});
