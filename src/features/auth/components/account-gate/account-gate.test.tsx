import { describe, expect, test, vi } from "vitest";
import { AccountGateView } from "@/features/auth/components/account-gate/account-gate";
import { renderWithProviders } from "@/test/render";

const token = "a".repeat(64);

function gateActions() {
  return {
    acceptInvitation: vi.fn(() => Promise.resolve()),
    joinWithInvite: vi.fn((_invite: string) => Promise.resolve()),
    submitName: vi.fn((_name: string) => Promise.resolve()),
    startHousehold: vi.fn(() => Promise.resolve()),
    leave: vi.fn(() => Promise.resolve()),
  };
}

async function renderGate({
  user = null,
  invitation = "",
  isSignedIn = false,
  email = "",
  busy = false,
  error = "",
}: Partial<Parameters<typeof AccountGateView>[0]> = {}) {
  const actions = gateActions();
  const onClearInvitation = vi.fn();

  const view = await renderWithProviders(
    <AccountGateView
      user={user}
      invitation={invitation}
      isSignedIn={isSignedIn}
      email={email}
      busy={busy}
      error={error}
      actions={actions}
      onClearInvitation={onClearInvitation}
      signIn={<p>formulário do Clerk</p>}
    />,
    "/entrar",
  );

  return { ...view, actions, onClearInvitation };
}

describe("AccountGateView", () => {
  test("signed out it shows the Clerk form, with a note for invitations", async () => {
    const { screen } = await renderGate({ invitation: token });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /A vida a dois/,
    );
    expect(screen.getByText("formulário do Clerk")).toBeTruthy();
    expect(screen.getByText(/Seu par convidou você/)).toBeTruthy();
  });

  test("while Clerk finishes signing in it shows a loader instead of the form", async () => {
    const { screen } = await renderGate({ isSignedIn: true });

    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByText("formulário do Clerk")).toBeNull();
  });

  test("a user without a name is asked for one", async () => {
    const { screen, user, actions } = await renderGate({
      user: { id: "ana", name: "" },
    });

    expect(
      screen.getByRole("heading", { name: "Como chamamos você?" }),
    ).toBeTruthy();
    await user.type(screen.getByLabelText(/Seu nome/), "Ana");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(actions.submitName).toHaveBeenCalledWith("Ana");
  });

  test("a named user can start a budget, paste an invite or leave", async () => {
    const { screen, user, actions } = await renderGate({
      user: { id: "ana", name: "Ana" },
      email: "ana@example.com",
      error: "Convite expirado.",
    });

    expect(
      screen.getByRole("heading", { name: "Vamos começar, Ana?" }),
    ).toBeTruthy();
    expect(screen.getByText("Convite expirado.")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Começar nosso orçamento/ }),
    );
    await user.type(
      screen.getByLabelText(/Link de convite/),
      `https://twogether.app/?convite=${token}`,
    );
    await user.click(screen.getByRole("button", { name: "Aceitar convite" }));
    await user.click(
      screen.getByRole("button", { name: "Sair de ana@example.com" }),
    );

    expect(actions.startHousehold).toHaveBeenCalled();
    expect(actions.joinWithInvite).toHaveBeenCalledWith(token);
    expect(actions.leave).toHaveBeenCalled();
  });

  test("with an invitation in the link it offers to accept or start over", async () => {
    const { screen, user, actions, onClearInvitation } = await renderGate({
      user: { id: "ana", name: "Ana" },
      invitation: token,
    });

    await user.click(screen.getByRole("button", { name: /Aceitar convite/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Usar outro convite ou começar do zero",
      }),
    );
    expect(actions.acceptInvitation).toHaveBeenCalled();
    expect(onClearInvitation).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Sair de sua conta" }),
    ).toBeTruthy();
  });

  test("busy disables the actions and says to wait", async () => {
    const { screen } = await renderGate({
      user: { id: "ana", name: "Ana" },
      invitation: token,
      busy: true,
    });

    expect(
      screen.getByRole("button", { name: /Aguarde/ }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
