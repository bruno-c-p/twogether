import { describe, expect, it } from "vitest";
import { normalizeTag, parseAmount, shiftMonth, summarize } from "./budget";
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
