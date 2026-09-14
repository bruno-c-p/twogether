import type { Goal, GoalPercentages } from "./types";

export const GOALS: Goal[] = [
  {
    id: "fixed",
    name: "Custo fixo",
    description: "Despesas essenciais do dia a dia.",
    color: "#617c58",
    background: "#edf1e7",
  },
  {
    id: "pleasure",
    name: "Prazeres",
    description: "Lazer e experiências.",
    color: "#c1834a",
    background: "#fcf0e2",
  },
  {
    id: "comfort",
    name: "Conforto",
    description: "Conforto e bem-estar.",
    color: "#6a81a5",
    background: "#edf1f8",
  },
  {
    id: "targets",
    name: "Metas",
    description: "Objetivos de curto e longo prazo.",
    color: "#b66d7a",
    background: "#f8eaf0",
  },
  {
    id: "knowledge",
    name: "Conhecimento",
    description: "Cursos e desenvolvimento.",
    color: "#9676ac",
    background: "#f2edf7",
  },
  {
    id: "freedom",
    name: "Liberdade financeira",
    description: "Reserva e investimentos.",
    color: "#498c7e",
    background: "#e7f2ec",
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
