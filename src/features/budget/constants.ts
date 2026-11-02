import type {
  Goal,
  GoalPercentages,
  TransactionKind,
  View,
} from "@/features/budget/domain/types";

export const GOALS: Goal[] = [
  {
    id: "fixed",
    name: "Custo fixo",
    description: "Despesas essenciais do dia a dia.",
  },
  {
    id: "pleasure",
    name: "Prazeres",
    description: "Lazer e experiências.",
  },
  {
    id: "comfort",
    name: "Conforto",
    description: "Conforto e bem-estar.",
  },
  {
    id: "targets",
    name: "Metas",
    description: "Objetivos de curto e longo prazo.",
  },
  {
    id: "knowledge",
    name: "Conhecimento",
    description: "Cursos e desenvolvimento.",
  },
  {
    id: "freedom",
    name: "Liberdade financeira",
    description: "Reserva e investimentos.",
  },
];

export const DEFAULT_PERCENTAGES: GoalPercentages = {
  fixed: 30,
  pleasure: 10,
  comfort: 15,
  targets: 15,
  freedom: 25,
  knowledge: 5,
};

export const WORKSPACE_PATHS = {
  overview: "/",
  transactions: "/transacoes",
  goals: "/orcamento",
} as const satisfies Record<View, string>;

type WorkspacePath = (typeof WORKSPACE_PATHS)[View];

export const WORKSPACE_NAVIGATION = [
  {
    to: WORKSPACE_PATHS.overview,
    label: "Visão geral",
    // The phone bar fits four tabs and the add button in 320px.
    mobileLabel: "Início",
  },
  {
    to: WORKSPACE_PATHS.transactions,
    label: "Transações",
  },
  { to: WORKSPACE_PATHS.goals, label: "Orçamento" },
] as const satisfies {
  to: WorkspacePath;
  label: string;
  mobileLabel?: string;
}[];

export const KINDS = {
  expense: { label: "Despesa" },
  income: { label: "Receita" },
  transfer: { label: "Transferência" },
} as const satisfies Record<TransactionKind, { label: string }>;
