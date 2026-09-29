/**
 * 옵션 구성 화면(partner.front#11) 순수 로직 — 단위 테스트 대상.
 * 한도·검사는 product.api PartnerProductService.validateAxes 와 같다. 서버가 최종 판단(400)하고
 * 화면은 미리 알려 줄 뿐이다.
 */
import type { ProductVariant } from "./types";

export const MAX_OPTION_AXES = 3;
export const MAX_COMBINATIONS = 100;

export type AxisDraft = { name: string; values: string };

/** "블랙, 화이트 ,," → ["블랙","화이트"] (쉼표 구분, 공백·빈 칸 제거) */
export function splitValues(raw: string): string[] {
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

export function combinationCount(axes: AxisDraft[]): number {
  return axes.reduce((n, a) => n * splitValues(a.values).length, axes.length === 0 ? 0 : 1);
}

/** 문제가 없으면 null, 있으면 사람이 읽을 사유. */
export function validateAxes(axes: AxisDraft[]): string | null {
  if (axes.length === 0 || axes.length > MAX_OPTION_AXES) return `옵션 종류는 1~${MAX_OPTION_AXES}개여야 합니다.`;
  const names = new Set<string>();
  for (const a of axes) {
    const name = a.name.trim();
    if (!name) return "옵션 이름을 입력해 주세요.";
    if (names.has(name)) return `옵션 이름이 중복됩니다: ${name}`;
    names.add(name);
    const values = splitValues(a.values);
    if (values.length === 0) return `'${name}' 옵션 값을 쉼표로 구분해 입력해 주세요.`;
    if (new Set(values).size !== values.length) return `'${name}' 옵션 값이 중복됩니다.`;
  }
  if (combinationCount(axes) > MAX_COMBINATIONS) return `옵션 조합은 ${MAX_COMBINATIONS}개를 넘을 수 없습니다.`;
  return null;
}

/** product.api 요청 본문 모양으로. */
export function toOptionsRequest(axes: AxisDraft[], price: number, stockQuantity: number) {
  return {
    options: axes.map((a) => ({ name: a.name.trim(), values: splitValues(a.values) })),
    price,
    stockQuantity,
  };
}

/** SKU 표에 보일 조합 이름. 옵션 없는 기본 SKU 는 "(기본)". */
export function variantLabel(v: ProductVariant): string {
  return v.optionValues.length ? v.optionValues.map((ov) => `${ov.optionName}: ${ov.value}`).join(" / ") : "(기본)";
}

/** 옵션이 구성된 상품의 SKU 표 — 옵션 조합이 있는 SKU 만(비활성화된 기본 SKU 는 숨김). */
export function optionVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter((v) => v.optionValues.length > 0);
}
