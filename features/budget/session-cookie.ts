export const sessionCookie = "twogether_session";

export function sessionCookieOptions(
  secure: boolean,
  session: string | undefined,
) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure,
    maxAge: session ? 30 * 86400 : 0,
  };
}
