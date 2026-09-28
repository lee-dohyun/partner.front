/**
 * BFF 가 product.api `/api/partner/**` 로 중계해도 되는 요청 목록(allow-list).
 *
 * catch-all 라우트가 받은 경로를 그대로 넘기면, 나중에 product.api 에 파트너용이 아닌 경로가
 * `/api/partner` 아래 생기는 순간 그것까지 외부에 열린다. 그래서 화면이 실제로 쓰는 조합만 연다.
 */
const ID = "[1-9]\\d{0,18}";

const RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ["GET", /^products$/],
  ["POST", /^products$/],
  ["GET", new RegExp(`^products/${ID}$`)],
  ["PUT", new RegExp(`^products/${ID}$`)],
  ["GET", new RegExp(`^products/${ID}/attributes$`)],
  ["PUT", new RegExp(`^products/${ID}/attributes$`)],
  ["GET", new RegExp(`^products/${ID}/submission$`)],
  ["POST", new RegExp(`^products/${ID}/submission$`)],
  ["GET", new RegExp(`^categories/${ID}/requirement$`)],
];

export function isAllowed(method: string, path: string): boolean {
  return RULES.some(([m, re]) => m === method && re.test(path));
}
