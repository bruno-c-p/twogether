export function reportError(
  cause: unknown,
  details: { context?: string; componentStack?: string } = {},
) {
  const environment = typeof window === "undefined" ? "SERVER" : "CLIENT";

  const label = details.context
    ? `[${environment} ERROR] ${details.context}`
    : `[${environment} ERROR]`;

  const payload: unknown[] = [label, cause];

  if (details.componentStack) payload.push(details.componentStack);
  console.error(...payload);
}
