import { useCallback, useEffect, useRef, useState } from "react";
import { getRouteApi, useRouter } from "@tanstack/react-router";

const workspaceRoute = getRouteApi("/");

export function useBudget() {
  const router = useRouter();
  const snapshot = workspaceRoute.useLoaderData();
  const [syncError, setSyncError] = useState("");
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      await router.invalidate();
      setSyncError("");
    } catch (error) {
      setSyncError(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "Sem conexão com o servidor. Tentaremos sincronizar novamente.",
      );
    } finally {
      refreshing.current = false;
    }
  }, [router]);
  useEffect(() => {
    const synchronize = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", synchronize);
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [refresh]);

  return {
    state: snapshot.budget,
    user: snapshot.user,
    household: snapshot.household,
    syncError,
    refresh,
  };
}
export type BudgetController = ReturnType<typeof useBudget>;
