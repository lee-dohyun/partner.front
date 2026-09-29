"use client";

import { Field, Input } from "@posselect/ui";
import IssueList from "@/components/IssueList";
import { KC_CERT_TYPES, SHIPPING_FEE_TYPES, TAX_TYPES, type PolicyForm } from "@/lib/policy";
import type { SubmissionIssue } from "@/lib/types";

/**
 * 판매 정책 입력(product.api#79) — 과세·배송·교환/반품·KC 인증·판매 조건.
 * 배송비·반품비·반품지는 구매 전에 소비자에게 알려야 하는 정보라 검수에서 필수다(과세 구분 포함).
 * 값 목록·뜻은 gateway Wiki Glossary §8-2.
 */
export default function PolicySection({
  policy,
  set,
  disabled,
  issuesFor,
}: {
  policy: PolicyForm;
  set: (key: keyof PolicyForm, value: string) => void;
  disabled: boolean;
  issuesFor: (field: string) => SubmissionIssue[] | undefined;
}) {
  const text = (key: keyof PolicyForm, label: string, opts: { required?: boolean; helpText?: string; numeric?: boolean } = {}) => (
    <Field label={label} required={opts.required} helpText={opts.helpText} error={!!issuesFor(key)}>
      <Input
        inputMode={opts.numeric ? "numeric" : undefined}
        value={policy[key]}
        disabled={disabled}
        onChange={(e) => set(key, e.target.value)}
      />
      <IssueList issues={issuesFor(key)} />
    </Field>
  );
  const select = (key: keyof PolicyForm, label: string, options: { value: string; label: string }[], required = false) => (
    <Field label={label} required={required} error={!!issuesFor(key)}>
      <select className="input" value={policy[key]} disabled={disabled} onChange={(e) => set(key, e.target.value)}>
        <option value="">선택하세요</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <IssueList issues={issuesFor(key)} />
    </Field>
  );
  const grid = { gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" };
  const type = policy.shippingFeeType;

  return (
    <fieldset className="flex flex-col gap-4" style={{ border: 0, padding: 0 }}>
      <legend className="font-bold mb-2">판매 정책</legend>

      {select("taxType", "과세 구분", TAX_TYPES, true)}

      <div className="grid gap-4" style={grid}>
        {select("shippingFeeType", "배송비", SHIPPING_FEE_TYPES, true)}
        {(type === "PAID" || type === "CONDITIONAL") && text("shippingFee", "배송비(원)", { required: true, numeric: true })}
        {type === "CONDITIONAL" &&
          text("freeShippingThreshold", "무료배송 기준 금액(원)", { required: true, numeric: true, helpText: "이 금액 이상 구매 시 무료" })}
        {text("shippingLeadDays", "출고 소요일", { numeric: true, helpText: "결제 후 출고까지 영업일" })}
      </div>
      <div className="grid gap-4" style={grid}>
        {text("jejuExtraFee", "제주 추가 배송비(원)", { numeric: true })}
        {text("islandExtraFee", "도서산간 추가 배송비(원)", { numeric: true })}
      </div>

      <div className="grid gap-4" style={grid}>
        {text("returnShippingFee", "반품 배송비(편도, 원)", { required: true, numeric: true })}
        {text("exchangeShippingFee", "교환 배송비(왕복, 원)", { numeric: true })}
      </div>
      {text("returnAddress", "반품·교환 주소", { required: true })}

      <div className="grid gap-4" style={grid}>
        {select("kcCertType", "KC 인증", KC_CERT_TYPES)}
        {policy.kcCertType && policy.kcCertType !== "NONE" && text("kcCertNumber", "KC 인증번호", { required: true })}
      </div>

      <div className="grid gap-4" style={grid}>
        <Field label="판매 시작" helpText="비우면 제한 없음">
          <Input type="datetime-local" value={policy.saleStartAt} disabled={disabled} onChange={(e) => set("saleStartAt", e.target.value)} />
        </Field>
        <Field label="판매 종료" helpText="비우면 제한 없음">
          <Input type="datetime-local" value={policy.saleEndAt} disabled={disabled} onChange={(e) => set("saleEndAt", e.target.value)} />
        </Field>
        {text("maxPurchaseQuantity", "1회 최대 구매 수량", { numeric: true, helpText: "비우면 제한 없음" })}
      </div>
    </fieldset>
  );
}
