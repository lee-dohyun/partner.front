"use client";

import { useState } from "react";
import { Button, Field, Input } from "@posselect/ui";
import {
  MAX_OPTION_AXES,
  MAX_COMBINATIONS,
  combinationCount,
  optionVariants,
  toOptionsRequest,
  validateAxes,
  variantLabel,
  type AxisDraft,
} from "@/lib/options";
import type { ProductDetail, ProductVariant } from "@/lib/types";

/**
 * 옵션 구성 + SKU 표(partner.front#11, API: product.api#80).
 *
 * - 옵션이 없으면: 옵션 축(최대 3개)과 값을 받아 모든 조합의 SKU 를 한 번에 만든다.
 * - 옵션이 있으면: 조합별 가격·재고·판매 여부를 고친다. 옵션 재구성은 서버가 409 로 막는다
 *   (기존 SKU 를 지우면 재고 이력까지 지워진다) — 화면도 재구성 입력을 보여 주지 않는다.
 *
 * 저장 후에는 onChanged 로 상위가 상품을 다시 읽는다(대표 가격·재고가 바뀐다).
 */
export default function OptionsEditor({
  product,
  editable,
  readError,
  onChanged,
}: {
  product: ProductDetail;
  editable: boolean;
  readError: (res: Response) => Promise<string>;
  onChanged: () => void;
}) {
  const hasOptions = product.options.length > 0;
  return (
    <fieldset className="flex flex-col gap-4" style={{ border: 0, padding: 0 }}>
      <legend className="font-bold mb-2">옵션 · SKU</legend>
      {hasOptions ? (
        <VariantTable product={product} editable={editable} readError={readError} onChanged={onChanged} />
      ) : (
        <AxisForm product={product} editable={editable} readError={readError} onChanged={onChanged} />
      )}
    </fieldset>
  );
}

function AxisForm({
  product,
  editable,
  readError,
  onChanged,
}: {
  product: ProductDetail;
  editable: boolean;
  readError: (res: Response) => Promise<string>;
  onChanged: () => void;
}) {
  const [axes, setAxes] = useState<AxisDraft[]>([{ name: "", values: "" }]);
  const [price, setPrice] = useState(String(product.price ?? ""));
  const [stock, setStock] = useState(String(product.stockQuantity ?? "0"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!editable) {
    return <p className="text-sm text-muted">옵션이 없는 단일 상품입니다.</p>;
  }

  const count = combinationCount(axes);
  const problem = validateAxes(axes);

  const update = (i: number, patch: Partial<AxisDraft>) =>
    setAxes((list) => list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeAxis = (i: number) => setAxes((list) => list.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError("");
    const p = Number(price);
    const s = Number(stock);
    if (problem) return setError(problem);
    if (!Number.isFinite(p) || p < 0 || !Number.isInteger(s) || s < 0) {
      return setError("가격과 재고는 0 이상의 숫자로 입력해 주세요.");
    }
    if (!confirm(`옵션 조합 ${count}개가 만들어집니다. 옵션은 한 번 만들면 다시 구성할 수 없습니다. 계속할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/products/${product.id}/options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toOptionsRequest(axes, p, s)),
      });
      if (!res.ok) throw new Error(await readError(res));
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        색상·사이즈처럼 고를 수 있는 항목이 있으면 입력하세요. 값은 쉼표로 구분합니다(예: 블랙, 화이트). 모든 조합의
        SKU 가 만들어지고, 만든 뒤 조합별 가격·재고를 고칠 수 있습니다. 옵션이 없으면 비워 두세요.
      </p>
      {axes.map((a, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: "1fr 2fr auto" }}>
          <Input placeholder="옵션 이름 (예: 색상)" value={a.name} maxLength={50} onChange={(e) => update(i, { name: e.target.value })} />
          <Input placeholder="값 (예: 블랙, 화이트)" value={a.values} onChange={(e) => update(i, { values: e.target.value })} />
          <Button type="button" variant="ghost" disabled={axes.length === 1} onClick={() => removeAxis(i)}>
            삭제
          </Button>
        </div>
      ))}
      {axes.length < MAX_OPTION_AXES && (
        <Button type="button" variant="secondary" onClick={() => setAxes((l) => [...l, { name: "", values: "" }])}>
          옵션 종류 추가
        </Button>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Field label="조합별 기본 가격(원)">
          <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="조합별 기본 재고">
          <Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm">
        만들어질 조합: <b>{count}</b>개 (최대 {MAX_COMBINATIONS}개)
      </p>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <div>
        <Button type="button" variant="primary" disabled={busy || count === 0} onClick={submit}>
          {busy ? "만드는 중..." : "옵션 조합 만들기"}
        </Button>
      </div>
    </div>
  );
}

function VariantTable({
  product,
  editable,
  readError,
  onChanged,
}: {
  product: ProductDetail;
  editable: boolean;
  readError: (res: Response) => Promise<string>;
  onChanged: () => void;
}) {
  const rows = optionVariants(product.variants);
  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-2 text-sm font-bold"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto" }}
      >
        <span>조합</span>
        <span>SKU 코드</span>
        <span>가격(원)</span>
        <span>재고</span>
        <span>판매</span>
        <span />
      </div>
      {rows.map((v) => (
        <VariantRow key={v.id} productId={product.id} variant={v} editable={editable} readError={readError} onChanged={onChanged} />
      ))}
    </div>
  );
}

function VariantRow({
  productId,
  variant,
  editable,
  readError,
  onChanged,
}: {
  productId: number;
  variant: ProductVariant;
  editable: boolean;
  readError: (res: Response) => Promise<string>;
  onChanged: () => void;
}) {
  const [sku, setSku] = useState(variant.sku ?? "");
  const [price, setPrice] = useState(String(variant.price));
  const [stock, setStock] = useState(String(variant.stockQuantity));
  const [active, setActive] = useState(variant.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    const p = Number(price);
    const s = Number(stock);
    if (!Number.isFinite(p) || p < 0 || !Number.isInteger(s) || s < 0) {
      return setError("가격과 재고는 0 이상의 숫자로 입력해 주세요.");
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/products/${productId}/variants/${variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: sku.trim() || null, price: p, stockQuantity: s, active }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto" }}>
        <span className="text-sm">{variantLabel(variant)}</span>
        <Input aria-label="SKU 코드" value={sku} maxLength={100} disabled={!editable} onChange={(e) => setSku(e.target.value)} />
        <Input aria-label="가격" inputMode="numeric" value={price} disabled={!editable} onChange={(e) => setPrice(e.target.value)} />
        <Input aria-label="재고" inputMode="numeric" value={stock} disabled={!editable} onChange={(e) => setStock(e.target.value)} />
        <input aria-label="판매" type="checkbox" checked={active} disabled={!editable} onChange={(e) => setActive(e.target.checked)} />
        {editable ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={save}>
            {busy ? "저장 중" : "저장"}
          </Button>
        ) : (
          <span />
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
