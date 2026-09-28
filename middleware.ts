import { NextRequest, NextResponse } from "next/server";
import { requestToken, verifyPartnerToken, type TokenSet } from "@/lib/auth";
import { ACCESS_COOKIE, REFRESH_COOKIE, VERIFIED_TOKEN_HEADER } from "@/lib/config";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

/**
 * [인증 게이트 — 이 앱의 보안 경계 전부]
 *
 * partner.posselect.com 은 게이트웨이의 protected-hosts 에 없다. 게이트웨이는 신원 헤더를 지우기만
 * 하고 아무것도 검사하지 않으므로, 이 matcher 밖에 만든 페이지·API 는 **무인증**이다.
 * 새 화면은 /partner/** 아래, 새 API 는 /api/partner/** 아래에만 둘 것.
 *
 * 최종 인가는 product.api 가 한다(토큰 재검증 + seller_id 로 데이터 범위 강제). 여기서는 로그인
 * 여부만 가르고, 검증된 토큰을 VERIFIED_TOKEN_HEADER 로 다운스트림에 넘긴다.
 */
export const config = {
  matcher: ["/partner/:path*", "/api/partner/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  let token = request.cookies.get(ACCESS_COOKIE)?.value;
  let claims = token ? await verifyPartnerToken(token) : null;

  // 액세스 토큰(5분)이 만료됐으면 refresh 토큰으로 조용히 갱신한다 — 폼 작성 중에 튕기지 않게.
  let refreshed: TokenSet | null = null;
  if (!claims) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      refreshed = await requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
      token = refreshed?.access_token;
      claims = token ? await verifyPartnerToken(token) : null;
    }
  }

  if (!claims || !token) {
    const res = isApi
      ? NextResponse.json({ error: "unauthorized" }, { status: 401 })
      : NextResponse.redirect(
          new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url),
        );
    clearSessionCookies(res);
    return res;
  }

  // 클라이언트가 같은 이름의 헤더를 보내 와도 믿지 않는다 — 항상 지우고 검증된 값으로 덮는다.
  const headers = new Headers(request.headers);
  headers.delete(VERIFIED_TOKEN_HEADER);
  headers.set(VERIFIED_TOKEN_HEADER, token);

  const res = NextResponse.next({ request: { headers } });
  if (refreshed) setSessionCookies(res, refreshed);
  return res;
}
