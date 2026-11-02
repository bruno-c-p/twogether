import { describe, expect, test, vi } from "vitest";
import {
  TransactionList,
  TransactionSearch,
} from "@/features/budget/components/transaction-list/transaction-list";
import type { Transaction } from "@/features/budget/domain/types";
import { useTransactionFilters } from "@/features/budget/hooks/use-transaction-filters";
import { ana, transaction } from "@/test/fixtures";
import { cents } from "@/test/cents";
import { renderPlain } from "@/test/render";

const month = [
  transaction({
    id: "t1",
    description: "Mercado",
    date: "2026-09-10",
  }),
  transaction({
    id: "t2",
    description: "Salário",
    kind: "income",
    goal: null,
    amount: cents(500000),
    date: "2026-09-05",
    memberId: "someone-else",
  }),
  transaction({
    id: "t3",
    description: "Cinema",
    goal: "pleasure",
    date: "2026-09-12",
  }),
];

function List({
  transactions = month,
  hidden = false,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onAdd = vi.fn(),
}: {
  transactions?: Transaction[];
  hidden?: boolean;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
  onAdd?: () => void;
}) {
  const filters = useTransactionFilters();

  return (
    <>
      <TransactionSearch query={filters.query} setQuery={filters.setQuery} />
      <TransactionList
        transactions={transactions}
        filters={filters}
        members={[ana]}
        userId="ana"
        busy={false}
        hidden={hidden}
        onEdit={onEdit}
        onDelete={onDelete}
        onAdd={onAdd}
      />
    </>
  );
}

function rowNames(screen: ReturnType<typeof renderPlain>["screen"]) {
  return screen
    .queryAllByRole("button", { name: /^Editar / })
    .map((button) => button.getAttribute("aria-label"));
}

describe("TransactionList", () => {
  test("lists newest first grouped by day with goal and signed amounts", () => {
    const { screen } = renderPlain(<List />);

    expect(rowNames(screen)).toEqual([
      "Editar Cinema",
      "Editar Mercado",
      "Editar Salário",
    ]);
    expect(screen.getByText("12 set · sábado")).toBeTruthy();
    expect(screen.getByText("10 set · quinta")).toBeTruthy();
    expect(screen.getByText("05 set · sábado")).toBeTruthy();
    // The goal renders once for the phone line and once for the desktop
    // column; CSS shows one of them, jsdom sees both.
    expect(screen.getAllByText("Receita")).toHaveLength(2);
    expect(screen.getAllByText(/\+\sR\$\s5\.000,00/)).toHaveLength(2);
    expect(screen.getAllByText(/−\sR\$\s45,90/)).toHaveLength(4);
  });

  test("transactions on the same day share one header with the net total", () => {
    const { screen } = renderPlain(
      <List
        transactions={[
          transaction({
            id: "a",
            description: "Pão",
            amount: cents(1000),
            date: "2026-09-10",
          }),
          transaction({
            id: "b",
            description: "Freela",
            kind: "income",
            goal: null,
            amount: cents(3000),
            date: "2026-09-10",
          }),
        ]}
      />,
    );

    expect(screen.getAllByText("10 set · quinta")).toHaveLength(1);
    expect(screen.getAllByText(/\+\sR\$\s20,00/)).toHaveLength(1);
  });

  test("a transfer leaves the day's net alone and shows no sign", () => {
    const { screen } = renderPlain(
      <List
        transactions={[
          transaction({
            id: "a",
            description: "Pão",
            amount: cents(1000),
            date: "2026-09-10",
          }),
          transaction({
            id: "b",
            description: "Freela",
            kind: "income",
            goal: null,
            amount: cents(3000),
            date: "2026-09-10",
          }),
          transaction({
            id: "c",
            description: "Tesouro Direto",
            kind: "transfer",
            goal: "freedom",
            amount: cents(5000),
            date: "2026-09-10",
          }),
        ]}
      />,
    );

    expect(screen.getAllByText(/^\+\sR\$\s20,00$/)).toHaveLength(1);
    expect(screen.getAllByText(/^R\$\s50,00$/)).toHaveLength(1);
    expect(screen.queryByText(/−\sR\$\s30,00/)).toBeNull();
  });

  test("a day with only a transfer shows a zero net without a sign", () => {
    const { screen } = renderPlain(
      <List
        transactions={[
          transaction({
            id: "c",
            description: "Tesouro Direto",
            kind: "transfer",
            goal: "freedom",
            amount: cents(5000),
            date: "2026-09-10",
          }),
        ]}
      />,
    );

    expect(screen.getAllByText(/^R\$\s0,00$/)).toHaveLength(1);
    expect(screen.queryByText(/^\+\sR\$\s0,00$/)).toBeNull();
  });

  test("search, goal and kind filters narrow the rows", async () => {
    const { screen, user } = renderPlain(<List />);

    await user.type(screen.getByLabelText("Buscar transações"), "prazer");
    expect(rowNames(screen)).toEqual(["Editar Cinema"]);
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));

    await user.click(screen.getByRole("button", { name: "Receitas" }));
    expect(rowNames(screen)).toEqual(["Editar Salário"]);
    await user.click(screen.getByRole("button", { name: "Todas" }));

    await user.click(
      screen.getByRole("combobox", { name: "Filtrar por meta" }),
    );
    await user.click(await screen.findByRole("option", { name: "Custo fixo" }));
    expect(rowNames(screen)).toEqual(["Editar Mercado"]);
    await user.click(
      screen.getByRole("combobox", { name: "Filtrar por meta" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Todas as metas" }),
    );
    expect(rowNames(screen)).toHaveLength(3);
  });

  test("the split chip keeps only divided transactions", async () => {
    const shared = transaction({
      id: "s1",
      description: "Aluguel",
      date: "2026-09-05",
      split: {},
    });

    const { screen, user } = renderPlain(
      <List transactions={[shared, ...month]} />,
    );

    expect(rowNames(screen)).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "Divididas" }));
    expect(rowNames(screen)).toEqual(["Editar Aluguel"]);
    expect(
      screen
        .getByRole("button", { name: "Divididas" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("dividida · a receber")).toBeTruthy();
  });

  test("an over-filtered list offers to clear every filter", async () => {
    const { screen, user } = renderPlain(<List />);

    await user.type(screen.getByLabelText("Buscar transações"), "zzz");
    expect(screen.getByText("Nenhuma transação encontrada.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(rowNames(screen)).toHaveLength(3);
  });

  test("an empty month invites adding the first transaction", async () => {
    const onAdd = vi.fn();

    const { screen, user } = renderPlain(
      <List transactions={[]} onAdd={onAdd} />,
    );

    expect(screen.getByText("Nenhuma transação neste mês.")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Adicionar transação" }),
    );
    expect(onAdd).toHaveBeenCalled();
  });

  test("pagination bounds rows, preserves full-day totals and searches every page", async () => {
    const transactions = Array.from({ length: 51 }, (_, index) =>
      transaction({
        id: String(index).padStart(3, "0"),
        description: `Compra ${index}`,
        date: "2026-09-10",
        amount: cents(100),
      }),
    );

    const { screen, user } = renderPlain(<List transactions={transactions} />);
    expect(rowNames(screen)).toHaveLength(50);
    expect(screen.getByText(/−\sR\$\s51,00/)).toBeTruthy();
    expect(
      screen.getByLabelText("Anterior").getAttribute("aria-disabled") ===
        "true",
    ).toBe(true);
    await user.click(screen.getByRole("link", { name: "Próxima" }));
    expect(rowNames(screen)).toEqual(["Editar Compra 0"]);
    expect(screen.getByText(/−\sR\$\s51,00/)).toBeTruthy();
    expect(
      screen.getByLabelText("Próxima").getAttribute("aria-disabled") === "true",
    ).toBe(true);
    // One paste, not nine keystrokes that each re-render 50 rows.
    await user.click(screen.getByLabelText("Buscar transações"));
    await user.paste("Compra 50");
    expect(rowNames(screen)).toEqual(["Editar Compra 50"]);
    expect(
      screen.queryByRole("navigation", { name: "Páginas de transações" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(rowNames(screen)).toHaveLength(50);
    expect(screen.getByText(/Página 1 de 2/)).toBeTruthy();
  });

  test("the page comes from the URL, so a shared link opens on it", () => {
    const transactions = Array.from({ length: 51 }, (_, index) =>
      transaction({
        id: String(index).padStart(3, "0"),
        description: `Compra ${index}`,
        date: "2026-09-10",
      }),
    );

    const { screen } = renderPlain(
      <List transactions={transactions} />,
      "?page=2",
    );

    expect(screen.getByText(/Página 2 de 2/)).toBeTruthy();
    expect(rowNames(screen)).toEqual(["Editar Compra 0"]);
  });

  test("a page link below 1 opens the first page", () => {
    const transactions = Array.from({ length: 51 }, (_, index) =>
      transaction({
        id: String(index).padStart(3, "0"),
        description: `Compra ${index}`,
        date: "2026-09-10",
      }),
    );

    const { screen } = renderPlain(
      <List transactions={transactions} />,
      "?page=0",
    );

    expect(screen.getByText(/Página 1 de 2/)).toBeTruthy();
    expect(rowNames(screen)).toHaveLength(50);
    expect(
      screen.getByLabelText("Anterior").getAttribute("aria-disabled") ===
        "true",
    ).toBe(true);
  });

  test("row actions edit and delete, and hidden values mask amounts", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { screen, user } = renderPlain(
      <List hidden onEdit={onEdit} onDelete={onDelete} />,
    );

    expect(screen.getAllByText("R$ ••••")).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Mercado" }));
    await user.click(screen.getByRole("button", { name: "Excluir Cinema" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t3" }),
    );
  });
});
