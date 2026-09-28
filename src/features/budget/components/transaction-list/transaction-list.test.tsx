import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { TransactionList } from "@/features/budget/components/transaction-list/transaction-list";
import type {
  GoalId,
  Transaction,
  TransactionKind,
} from "@/features/budget/domain/types";
import { ana, nubank, transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

const month = [
  transaction({
    id: "t1",
    description: "Mercado",
    date: "2026-09-10",
    tags: ["casa"],
  }),
  transaction({
    id: "t2",
    description: "Salário",
    kind: "income",
    goal: null,
    amount: 500000,
    date: "2026-09-05",
    tags: [],
    memberId: "someone-else",
    accountId: "gone",
  }),
  transaction({
    id: "t3",
    description: "Cinema",
    goal: "pleasure",
    date: "2026-09-12",
    tags: [],
  }),
];

function List({
  transactions = month,
  compact = false,
  hidden = false,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onAdd = vi.fn(),
  onViewAll = vi.fn(),
}: {
  transactions?: Transaction[];
  compact?: boolean;
  hidden?: boolean;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
  onAdd?: () => void;
  onViewAll?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [goalFilter, setGoalFilter] = useState<GoalId | "all">("all");
  const [tagFilter, setTag] = useState("");
  const [kindFilter, setKindFilter] = useState<TransactionKind | "all">("all");

  return (
    <TransactionList
      transactions={transactions}
      filters={{
        query,
        goalFilter,
        tagFilter,
        kindFilter,
        setQuery,
        setGoalFilter,
        setTag,
        setKindFilter,
      }}
      members={[ana]}
      accounts={[nubank]}
      userId="ana"
      busy={false}
      hidden={hidden}
      compact={compact}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      onViewAll={onViewAll}
    />
  );
}

function rowNames(screen: ReturnType<typeof renderPlain>["screen"]) {
  return screen
    .queryAllByRole("button", { name: /^Editar / })
    .map((button) => button.getAttribute("aria-label"));
}

describe("TransactionList", () => {
  test("lists newest first with person, account, goal and signed amounts", () => {
    const { screen } = renderPlain(<List />);

    expect(rowNames(screen)).toEqual([
      "Editar Cinema",
      "Editar Mercado",
      "Editar Salário",
    ]);
    expect(screen.getByText("Pessoa do casal · Sem conta")).toBeTruthy();
    expect(screen.getAllByText("Ana · Nubank")).toHaveLength(2);
    expect(screen.getByText("Receita")).toBeTruthy();
    expect(screen.getByText(/\+\sR\$\s5\.000,00/)).toBeTruthy();
    expect(screen.getAllByText(/−\sR\$\s45,90/)).toHaveLength(2);
    expect(screen.getByText("3 transações neste mês")).toBeTruthy();
  });

  test("search, goal, kind and tag filters narrow the rows", async () => {
    const { screen, user } = renderPlain(<List />);

    await user.type(screen.getByLabelText("Buscar transações"), "prazer");
    expect(rowNames(screen)).toEqual(["Editar Cinema"]);
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));

    await user.selectOptions(
      screen.getByLabelText("Filtrar por tipo"),
      "income",
    );
    expect(rowNames(screen)).toEqual(["Editar Salário"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por tipo"), "all");

    await user.selectOptions(
      screen.getByLabelText("Filtrar por meta"),
      "fixed",
    );
    expect(rowNames(screen)).toEqual(["Editar Mercado"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por meta"), "all");

    await user.click(screen.getByRole("button", { name: "#casa" }));
    expect(screen.getByText("Filtrando por")).toBeTruthy();
    expect(rowNames(screen)).toEqual(["Editar Mercado"]);
    expect(screen.getByText("1 transação neste mês")).toBeTruthy();
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
      screen.getByRole("button", { name: "Adicionar primeira transação" }),
    );
    expect(onAdd).toHaveBeenCalled();
  });

  test("compact mode shows the latest five and links to the full list", async () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      transaction({
        id: `m${index}`,
        description: `Item ${index}`,
        date: `2026-09-0${index + 1}`,
      }),
    );

    const onViewAll = vi.fn();

    const { screen, user } = renderPlain(
      <List transactions={many} compact onViewAll={onViewAll} />,
    );

    expect(rowNames(screen)).toHaveLength(5);
    expect(screen.getByText("5 de 7 transações neste mês")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Ver todas/ }));
    expect(onViewAll).toHaveBeenCalled();
  });

  test("row actions edit and delete, and hidden values mask amounts", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { screen, user } = renderPlain(
      <List hidden onEdit={onEdit} onDelete={onDelete} />,
    );

    expect(screen.getAllByText("R$ ••••")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Mercado" }));
    await user.click(screen.getByRole("button", { name: "Excluir Cinema" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t3" }),
    );
  });
});
