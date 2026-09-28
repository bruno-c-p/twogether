import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { workspaceQueryKey } from "@/features/budget/workspace";
import { isMutationFailure } from "@/server/mutation-result";

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

export function failureMessage(cause: unknown) {
  return cause instanceof Error && !(cause instanceof TypeError)
    ? cause.message
    : OFFLINE_MESSAGE;
}

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
    async (...args: TArgs): Promise<TResult | null> => {
      if (inFlight.current) return null;
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
        const result = await fnRef.current(...args);

        if (isMutationFailure(result)) {
          restore();
          setError(result.message);

          return null;
        }

        const refresh = queryClient.invalidateQueries({
          queryKey: workspaceQueryKey,
        });

        if (applyOptimistic) void refresh;
        else await refresh;

        return result;
      } catch (cause) {
        if (applyOptimistic) restore();

        if (isRedirect(cause)) {
          await router.navigate(router.resolveRedirect(cause).options);

          return null;
        }

        setError(failureMessage(cause));

        return null;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [queryClient, router],
  );

  return { run, pending, error };
}
