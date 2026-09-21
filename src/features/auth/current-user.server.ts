import { auth } from "@clerk/tanstack-react-start/server";
import { getBudgetStore } from "@/features/budget/budget.server";
import type { UserRow } from "@/server/db.server";

export async function currentUser(): Promise<UserRow | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getBudgetStore().ensureUser(userId);
}
