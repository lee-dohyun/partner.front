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
  // `NextResponse.redirect(new URL("/login", request.url))` 를 쓰지 않는다 — 이 앱은 게이트웨이 뒤에서
  // 돌아 request.url 이 사용자가 접속한 주소가 아니라 `localhost:3000` 이라, 그렇게 만든 절대 주소로
  // 리다이렉트하면 사용자가 열리지 않는 `https://localhost:3000/login` 으로 간다(gateway#283).
  // 상대 경로 Location 은 브라우저가 현재 주소 기준으로 해석한다.
  const res = new NextResponse(null, { status: 303, headers: { Location: "/login" } });
  clearSessionCookies(res);
  return res;
}
