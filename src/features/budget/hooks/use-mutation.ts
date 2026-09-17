import { useCallback, useRef, useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import { isMutationFailure } from "@/server/mutation-result";

export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const router = useRouter();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setPending(true);
      setError("");
      try {
        const result = await fnRef.current(...args);
        if (isMutationFailure(result)) {
          setError(result.message);
          return null;
        }
        await router.invalidate();
        return result;
      } catch (error) {
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
    [router],
  );

  return { run, pending, error };
}
