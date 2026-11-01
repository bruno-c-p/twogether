import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Armchair,
  BookOpen,
  House,
  LayoutGrid,
  ReceiptText,
  Sprout,
  Target,
  Wine,
} from "lucide-react";
import type {
  Goal,
  GoalId,
  GoalPercentages,
  TransactionKind,
  View,
} from "@/features/budget/domain/types";

export const GOALS: Goal[] = [
  {
    id: "fixed",
    name: "Custo fixo",
    description: "Despesas essenciais do dia a dia.",
    color: "var(--category-fixed)",
    background: "var(--category-fixed-bg)",
  },
  {
    id: "pleasure",
    name: "Prazeres",
    description: "Lazer e experiências.",
    color: "var(--category-pleasure)",
    background: "var(--category-pleasure-bg)",
  },
  {
    id: "comfort",
    name: "Conforto",
    description: "Conforto e bem-estar.",
    color: "var(--category-comfort)",
    background: "var(--category-comfort-bg)",
  },
  {
    id: "targets",
    name: "Metas",
    description: "Objetivos de curto e longo prazo.",
    color: "var(--category-targets)",
    background: "var(--category-targets-bg)",
  },
  {
    id: "knowledge",
    name: "Conhecimento",
    description: "Cursos e desenvolvimento.",
    color: "var(--category-knowledge)",
    background: "var(--category-knowledge-bg)",
  },
  {
    id: "freedom",
    name: "Liberdade financeira",
    description: "Reserva e investimentos.",
    color: "var(--category-freedom)",
    background: "var(--category-freedom-bg)",
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
    icon: LayoutGrid,
  },
  {
    to: WORKSPACE_PATHS.transactions,
    label: "Transações",
    icon: ReceiptText,
  },
  { to: WORKSPACE_PATHS.goals, label: "Orçamento", icon: Target },
] as const satisfies {
  to: WorkspacePath;
  label: string;
  mobileLabel?: string;
  icon: typeof LayoutGrid;
}[];

export const GOAL_ICONS: Record<GoalId, typeof House> = {
  fixed: House,
  targets: Target,
  pleasure: Wine,
  comfort: Armchair,
  knowledge: BookOpen,
  freedom: Sprout,
};

// Order is the kind toggle's order.
export const KINDS = {
  expense: { label: "Despesa", icon: ArrowUpRight },
  income: { label: "Receita", icon: ArrowDownLeft },
  transfer: { label: "Transferência", icon: ArrowRightLeft },
} as const satisfies Record<
  TransactionKind,
  { label: string; icon: typeof House }
>;
