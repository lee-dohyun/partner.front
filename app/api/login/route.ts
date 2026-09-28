import { NextRequest, NextResponse } from "next/server";
import { requestToken, verifyPartnerToken } from "@/lib/auth";
import { setSessionCookies } from "@/lib/session";

export async function POST(request: NextRequest) {
  let username: unknown;
  let password: unknown;
  try {
    ({ username, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json({ error: "username/password required" }, { status: 400 });
  }

  const tokens = await requestToken({ grant_type: "password", username, password });
  if (!tokens) {
    // 잠금(brute-force 보호) 여부를 구분해 알려 주지 않는다 — 계정 존재 여부가 새어 나간다.
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  // 로그인은 됐지만 seller_id 가 없는 계정은 판매자 API 를 한 번도 못 부른다. 들여보내 놓고
  // 모든 화면에서 401 을 보게 하느니 여기서 명확히 거절한다.
  if (!(await verifyPartnerToken(tokens.access_token))) {
    return NextResponse.json({ error: "not a partner account" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookies(res, tokens);
  return res;
}
