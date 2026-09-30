// 클러스터 내부 주소. 토큰 발급·JWKS 조회는 내부 DNS 로 하지만, Keycloak 이 토큰에 박는 issuer 는
// (내부 URL 로 요청해도) 항상 공개 URL 이므로 검증 기준은 공개 URL 이다(admin.front 와 같은 이유).
export const KEYCLOAK_REALM_URL =
  process.env.KEYCLOAK_REALM_URL ??
  "http://keycloak-service.keycloak.svc.cluster.local/realms/partner";
export const EXPECTED_ISSUER =
  process.env.KEYCLOAK_EXPECTED_ISSUER ?? "https://keycloak.posselect.com/realms/partner";
export const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? "partner-front";

export const PRODUCT_API_URL =
  process.env.PRODUCT_API_URL ?? "http://product-api.customer.svc.cluster.local:8080";

export const ACCESS_COOKIE = "PARTNER_ACCESS_TOKEN";
export const REFRESH_COOKIE = "PARTNER_REFRESH_TOKEN";

/**
 * proxy 가 **검증을 마친** 액세스 토큰을 다운스트림(route handler·서버 컴포넌트)에 넘기는 헤더.
 * 클라이언트가 같은 이름으로 보내도 proxy 가 항상 지우고 다시 쓴다 — 그래서 matcher 밖에서는
 * 이 헤더를 믿으면 안 된다.
 */
export const VERIFIED_TOKEN_HEADER = "x-partner-verified-token";
