import { NextRequest, NextResponse } from "next/server";
import { CLIENT_ID, KEYCLOAK_REALM_URL, REFRESH_COOKIE } from "@/lib/config";
import { clearSessionCookies } from "@/lib/session";

/** 쿠키만 지우면 refresh 토큰은 만료까지 살아 있다 — Keycloak 세션도 같이 끊는다. */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    try {
      await fetch(`${KEYCLOAK_REALM_URL}/protocol/openid-connect/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: CLIENT_ID, refresh_token: refreshToken }),
        cache: "no-store",
      });
    } catch (e) {
      console.warn("[logout] Keycloak 세션 종료 실패 — 쿠키만 지운다", e);
    }
  }
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  clearSessionCookies(res);
  return res;
}
