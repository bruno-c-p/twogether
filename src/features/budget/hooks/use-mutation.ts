import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import type { WorkspaceSnapshot } from "@/features/budget/domain/types";
import { workspaceQueryKey } from "@/features/budget/workspace";
import { isMutationFailure } from "@/server/mutation-result";

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
      const cached = queryClient.getQueriesData<WorkspaceSnapshot>({
        queryKey: workspaceQueryKey,
      })[0];
      const previous = cached?.[1];
      const applyOptimistic = optimisticRef.current;
      if (applyOptimistic && previous && cached) {
        await queryClient.cancelQueries({ queryKey: cached[0] });
        queryClient.setQueryData(cached[0], applyOptimistic(previous, ...args));
      }
      try {
        const result = await fnRef.current(...args);
        if (isMutationFailure(result)) {
          if (cached && previous) {
            queryClient.setQueryData(cached[0], previous);
          }
          setError(result.message);
          return null;
        }
        const refresh = queryClient.invalidateQueries({
          queryKey: workspaceQueryKey,
        });
        if (applyOptimistic) void refresh;
        else await refresh;
        return result;
      } catch (error) {
        if (cached && previous && applyOptimistic) {
          queryClient.setQueryData(cached[0], previous);
        }
        if (isRedirect(error)) {
          await router.navigate(router.resolveRedirect(error).options);
          return null;
        }
        setError(
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : "Sem conexão. Confira o orçamento antes de tentar novamente.",
        );
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
