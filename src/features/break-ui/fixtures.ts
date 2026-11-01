import { DEFAULT_PERCENTAGES } from "@/features/budget/constants";
import { transactionSchema } from "@/features/budget/domain/schemas";
import type {
  TransactionDraft,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";

export const datasets = ["demo", "worst", "empty", "one", "huge"] as const;

export type Dataset = (typeof datasets)[number];

export const fixtureMonth = "2026-10";

const descriptions = [
  "Manutenção preventiva do apartamento — elétrica, hidráulica e impermeabilização",
  "https://example.com/comprovantes/condominio/outubro/extraordinaria/reforma.pdf",
  "👩🏽‍💻 Consultoria — Đặng Thị Ngọc Hân",
  "王秀英 — curso de português",
  "نور الهدى عبد الرحمن",
  "<b>Mercado</b> & café **especial**",
  "J",
  "Seguro residencial\nParcela anual",
];

const counts = { demo: 6, worst: 12, empty: 0, one: 1, huge: 1000 };

const goals = [
  "fixed",
  "pleasure",
  "comfort",
  "targets",
  "knowledge",
  "freedom",
] as const;

const worstAmounts = [99999999999, 99999999999, 99999999999, 1];

function baseTransaction(index: number, dataset: Dataset): TransactionDraft {
  const income = index === 0 || (dataset === "huge" && index % 20 === 0);
  const goal = income ? null : goals[index % goals.length];

  return {
    id: `fixture-${index}`,
    description: `${income ? "Salário" : "Mercado"}${dataset === "huge" ? ` ${index + 1}` : ""}`,
    amount: income ? 600000 : 4590,
    date: `${fixtureMonth}-${String(28 - (index % 28)).padStart(2, "0")}`,
    kind: income ? "income" : goal === "freedom" ? "transfer" : "expense",
    goal,
    memberId: index % 2 ? "person-b" : "person-a",
    revision: 1,
  };
}

function worstTransaction(index: number): TransactionDraft {
  const transaction = baseTransaction(index, "worst");

  return {
    ...transaction,
    description: descriptions[index % descriptions.length],
    amount: worstAmounts[index] ?? 128401,
    split:
      index === 1
        ? {}
        : index === 4
          ? { paidAt: "2026-10-01T12:00:00Z", paidBy: "person-a" }
          : undefined,
    recurrenceId: index >= 8 ? "annual-insurance" : undefined,
    recurrenceIndex: index >= 8 ? index - 8 : undefined,
  };
}

export function fixture(dataset: Dataset): WorkspaceSnapshot {
  const extreme = dataset === "worst";

  const members = [
    {
      id: "person-a",
      name: extreme ? "👩🏽‍💻 Aleksandra Wiśniewska-Kowalczyk" : "Ana",
      percentages: { ...DEFAULT_PERCENTAGES },
      percentagesRevision: 0,
    },
    {
      id: "person-b",
      name: extreme ? "Christopher Alexander Montgomery III" : "Jo",
      percentages: {
        fixed: 0,
        pleasure: 0.01,
        comfort: 0,
        targets: 0,
        knowledge: 0,
        freedom: 99.99,
      },
      percentagesRevision: 0,
    },
  ];

  const transactions = Array.from({ length: counts[dataset] }, (_, index) =>
    transactionSchema.parse(
      extreme ? worstTransaction(index) : baseTransaction(index, dataset),
    ),
  );

  return {
    user: { id: members[0].id, name: members[0].name },
    household: {
      id: "isolated-break-ui",
      members:
        dataset === "one" || dataset === "empty"
          ? members.slice(0, 1)
          : members,
    },
    budget: { percentages: { ...DEFAULT_PERCENTAGES }, transactions },
  };
}

export function readDataset(): Dataset {
  const selected = new URLSearchParams(window.location.search).get("data");

  return datasets.find((value) => value === selected) ?? "demo";
}
