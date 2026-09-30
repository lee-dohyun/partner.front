import { NextRequest, NextResponse } from "next/server";
import { PRODUCT_API_URL, VERIFIED_TOKEN_HEADER } from "./config";

/** proxy 가 검증해 넘긴 토큰. matcher 밖에서 불리면 null 이다(그땐 401 로 처리할 것). */
export function verifiedToken(request: NextRequest): string | null {
  return request.headers.get(VERIFIED_TOKEN_HEADER);
}

/**
 * product.api 로 중계하고 상태 코드·본문을 그대로 돌려준다. product.api 는 오류 본문을 평문으로
 * 주므로(ApiExceptionHandler) content-type 도 그대로 옮긴다 — 화면이 그 문장을 사용자에게 보여 준다.
 */
export async function forward(
  path: string,
  init: { method: string; token?: string; body?: string },
): Promise<NextResponse> {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${PRODUCT_API_URL}${path}`, {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
    });
  } catch (e) {
    console.error(`[BFF] product-api 호출 실패 ${init.method} ${path}`, e);
    return NextResponse.json({ error: "backend unavailable" }, { status: 502 });
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "text/plain; charset=utf-8" },
  });
}
