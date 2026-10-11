import { useQuery, type QueryKey } from "@tanstack/react-query";

// Pushes app state into a browser-only system (a cookie, analytics) through
// React Query instead of an effect: `sync` runs once per key after the page
// hydrates, again whenever the key changes, and never on the server.
export function useBrowserSync(
  key: QueryKey,
  sync: () => void,
  enabled = true,
) {
  useQuery({
    queryKey: ["browser-sync", ...key],
    queryFn: () => {
      sync();

      return null;
    },
    enabled,
    staleTime: Infinity,
    // An unmounted key is forgotten, so returning to it syncs again.
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
