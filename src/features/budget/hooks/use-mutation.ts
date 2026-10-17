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

type CachedWorkspaces = [QueryKey, WorkspaceSnapshot | undefined][];

// Every cached month, since unpaid splits and series reach across months.
function cachedWorkspaces(queryClient: QueryClient): CachedWorkspaces {
  return queryClient.getQueriesData<WorkspaceSnapshot>({
    queryKey: workspaceQueryKey,
  });
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
    onMutate: async (args): Promise<CachedWorkspaces> => {
      if (!optimistic) return [];

      // A month still on its first load is left alone: nothing to update.
      await queryClient.cancelQueries({
        queryKey: workspaceQueryKey,
        predicate: (query) => query.state.data !== undefined,
      });
      const cached = cachedWorkspaces(queryClient);

      for (const [key, previous] of cached)
        if (previous)
          queryClient.setQueryData(key, optimistic(previous, ...args));

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
      for (const [key, previous] of cached ?? [])
        queryClient.setQueryData(key, previous);

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
    // shows up on the next attempt. Skipped mid-run: resetting would hide
    // `pending` and drop its eventual failure.
    reset: () => {
      if (!inFlight.current) mutation.reset();
    },
    pending: mutation.isPending,
    error: error && !isRedirect(error) ? failureMessage(error) : "",
  };
}
