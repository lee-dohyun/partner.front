/**
 * 토큰 클레임 해석 — jose 와 네트워크에 의존하지 않는 순수 함수만 둔다(단위 테스트 대상).
 *
 * product.api 의 PartnerJwtVerifier 와 **같은 조건**을 본다: azp=partner-front, seller_id 가 양의 정수.
 * 이 앱의 검사는 화면용 1차 게이트일 뿐이고 최종 판단은 product.api 가 토큰을 재검증해서 한다.
 */
export type PartnerClaims = {
  sub: string;
  sellerId: number;
  username?: string;
  email?: string;
};

export function parseSellerId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^[1-9]\d{0,17}$/.test(raw)) {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

export function toPartnerClaims(
  payload: Record<string, unknown>,
  expectedClientId: string,
): PartnerClaims | null {
  if (payload.azp !== expectedClientId) return null;
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  const sellerId = parseSellerId(payload.seller_id);
  if (sellerId === null) return null;
  return {
    sub: payload.sub,
    sellerId,
    username: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
