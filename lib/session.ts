import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./config";
import type { TokenSet } from "./auth";

const BASE = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/**
 * 액세스 토큰 수명은 realm 설정상 5분이다. 쿠키를 그것만 두면 상품 등록 폼을 쓰다가 5분 만에
 * 로그인 화면으로 튕긴다 — 그래서 refresh 토큰을 함께 두고 proxy 가 조용히 갱신한다.
 */
export function setSessionCookies(res: NextResponse, tokens: TokenSet) {
  res.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...BASE, maxAge: tokens.expires_in });
  if (tokens.refresh_token) {
    res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      ...BASE,
      maxAge: tokens.refresh_expires_in ?? 1800,
    });
  }
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}
