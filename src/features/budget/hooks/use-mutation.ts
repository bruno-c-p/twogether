import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { workspaceQueryKey } from "@/features/budget/workspace";

const OFFLINE_MESSAGE =
  "Sem conexão. Confira o orçamento antes de tentar novamente.";

type CachedWorkspace = { key: QueryKey; previous: WorkspaceSnapshot };

function cachedWorkspace(
  queryClient: QueryClient,
): CachedWorkspace | undefined {
  const [entry] = queryClient.getQueriesData<WorkspaceSnapshot>({
    queryKey: workspaceQueryKey,
  });

  if (!entry?.[1]) return undefined;

  return { key: entry[0], previous: entry[1] };
}

export function failureMessage(cause: unknown, offline = OFFLINE_MESSAGE) {
  return cause instanceof Error && !(cause instanceof TypeError)
    ? cause.message
    : offline;
}

// run() resolves to whether the server accepted the change; failures are
// reported through `error`.
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  optimistic?: (
    snapshot: WorkspaceSnapshot,
    ...args: TArgs
  ) => WorkspaceSnapshot,
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fnRef = useRef(fn);
  const optimisticRef = useRef(optimistic);
  useLayoutEffect(() => {
    fnRef.current = fn;
    optimisticRef.current = optimistic;
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setPending(true);
      setError("");

      const cached = cachedWorkspace(queryClient);
      const applyOptimistic = optimisticRef.current;

      const restore = () => {
        if (cached) queryClient.setQueryData(cached.key, cached.previous);
      };

      if (applyOptimistic && cached) {
        await queryClient.cancelQueries({ queryKey: cached.key });
        queryClient.setQueryData(
          cached.key,
          applyOptimistic(cached.previous, ...args),
        );
      }

      try {
        await fnRef.current(...args);

        const refresh = queryClient.invalidateQueries({
          queryKey: workspaceQueryKey,
        });

        if (applyOptimistic) void refresh;
        else await refresh;

        return true;
      } catch (cause) {
        if (applyOptimistic) restore();

        if (isRedirect(cause)) {
          await router.navigate(router.resolveRedirect(cause).options);

          return false;
        }

        setError(failureMessage(cause));

        return false;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [queryClient, router],
  );

  // Dialogs call this when they open or close so an old failure never
  // shows up on the next attempt.
  const reset = useCallback(() => setError(""), []);

  return { run, reset, pending, error };
}
