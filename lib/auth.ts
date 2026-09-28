import { createRemoteJWKSet, jwtVerify } from "jose";
import { CLIENT_ID, EXPECTED_ISSUER, KEYCLOAK_REALM_URL } from "./config";
import { type PartnerClaims, toPartnerClaims } from "./claims";

const JWKS = createRemoteJWKSet(new URL(`${KEYCLOAK_REALM_URL}/protocol/openid-connect/certs`));

export async function verifyPartnerToken(token: string): Promise<PartnerClaims | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: EXPECTED_ISSUER });
    return toPartnerClaims(payload as Record<string, unknown>, CLIENT_ID);
  } catch {
    return null;
  }
}

export type TokenSet = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
};

/** Keycloak 토큰 엔드포인트 호출(ROPC 로그인 / refresh 공용). 실패는 null. */
export async function requestToken(params: Record<string, string>): Promise<TokenSet | null> {
  const res = await fetch(`${KEYCLOAK_REALM_URL}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenSet;
}
