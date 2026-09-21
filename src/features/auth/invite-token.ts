export function inviteToken(value: string) {
  try {
    const url = new URL(value);
    return (
      url.searchParams.get("convite") ??
      new URLSearchParams(url.hash.slice(1)).get("convite") ??
      value.trim()
    );
  } catch {
    return value.trim();
  }
}
