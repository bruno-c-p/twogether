import { within } from "@testing-library/react";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { BudgetWorkspace } from "@/features/budget/components/budget-app/budget-app";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { BankAccount, Transaction } from "@/features/budget/domain/types";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { ana, nubank, transaction } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

function budget({
  transactions = [transaction()],
  accounts = [nubank],
  syncError = "",
}: {
  transactions?: Transaction[];
  accounts?: BankAccount[];
  syncError?: string;
} = {}): BudgetController {
  return {
    state: {
      transactions,
      accounts,
      percentages: { ...DEFAULT_PERCENTAGES },
    },
    user: { id: "ana", name: "Ana" },
    household: { id: "home", members: [ana] },
    syncError,
    refresh: vi.fn(),
  };
}

async function renderWorkspace(
  controller = budget(),
  path = "/?month=2026-09",
) {
  window.scrollTo = vi.fn();

  return renderWithProviders(
    <BudgetWorkspace budget={controller} account={<span>conta</span>} />,
    path,
  );
}

describe("BudgetWorkspace", () => {
  test("opens on the month overview with the couple's explanation", async () => {
    const { screen } = await renderWorkspace();

    expect(
      screen.getByRole("heading", { level: 1, name: "Visão geral" }),
    ).toBeTruthy();
    expect(screen.getByText(/Sobra de\s+setembro/)).toBeTruthy();
    expect(screen.getByText("conta")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Mercado" })).toBeTruthy();
  });

  test("moves between months through the URL", async () => {
    // "Voltar para este mês" only shows away from the current month.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 15));
    onTestFinished(() => void vi.useRealTimers());

    const { screen, user, router } = await renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "outubro 2026" }),
    );
    expect(router.state.location.search).toMatchObject({ month: "2026-10" });
    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Voltar para este mês" }),
    );
    expect(router.state.location.search).not.toMatchObject({
      month: "2026-10",
    });
  });

  test("shows the month in Portuguese on the drawer trigger", async () => {
    const { screen } = await renderWorkspace();

    expect(screen.getByText("setembro 2026")).toBeTruthy();
    expect(screen.getByText("set 2026")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Selecionar mês e ano: setembro 2026",
      }),
    ).toBeTruthy();
  });

  test("hides values from the top bar", async () => {
    const { screen, user } = await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Ocultar valores" }));
    expect(
      screen.getByRole("button", { name: "Mostrar valores" }),
    ).toBeTruthy();
    expect(screen.getAllByText("R$ ••••").length).toBeGreaterThan(0);
  });

  test("the accounts view explains balances and opens the account dialog", async () => {
    const { screen, user } = await renderWorkspace(
      budget(),
      "/contas?month=2026-09",
    );

    expect(screen.getByText(/Inclui as transações do casal\./)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Nova conta" }));
    expect(
      await screen.findByRole("heading", { name: "Nova conta" }),
    ).toBeTruthy();
  });

  test("a new transaction without accounts sends the person to Contas", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget({ accounts: [] }),
      "/transacoes?month=2026-09",
    );

    await user.click(screen.getByRole("button", { name: "Nova transação" }));
    expect(
      await screen.findByText("Cadastre uma conta para lançar transações."),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/contas");
    expect(router.state.location.search).toEqual({ month: "2026-09" });
  });

  test("editing a transaction opens it prefilled", async () => {
    const { screen, user } = await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Editar Mercado" }));
    expect(
      await screen.findByRole("heading", { name: "Editar transação" }),
    ).toBeTruthy();
  });

  test("deleting a recurring transaction asks which occurrences to remove", async () => {
    const series = [0, 1, 2].map((index) =>
      transaction({
        id: `r${index}`,
        description: "Aluguel",
        recurrenceId: "rent",
        recurrenceIndex: index,
        date: `2026-${String(9 + index).padStart(2, "0")}-05`,
      }),
    );

    const { screen, user } = await renderWorkspace(
      budget({ transactions: series }),
      "/transacoes?month=2026-09",
    );

    await user.click(screen.getByRole("button", { name: "Excluir Aluguel" }));
    expect(
      await screen.findByText("3 transações desta recorrência."),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      screen.queryByRole("heading", { name: "Excluir transação" }),
    ).toBeNull();
  });

  test("goals open the percentages editor; filtering by a goal opens its transactions", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget(),
      "/orcamento?month=2026-09",
    );

    await user.click(
      screen.getByRole("button", { name: "Editar meus percentuais" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Divisão da minha renda" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Fechar percentuais" }),
    );
    await user.click(screen.getByRole("button", { name: /^Custo fixo:/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(router.state.location.search).toEqual({
      month: "2026-09",
      goal: "fixed",
    });
  });

  test("the person filter and a sync error update the page", async () => {
    const { screen, user } = await renderWorkspace(
      budget({ syncError: "Sem conexão." }),
    );

    expect(screen.getByRole("alert").textContent).toBe("Sem conexão.");
    await user.click(
      screen.getByRole("button", { name: "Filtrar por pessoa: Nós" }),
    );
    await user.click(await screen.findByRole("radio", { name: "Eu" }));
    expect(
      screen.getByRole("button", { name: "Filtrar por pessoa: Eu" }),
    ).toBeTruthy();
  });

  test("the transactions list links from the overview to the full view", async () => {
    const { screen, user, router } = await renderWorkspace();

    await user.click(screen.getByRole("button", { name: /Ver todas/ }));
    expect(router.state.location.pathname).toBe("/transacoes");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Transações" }),
    ).toBeTruthy();
  });

  test("page links keep month and person and drop transaction filters", async () => {
    const { screen, user, router } = await renderWorkspace(
      budget(),
      "/transacoes?month=2026-08&member=ana&tag=casa",
    );

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Transações" }).ariaCurrent,
    ).toBe("page");
    await user.click(within(nav).getByRole("link", { name: "Contas" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Contas" }),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/contas");
    expect(router.state.location.search).toEqual({
      month: "2026-08",
      member: "ana",
    });
    expect(within(nav).getByRole("link", { name: "Contas" }).ariaCurrent).toBe(
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Transações" }).ariaCurrent,
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: /^Selecionar mês e ano/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "outubro 2026" }),
    );
    expect(router.state.location.pathname).toBe("/contas");
    expect(router.state.location.search).toEqual({
      month: "2026-10",
      member: "ana",
    });
  });
});
