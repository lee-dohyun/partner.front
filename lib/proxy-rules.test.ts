import { describe, expect, it } from "vitest";
import { isAllowed } from "./proxy-rules";

describe("BFF 중계 allow-list", () => {
  it.each([
    ["GET", "products"],
    ["POST", "products"],
    ["GET", "products/12"],
    ["PUT", "products/12"],
    ["GET", "products/12/attributes"],
    ["PUT", "products/12/attributes"],
    ["GET", "products/12/submission"],
    ["POST", "products/12/submission"],
    ["GET", "categories/9105/requirement"],
    ["PUT", "products/12/options"],
    ["PUT", "products/12/variants/34"],
  ])("허용: %s %s", (m, p) => expect(isAllowed(m, p)).toBe(true));

  it.each([
    ["DELETE", "products/12"],
    ["PUT", "products"],
    ["GET", "products/0"],
    ["GET", "products/abc"],
    ["GET", "products/12/../../admin"],
    ["GET", "products/12/submission/extra"],
    ["GET", "sellers"],
    ["GET", ""],
    ["POST", "categories/1/requirement"],
    ["GET", "products/12/options"],
    ["DELETE", "products/12/variants/34"],
    ["PUT", "products/12/variants/abc"],
  ])("거부: %s %s", (m, p) => expect(isAllowed(m, p)).toBe(false));
});
