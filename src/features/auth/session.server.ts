import {
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import {
  sessionCookie,
  sessionCookieOptions,
} from "@/features/auth/session-cookie";

export { sessionCookie, sessionCookieOptions };

export function sessionToken() {
  return getCookie(sessionCookie) ?? "";
}

export function applySessionCookie(session: string | undefined) {
  setCookie(
    sessionCookie,
    session ?? "",
    sessionCookieOptions(getRequestProtocol() === "https", session),
  );
}
