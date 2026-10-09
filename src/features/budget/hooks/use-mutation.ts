import {
  useMutation as useQueryMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useRef } from "react";
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

// A React Query mutation over the workspace snapshot. run() resolves to
// whether the server accepted the change; failures are reported through
// `error`, and an optimistic update is rolled back when the server refuses.
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  optimistic?: (
    snapshot: WorkspaceSnapshot,
    ...args: TArgs
  ) => WorkspaceSnapshot,
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useQueryMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onMutate: async (args): Promise<CachedWorkspace | undefined> => {
      const cached = cachedWorkspace(queryClient);

      if (!optimistic || !cached) return cached;

      await queryClient.cancelQueries({ queryKey: cached.key });
      queryClient.setQueryData(
        cached.key,
        optimistic(cached.previous, ...args),
      );

      return cached;
    },
    // Without an optimistic update the change only shows once the snapshot
    // is fresh, so the mutation stays pending until then.
    onSuccess: async () => {
      const refresh = queryClient.invalidateQueries({
        queryKey: workspaceQueryKey,
      });

      if (!optimistic) await refresh;
    },
    onError: async (cause, _args, cached) => {
      if (optimistic && cached)
        queryClient.setQueryData(cached.key, cached.previous);

      if (isRedirect(cause))
        await router.navigate(router.resolveRedirect(cause).options);
    },
  });

  async function run(...args: TArgs): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;

    try {
      await mutation.mutateAsync(args);

      return true;
    } catch {
      return false;
    } finally {
      inFlight.current = false;
    }
  }

  const { error } = mutation;

  return {
    run,
    // Dialogs call this when they open or close so an old failure never
    // shows up on the next attempt.
    reset: mutation.reset,
    pending: mutation.isPending,
    error: error && !isRedirect(error) ? failureMessage(error) : "",
  };
}
