import type { Goal, GoalPercentages } from "@/features/budget/types";

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
