import { useCallback, useRef, useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import { failureMessage } from "@/features/budget/hooks/use-mutation";

// Runs one server action at a time: failures become the error message,
// redirects navigate, and success reloads the current route's data and
// resolves to { data }. Failures resolve to null.
export function useActionRun(offlineMessage?: string) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<{ data: T } | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError("");

      try {
        const data = await fn();

        await router.invalidate();

        return { data };
      } catch (cause) {
        if (isRedirect(cause)) {
          await router.navigate(router.resolveRedirect(cause).options);

          return null;
        }

        setError(failureMessage(cause, offlineMessage));

        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [offlineMessage, router],
  );

  return { error, busy, run };
}

export type ActionRun = ReturnType<typeof useActionRun>["run"];
