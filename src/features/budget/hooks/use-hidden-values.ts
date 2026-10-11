import { useQuery, useQueryClient } from "@tanstack/react-query";

const HIDDEN_VALUES_KEY = ["hidden-values"];

// Hiding values is a privacy switch for this tab: it carries across the
// workspace pages, stays out of the URL, and resets on reload or sign-out.
// React Query's client cache holds it; nothing is fetched.
export function useHiddenValues() {
  const queryClient = useQueryClient();

  const { data: hidden } = useQuery({
    queryKey: HIDDEN_VALUES_KEY,
    queryFn: () =>
      queryClient.getQueryData<boolean>(HIDDEN_VALUES_KEY) ?? false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    hidden,
    toggle: () => queryClient.setQueryData(HIDDEN_VALUES_KEY, !hidden),
  };
}
