import { useCallback } from "react";
import { useClerk } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signOut } = useClerk();
  const posthog = usePostHog();

  // Forget the analytics identity too, so the next person starts fresh.
  return useCallback(async () => {
    posthog.reset();
    queryClient.clear();
    await signOut({ redirectUrl: "/entrar" });
    await router.invalidate();
  }, [posthog, queryClient, router, signOut]);
}
