const tokenPattern = /^[0-9a-f]{64}$/;

export interface AccessSearch {
  access?: string;
  convite?: string;
}

export function validateAccessSearch(
  search: Record<string, unknown>,
): AccessSearch {
  const access =
    typeof search.access === "string" && tokenPattern.test(search.access)
      ? search.access
      : undefined;
  const convite =
    typeof search.convite === "string" && tokenPattern.test(search.convite)
      ? search.convite
      : undefined;
  return { access, convite };
}
