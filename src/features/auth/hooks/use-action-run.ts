import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import { failureMessage } from "@/features/budget/hooks/use-mutation";

// Runs one server action at a time as a React Query mutation: failures
// become the error message, redirects navigate, and success reloads the
// current route's data and resolves to { data }. Failures resolve to null.
export function useActionRun(offlineMessage?: string) {
  const router = useRouter();
  const inFlight = useRef(false);

  const action = useMutation({
    mutationFn: async (step: () => Promise<void>) => {
      await step();
      await router.invalidate();
    },
    onError: async (cause) => {
      if (isRedirect(cause))
        await router.navigate(router.resolveRedirect(cause).options);
    },
  });

  async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | null> {
    if (inFlight.current) return null;
    inFlight.current = true;

    let outcome: { data: T } | null = null;

    try {
      await action.mutateAsync(async () => {
        outcome = { data: await fn() };
      });

      return outcome;
    } catch {
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  const { error } = action;

  return {
    error:
      error && !isRedirect(error) ? failureMessage(error, offlineMessage) : "",
    busy: action.isPending,
    run,
  };
}

export type ActionRun = ReturnType<typeof useActionRun>["run"];
