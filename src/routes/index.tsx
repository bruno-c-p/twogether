import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/features/budget";

export const Route = createFileRoute("/")({ component: BudgetApp });
