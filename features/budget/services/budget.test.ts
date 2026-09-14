import { describe, expect, it } from "vitest";
import {
  normalizeTag,
  parseAmount,
  shiftMonth,
  summarize,
  planGoals,
  isTransaction,
} from "./budget";
import { DEFAULT_PERCENTAGES } from "../constants";
import type { Transaction } from "../types";

const transactions: Transaction[] = [
  {
    id: "income",
    description: "Salário",
    amount: 100000,
    kind: "income",
    date: "2026-09-01",
    goal: null,
    tags: [],
  },
  {
    id: "fixed",
    description: "Aluguel",
    amount: 30000,
    kind: "expense",
    date: "2026-09-05",
    goal: "fixed",
    tags: ["casa"],
  },
  {
    id: "pleasure",
    description: "Jantar",
    amount: 10000,
    kind: "expense",
    date: "2026-09-11",
    goal: "pleasure",
    tags: ["a dois"],
  },
];

describe("valores em reais", () => {
  it("converte centavos e separadores brasileiros sem arredondamento flutuante", () => {
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("0,01")).toBe(1);
    expect(parseAmount("10,1")).toBe(1010);
    expect(parseAmount(" R$ 1.000,00 ")).toBe(100000);
  });
  it.each([
    "0",
    "-20",
    "12,345",
    "10.99",
    "abc",
    "",
    "1e5",
    "1,2,3",
    "1000000000",
  ])("rejeita valor inválido %s", (value) => {
    expect(parseAmount(value)).toBeNull();
  });
});

describe("resumo financeiro", () => {
  it("separa entradas, saídas e destinos sem contar receitas duas vezes", () => {
    const summary = summarize(transactions);
    expect(summary.income).toBe(100000);
    expect(summary.expenses).toBe(40000);
    expect(summary.balance).toBe(60000);
    expect(summary.goals.reduce((total, goal) => total + goal.amount, 0)).toBe(
      summary.expenses,
    );
    expect(summary.goals).toHaveLength(6);
    expect(summary.goals.find((goal) => goal.id === "fixed")).toMatchObject({
      amount: 30000,
      count: 1,
    });
  });
  it("mantém saldo negativo e retorna zero para orçamento vazio", () => {
    expect(summarize([]).balance).toBe(0);
    expect(
      summarize(
        transactions.filter((transaction) => transaction.kind === "expense"),
      ).balance,
    ).toBe(-40000);
  });
});

describe("tipo da transação", () => {
  it("não associa uma receita a uma meta", () => {
    expect(isTransaction(transactions[0])).toBe(true);
    expect(isTransaction({ ...transactions[0], goal: "fixed" })).toBe(false);
    expect(isTransaction({ ...transactions[1], goal: null })).toBe(false);
  });
});

describe("mês e tags", () => {
  it("navega corretamente nas viradas de ano", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("normaliza tags para evitar duplicatas por espaços e letras maiúsculas", () => {
    expect(normalizeTag(" #Casa ")).toBe("casa");
    expect(normalizeTag("A   DOIS")).toBe("a dois");
  });
});

describe("individual goal planning", () => {
  const members = [
    {
      id: "a",
      name: "Ana",
      percentagesRevision: 0,
      percentages: { ...DEFAULT_PERCENTAGES, fixed: 25, targets: 20 },
    },
    {
      id: "b",
      name: "Bia",
      percentagesRevision: 0,
      percentages: { ...DEFAULT_PERCENTAGES, fixed: 35, targets: 10 },
    },
  ];
  const income = (memberId: string, amount: number): Transaction => ({
    id: memberId,
    memberId,
    amount,
    kind: "income",
    description: "Salário",
    date: "2026-09-14",
    goal: null,
    tags: [],
  });
  const monthly = [income("a", 500000), income("b", 300000)];
  it("sums each person's plan and weights the combined percentage by income", () => {
    expect(
      planGoals(monthly, members).find((goal) => goal.id === "targets"),
    ).toEqual({ id: "targets", planned: 130000, percentage: 16.25 });
    expect(
      planGoals(monthly, [members[0]]).find((goal) => goal.id === "targets"),
    ).toEqual({ id: "targets", planned: 100000, percentage: 20 });
    expect(
      planGoals(monthly, [members[1]]).find((goal) => goal.id === "targets"),
    ).toEqual({ id: "targets", planned: 30000, percentage: 10 });
  });
  it("keeps personal priorities without income and shows no combined percentage", () => {
    expect(planGoals([], members)[0]).toEqual({
      id: "fixed",
      planned: 0,
      percentage: null,
    });
    expect(planGoals([], [members[0]])[0]).toEqual({
      id: "fixed",
      planned: 0,
      percentage: 25,
    });
  });
  it("sums rounded individual cents and excludes expenses from planned income", () => {
    const expense: Transaction = {
      ...income("a", 10000),
      kind: "expense",
      goal: "targets",
    };
    expect(
      planGoals([income("a", 3), income("b", 5), expense], members).find(
        (goal) => goal.id === "targets",
      )?.planned,
    ).toBe(2);
  });
});
