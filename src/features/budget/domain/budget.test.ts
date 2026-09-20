import { describe, expect, it } from "vitest";
import {
  accountBalance,
  planGoals,
  summarize,
} from "@/features/budget/domain/calc";
import {
  currentMonth,
  formatAmountInput,
  money,
  newId,
  normalizeTag,
  parseAmount,
  parseBalance,
  shiftMonth,
} from "@/features/budget/domain/format";
import {
  isBankAccount,
  isGoalPercentages,
  isTransaction,
} from "@/features/budget/domain/validate";
import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import type { Transaction } from "@/features/budget/domain/types";

const transactions: Transaction[] = [
  {
    id: "income",
    description: "Salário",
    amount: 100000,
    kind: "income",
    date: "2026-09-01",
    goal: null,
    tags: [],
    accountId: "account-1",
  },
  {
    id: "fixed",
    description: "Aluguel",
    amount: 30000,
    kind: "expense",
    date: "2026-09-05",
    goal: "fixed",
    tags: ["casa"],
    accountId: "account-1",
  },
  {
    id: "pleasure",
    description: "Jantar",
    amount: 10000,
    kind: "expense",
    date: "2026-09-11",
    goal: "pleasure",
    tags: ["a dois"],
    accountId: "account-1",
  },
];

describe("valores em reais", () => {
  it("formata a digitação como moeda brasileira, começando pelos centavos", () => {
    expect(formatAmountInput("1")).toBe("0,01");
    expect(formatAmountInput("12")).toBe("0,12");
    expect(formatAmountInput("123")).toBe("1,23");
    expect(formatAmountInput("1234")).toBe("12,34");
    expect(formatAmountInput("1234567")).toBe("12.345,67");
    expect(formatAmountInput("R$ 1.234,56")).toBe("1.234,56");
    expect(formatAmountInput("")).toBe("");
  });

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

  it("formata centavos como moeda brasileira", () => {
    expect(money(495410)).toBe("R$\u00a04.954,10");
    expect(money(1)).toBe("R$\u00a00,01");
    expect(money(0)).toBe("R$\u00a00,00");
    expect(money(-10000)).toBe("-R$\u00a0100,00");
  });
});

describe("divisão da renda", () => {
  it("aceita o padrão 30+10+15+15+25+5 e misturas com dois decimais que somam 100,00", () => {
    expect(DEFAULT_PERCENTAGES).toEqual({
      fixed: 30,
      pleasure: 10,
      comfort: 15,
      targets: 15,
      freedom: 25,
      knowledge: 5,
    });
    expect(isGoalPercentages(DEFAULT_PERCENTAGES)).toBe(true);
    expect(
      isGoalPercentages({
        fixed: 33.33,
        pleasure: 33.33,
        comfort: 33.34,
        targets: 0,
        freedom: 0,
        knowledge: 0,
      }),
    ).toBe(true);
  });

  it("rejeita totais diferentes de 100,00 e um destino a 90% com o restante padrão", () => {
    expect(
      isGoalPercentages({
        fixed: 99.99,
        pleasure: 0,
        comfort: 0,
        targets: 0,
        freedom: 0,
        knowledge: 0,
      }),
    ).toBe(false);
    expect(isGoalPercentages({ ...DEFAULT_PERCENTAGES, fixed: 90 })).toBe(
      false,
    );
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
  it("exige uma conta bancária", () => {
    expect(isTransaction({ ...transactions[0], accountId: "" })).toBe(false);
    expect(isTransaction({ ...transactions[0], accountId: undefined })).toBe(
      false,
    );
  });
});

describe("conta bancária", () => {
  it("exige identificador, nome e saldo inicial", () => {
    expect(
      isBankAccount({ id: "account-1", name: "Nubank", openingBalance: 0 }),
    ).toBe(true);
    expect(isBankAccount({ id: "account-1", name: "Nubank" })).toBe(false);
    expect(isBankAccount({ id: "", name: "Nubank", openingBalance: 0 })).toBe(
      false,
    );
    expect(
      isBankAccount({ id: "account-1", name: "   ", openingBalance: 0 }),
    ).toBe(false);
    expect(
      isBankAccount({
        id: "account-1",
        name: "Nubank",
        openingBalance: -1,
      }),
    ).toBe(false);
  });
  it("aceita saldo inicial zero e soma receitas e despesas da conta", () => {
    expect(parseBalance("")).toBe(0);
    expect(parseBalance("0,00")).toBe(0);
    expect(parseBalance("1.250,50")).toBe(125050);
    expect(parseBalance("abc")).toBeNull();
    const account = {
      id: "account-1",
      name: "Nubank",
      openingBalance: 100000,
    };
    expect(
      accountBalance(account, [
        { ...transactions[0], accountId: "account-1" },
        { ...transactions[1], accountId: "account-1" },
        { ...transactions[2], accountId: "other" },
      ]),
    ).toBe(170000);
  });
});

describe("mês e tags", () => {
  it("navega corretamente nas viradas de ano", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("usa o calendário local para o mês atual", () => {
    expect(currentMonth(new Date(2026, 8, 17))).toBe("2026-09");
  });
  it("normaliza tags para evitar duplicatas por espaços e letras maiúsculas", () => {
    expect(normalizeTag(" #Casa ")).toBe("casa");
    expect(normalizeTag("A   DOIS")).toBe("a dois");
  });
});

describe("newId", () => {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("returns a unique UUID", () => {
    const first = newId();
    const second = newId();
    expect(first).toMatch(uuid);
    expect(second).toMatch(uuid);
    expect(first).not.toBe(second);
  });

  it("works when crypto.randomUUID is missing", () => {
    const original = crypto.randomUUID.bind(crypto);
    // @ts-expect-error — HTTP origins do not expose randomUUID
    crypto.randomUUID = undefined;
    try {
      expect(newId()).toMatch(uuid);
    } finally {
      crypto.randomUUID = original;
    }
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
    accountId: "account-1",
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
