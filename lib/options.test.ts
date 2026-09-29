import { describe, expect, it } from "vitest";
import { combinationCount, optionVariants, splitValues, toOptionsRequest, validateAxes, variantLabel } from "./options";

describe("splitValues", () => {
  it("쉼표 구분, 공백·빈 칸 제거", () => {
    expect(splitValues("블랙, 화이트 ,,")).toEqual(["블랙", "화이트"]);
  });
});

describe("combinationCount / validateAxes", () => {
  const ok = [
    { name: "색상", values: "블랙,화이트" },
    { name: "사이즈", values: "S,M,L" },
  ];
  it("조합 수는 값 개수의 곱", () => expect(combinationCount(ok)).toBe(6));
  it("정상 입력은 null", () => expect(validateAxes(ok)).toBeNull());
  it("축 0개·4개 이상 거부", () => {
    expect(validateAxes([])).not.toBeNull();
    expect(validateAxes([1, 2, 3, 4].map((i) => ({ name: `a${i}`, values: "x" })))).not.toBeNull();
  });
  it("이름 공백·중복, 값 없음·중복 거부", () => {
    expect(validateAxes([{ name: " ", values: "x" }])).not.toBeNull();
    expect(validateAxes([{ name: "a", values: "x" }, { name: "a", values: "y" }])).not.toBeNull();
    expect(validateAxes([{ name: "a", values: " , " }])).not.toBeNull();
    expect(validateAxes([{ name: "a", values: "x,x" }])).not.toBeNull();
  });
  it("조합 100개 초과 거부 (서버와 같은 한도)", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => i).join(",");
    expect(validateAxes([{ name: "a", values: eleven }, { name: "b", values: eleven }])).toMatch(/100/);
  });
});

describe("toOptionsRequest", () => {
  it("서버 요청 모양으로", () => {
    expect(toOptionsRequest([{ name: " 색상 ", values: "블랙, 화이트" }], 1000, 3)).toEqual({
      options: [{ name: "색상", values: ["블랙", "화이트"] }],
      price: 1000,
      stockQuantity: 3,
    });
  });
});

describe("variantLabel / optionVariants", () => {
  const base = { id: 1, sku: null, price: 1, active: false, stockQuantity: 0, optionValues: [] };
  const combo = {
    ...base,
    id: 2,
    active: true,
    optionValues: [
      { optionId: 1, optionName: "색상", valueId: 1, value: "블랙" },
      { optionId: 2, optionName: "사이즈", valueId: 3, value: "S" },
    ],
  };
  it("조합 이름", () => {
    expect(variantLabel(combo)).toBe("색상: 블랙 / 사이즈: S");
    expect(variantLabel(base)).toBe("(기본)");
  });
  it("옵션 없는 기본 SKU 는 표에서 숨긴다", () => expect(optionVariants([base, combo]).map((v) => v.id)).toEqual([2]));
});
