import { describe, expect, it } from "vitest";
import { parseSellerId, toPartnerClaims } from "./claims";

describe("parseSellerId", () => {
  it("양의 정수(숫자·문자열)만 받는다", () => {
    expect(parseSellerId(1)).toBe(1);
    expect(parseSellerId("42")).toBe(42);
  });
  it.each([0, -1, 1.5, "0", "01", "1e3", "abc", "", null, undefined, [1], {}])("거부: %j", (v) => {
    expect(parseSellerId(v)).toBeNull();
  });
});

describe("toPartnerClaims", () => {
  const base = { azp: "partner-front", sub: "u-1", seller_id: 1, preferred_username: "partner-test" };

  it("partner-front 가 발급했고 seller_id 가 있으면 통과", () => {
    expect(toPartnerClaims(base, "partner-front")).toEqual({
      sub: "u-1",
      sellerId: 1,
      username: "partner-test",
      email: undefined,
    });
  });
  it("다른 클라이언트가 발급한 토큰은 거부 — product.api 의 azp 고정과 같은 조건", () => {
    expect(toPartnerClaims({ ...base, azp: "account-console" }, "partner-front")).toBeNull();
  });
  it("seller_id 가 없는 계정은 거부", () => {
    const noSeller = { azp: base.azp, sub: base.sub };
    expect(toPartnerClaims(noSeller, "partner-front")).toBeNull();
  });
  it("sub 가 없으면 거부", () => {
    expect(toPartnerClaims({ ...base, sub: "" }, "partner-front")).toBeNull();
  });
});
