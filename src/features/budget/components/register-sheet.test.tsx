import { describe, expect, test, vi } from "vitest";
import { RegisterSheet } from "@/features/budget/components/register-sheet";
import { parsePhrase, type PhraseDraft } from "@/features/budget/domain/phrase";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import { ana, nubank } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const itau: BankAccount = { id: "itau", name: "Itaú", openingBalance: 0 };

const bia = { ...ana, id: "bia", name: "Bia" };

const today = new Date(2026, 8, 28);

const summary = {
  income: 850000,
  goals: [{ id: "fixed" as const, amount: 271240 }],
};

const plans = [
  { id: "fixed" as const, planned: 255000 },
  { id: "pleasure" as const, planned: 85000 },
];

function draftFor(text: string, accounts = [nubank, itau]): PhraseDraft {
  const result = parsePhrase(text, accounts, today);

  if ("error" in result) throw new Error(result.error);

  return result.draft;
}

function setup({
  phrase = "Gastei 300 reais de condomínio",
  members = [ana, bia],
  accounts = [nubank, itau],
  initialDraft = draftFor(phrase, accounts),
}: {
  phrase?: string;
  members?: (typeof ana)[];
  accounts?: BankAccount[];
  initialDraft?: PhraseDraft;
} = {}) {
  const onSave = vi.fn<(t: Transaction, n?: number) => Promise<boolean>>(() =>
    Promise.resolve(true),
  );

  const onClose = vi.fn();
  const onManual = vi.fn();

  const view = renderPlain(
    <RegisterSheet
      initialDraft={initialDraft}
      today="2026-09-28"
      month="2026-09"
      accounts={accounts}
      members={members}
      currentUserId="ana"
      summary={summary}
      plans={plans}
      serverError=""
      onSave={onSave}
      onManual={onManual}
      onClose={onClose}
    />,
  );

  return { ...view, onSave, onClose, onManual };
}

describe("RegisterSheet", () => {
  test("shows the phrase, the date and the over-plan impact", () => {
    const { screen } = setup();

    expect(
      screen.getByRole("dialog", { name: "Registrar transação" }),
    ).toBeTruthy();
    expect(screen.getByText("Gastei 300 reais de condomínio")).toBeTruthy();
    expect(screen.getByText(/Hoje, 28 set/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(
      /Custo fixo fica R\$\s*462,40 acima do planejado\./,
    );
  });

  test("confirm needs a goal, then saves the edited transaction", async () => {
    const { screen, user, onSave, onClose } = setup({
      phrase: "Jantar de 180 no Itaú",
    });

    const confirm = () => screen.getByRole("button", { name: /^Confirmar/ });

    expect(screen.getByRole("status").textContent).toMatch(/Depois disso/);
    await user.click(screen.getByRole("button", { name: "Conforto" }));
    await user.clear(screen.getByRole("textbox", { name: "Valor" }));
    await user.type(screen.getByRole("textbox", { name: "Valor" }), "25050");
    await user.clear(screen.getByRole("textbox", { name: "Descrição" }));
    await user.type(
      screen.getByRole("textbox", { name: "Descrição" }),
      "Sushi",
    );

    expect(confirm().textContent).toMatch(/Confirmar R\$\s*250,50/);
    await user.click(confirm());

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 25050,
        description: "Sushi",
        kind: "expense",
        goal: "comfort",
        accountId: "itau",
        memberId: "ana",
        date: "2026-09-28",
        tags: [],
      }),
      1,
    );
    expect(onSave.mock.calls[0][0].split).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });

  test("disables confirm until an expense has a goal", async () => {
    const { screen, user } = setup({ phrase: "Paguei 50 de conserto" });

    const confirm = screen.getByRole("button", { name: /^Confirmar/ });

    expect(confirm).toHaveProperty("disabled", true);
    expect(screen.getByRole("status").textContent).toBe(
      "Escolha uma meta para registrar.",
    );
    await user.click(screen.getByRole("button", { name: "Prazeres" }));
    expect(confirm).toHaveProperty("disabled", false);
  });

  test("splitting and repeating add the split marker and 12 occurrences", async () => {
    const { screen, user, onSave } = setup();

    expect(screen.getByText("Parece uma conta mensal.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Custo fixo" }));
    await user.click(screen.getByRole("switch", { name: "Dividir com Bia" }));
    await user.click(screen.getByRole("switch", { name: "Repetir todo mês" }));
    expect(screen.getByText(/Bia fica com R\$\s*150,00\./)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Confirmar/ }));

    expect(onSave.mock.calls[0][0].split).toEqual({});
    expect(onSave.mock.calls[0][1]).toBe(12);
  });

  test("income has no goal or split and shows the new month total", async () => {
    const { screen, user, onSave } = setup({
      phrase: "Recebi 1.200 de freela",
    });

    expect(screen.queryByRole("group", { name: "Meta" })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Dividir/ })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(
      /Entradas de setembro passam para R\$\s*9\.700,00\./,
    );
    await user.click(screen.getByRole("button", { name: /^Confirmar/ }));

    expect(onSave.mock.calls[0][0]).toMatchObject({
      kind: "income",
      goal: null,
      amount: 120000,
    });
  });

  test("the split toggle needs exactly two members", () => {
    const { screen } = setup({ members: [ana] });

    expect(screen.queryByRole("switch", { name: /Dividir/ })).toBeNull();
  });

  test("a single account hides the account control", () => {
    const { screen } = setup({ accounts: [nubank] });

    expect(screen.queryByRole("group", { name: "Conta" })).toBeNull();
  });

  test("a failed save keeps the sheet open", async () => {
    const { screen, user, onSave, onClose } = setup();

    onSave.mockResolvedValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Custo fixo" }));
    await user.click(screen.getByRole("button", { name: /^Confirmar/ }));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("cancel discards without saving", async () => {
    const { screen, user, onSave, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("RegisterSheet input-first", () => {
  function inputFirst() {
    const onSave = vi.fn(() => Promise.resolve(true));
    const onManual = vi.fn();

    const view = renderPlain(
      <RegisterSheet
        today="2026-09-28"
        month="2026-09"
        accounts={[nubank]}
        members={[ana]}
        currentUserId="ana"
        summary={summary}
        plans={plans}
        serverError=""
        onSave={onSave}
        onManual={onManual}
        onClose={vi.fn()}
      />,
    );

    return { ...view, onManual };
  }

  test("parses a phrase into the card and reports parse errors", async () => {
    const { screen, user } = inputFirst();

    const input = screen.getByRole("textbox", {
      name: "Descreva o que aconteceu",
    });

    await user.type(input, "comprei pão");
    await user.click(screen.getByRole("button", { name: "Enviar frase" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/valor/);

    await user.clear(input);
    await user.type(input, "Gastei 300 reais de condomínio");
    await user.click(screen.getByRole("button", { name: "Enviar frase" }));

    expect(
      await screen.findByRole("button", { name: /^Confirmar/ }),
    ).toBeTruthy();
    expect(screen.getByText("Gastei 300 reais de condomínio")).toBeTruthy();
  });

  test("offers manual entry", async () => {
    const { screen, user, onManual } = inputFirst();

    await user.click(
      screen.getByRole("button", { name: "Preencher manualmente" }),
    );
    expect(onManual).toHaveBeenCalled();
  });
});
