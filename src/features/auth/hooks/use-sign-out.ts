import { useCallback } from "react";
import { useClerk } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signOut } = useClerk();

  return useCallback(async () => {
    queryClient.clear();
    await signOut({ redirectUrl: "/entrar" });
    await router.invalidate();
  }, [queryClient, router, signOut]);
}
