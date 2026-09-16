export function inviteToken(value: string) {
  try {
    return (
      new URLSearchParams(new URL(value).hash.slice(1)).get("convite") ??
      value.trim()
    );
  } catch {
    return value.trim();
  }
}
