import {
  Armchair,
  BookOpen,
  House,
  Landmark,
  LayoutGrid,
  ReceiptText,
  Sprout,
  Target,
  Wine,
} from "lucide-react";
import type { Goal, GoalId, GoalPercentages, View } from "@/features/budget/types";

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

export const WORKSPACE_TITLES: Record<View, { title: string; subtitle: string }> =
  {
    overview: {
      title: "Visão geral",
      subtitle: "Saldo, entradas, despesas e metas do mês.",
    },
    transactions: {
      title: "Transações",
      subtitle: "Registre e acompanhe as entradas e despesas do mês.",
    },
    accounts: {
      title: "Contas",
      subtitle: "Cadastre as contas e acompanhe o saldo de cada uma.",
    },
    goals: {
      title: "Metas",
      subtitle: "Divida sua renda por meta e compare gasto e planejado.",
    },
  };

export const WORKSPACE_NAVIGATION = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "transactions", label: "Transações", icon: ReceiptText },
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "goals", label: "Metas", icon: Target },
] as const satisfies { id: View; label: string; icon: typeof LayoutGrid }[];

export const GOAL_ICONS: Record<GoalId, typeof House> = {
  fixed: House,
  targets: Target,
  pleasure: Wine,
  comfort: Armchair,
  knowledge: BookOpen,
  freedom: Sprout,
};

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
