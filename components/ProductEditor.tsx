"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Tag, Textarea } from "@posselect/ui";
import {
  PRODUCT_STATUS,
  SUBMISSION_STATUS,
  canEdit,
  groupIssues,
  isValidating,
} from "@/lib/labels";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import OptionsEditor from "@/components/OptionsEditor";
import IssueList from "@/components/IssueList";
import PolicySection from "@/components/PolicySection";
import { EMPTY_POLICY, POLICY_FIELDS, fromResponse, toRequest, validatePolicy, type PolicyForm, type PolicyResponse } from "@/lib/policy";
import type {
  Category,
  CategoryRequirement,
  ProductDetail,
  ProductStatus,
  Submission,
} from "@/lib/types";

/** 기본 입력칸 이름 = product.api 검수 이슈의 field 값(SubmissionValidator). 여기 없는 field 는 폼 위에 모인다. */
const BASE_FIELDS = ["categoryId", "name", "brand", "price", "listPrice", "stockQuantity", "imageUrls", "description"];

const DOCUMENT_LABELS: Record<string, string> = {
  COSMETICS_MANUFACTURE_REPORT: "화장품 제조업·책임판매업 등록증",
  FOOD_BUSINESS_LICENSE: "식품 영업신고증",
};

const POLL_INTERVAL_MS = 1500;
const POLL_MAX = 20;

type Form = {
  name: string;
  brand: string;
  price: string;
  listPrice: string;
  stockQuantity: string;
  freeShipping: boolean;
  description: string;
  imageUrls: string[];
};

const EMPTY_FORM: Form = {
  name: "",
  brand: "",
  price: "",
  listPrice: "",
  stockQuantity: "",
  freeShipping: false,
  description: "",
  imageUrls: [],
};

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json.error ?? json.message ?? text;
  } catch {
    return text || `요청이 실패했습니다 (${res.status})`;
  }
}


export default function ProductEditor({ productId: initialId }: { productId?: number }) {
  const [productId, setProductId] = useState<number | undefined>(initialId);
  const [productStatus, setProductStatus] = useState<ProductStatus | null>(null);
  // 옵션·SKU 표(partner.front#11)용. 옵션 구성·SKU 저장 후 reloadDetail 로 다시 읽는다.
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  // 마지막으로 받아 온 고시 항목. 카테고리를 해제하면 아래 `requirement` 가 파생으로 null 이 된다 —
  // effect 안에서 동기 setState 로 비우지 않는다(react-hooks/set-state-in-effect, gateway#286).
  const [fetchedRequirement, setFetchedRequirement] = useState<CategoryRequirement | null>(null);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  // 판매 정책(product.api#79) — 상품과 별도 리소스(/policy)로 읽고 쓴다.
  const [policy, setPolicy] = useState<PolicyForm>(EMPTY_POLICY);

  const [loading, setLoading] = useState(!!initialId);
  const [busy, setBusy] = useState<"" | "save" | "submit" | "upload">("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  // ── 초기 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/partner/categories", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!initialId) return;
    (async () => {
      try {
        const [pRes, aRes, sRes, polRes] = await Promise.all([
          fetch(`/api/partner/products/${initialId}`, { cache: "no-store" }),
          fetch(`/api/partner/products/${initialId}/attributes`, { cache: "no-store" }),
          fetch(`/api/partner/products/${initialId}/submission`, { cache: "no-store" }),
          fetch(`/api/partner/products/${initialId}/policy`, { cache: "no-store" }),
        ]);
        if (!pRes.ok) throw new Error(await readError(pRes));
        const p: ProductDetail = await pRes.json();
        setProductStatus(p.status);
        setDetail(p);
        setForm({
          name: p.name ?? "",
          brand: p.brand ?? "",
          price: p.price != null ? String(p.price) : "",
          listPrice: p.listPrice != null ? String(p.listPrice) : "",
          stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
          freeShipping: !!p.freeShipping,
          description: p.description ?? "",
          imageUrls: [...(p.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.imageUrl),
        });
        if (p.category) {
          setCategoryId(p.category.id);
          setParentId(p.category.parentId ?? p.category.id);
        }
        if (aRes.ok) {
          const list: { code: string; value: string | null }[] = await aRes.json();
          setAttributes(Object.fromEntries(list.map((a) => [a.code, a.value ?? ""])));
        }
        if (polRes.ok) setPolicy(fromResponse((await polRes.json()) as PolicyResponse));
        // 제출 이력이 없으면 404 다 — 정상.
        if (sRes.ok) setSubmission(await sRes.json());
      } catch (e) {
        setMessage({ kind: "error", text: `상품을 불러오지 못했습니다. ${(e as Error).message}` });
      } finally {
        setLoading(false);
      }
    })();
  }, [initialId]);

  // 옵션 구성·SKU 저장 뒤: 상품을 다시 읽어 SKU 표와 대표 가격·재고(SKU 에서 계산된 값)를 맞춘다.
  // 입력 중인 나머지 폼 값은 건드리지 않는다.
  const reloadDetail = useCallback(async () => {
    if (!productId) return;
    const res = await fetch(`/api/partner/products/${productId}`, { cache: "no-store" });
    if (!res.ok) return setMessage({ kind: "error", text: `상품을 다시 불러오지 못했습니다. ${await readError(res)}` });
    const p: ProductDetail = await res.json();
    setDetail(p);
    setForm((f) => ({ ...f, price: String(p.price), stockQuantity: String(p.stockQuantity) }));
    setMessage({ kind: "ok", text: "옵션·SKU 를 저장했습니다." });
  }, [productId]);

  // 카테고리가 정해지면 그 카테고리의 고시 항목을 가져온다.
  useEffect(() => {
    if (!categoryId) return;
    fetch(`/api/partner/categories/${categoryId}/requirement`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setFetchedRequirement)
      .catch(() => setFetchedRequirement(null));
  }, [categoryId]);
  const requirement = categoryId ? fetchedRequirement : null;

  // ── 파생 값 ──────────────────────────────────────────────────────────────
  const parents = useMemo(
    () => categories.filter((c) => c.parentId == null).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );
  const children = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories, parentId],
  );

  const editable = canEdit(productStatus, submission);
  const knownFields = useMemo(
    () => new Set([...BASE_FIELDS, ...POLICY_FIELDS, ...(requirement?.requiredAttributes.map((a) => a.code) ?? [])]),
    [requirement],
  );
  const { byField, general } = useMemo(
    () => groupIssues(submission?.status === "NEEDS_FIX" || submission?.status === "IN_REVIEW" ? submission.issues : [], knownFields),
    [submission, knownFields],
  );

  // ── 저장 / 제출 ─────────────────────────────────────────────────────────
  const validateLocally = (): string | null => {
    if (!categoryId) return "카테고리를 먼저 선택해 주세요.";
    if (!form.name.trim()) return "상품명을 입력해 주세요.";
    if (form.price === "" || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      return "판매가를 0 이상 숫자로 입력해 주세요.";
    }
    if (form.listPrice !== "" && (Number.isNaN(Number(form.listPrice)) || Number(form.listPrice) < 0)) {
      return "정가는 비우거나 0 이상 숫자로 입력해 주세요.";
    }
    if (!/^\d+$/.test(form.stockQuantity)) return "재고는 0 이상 정수로 입력해 주세요.";
    return validatePolicy(policy);
  };

  /** 상품(전체 교체) → 고시 항목 순으로 저장하고 상품 id 를 돌려준다. */
  const save = async (): Promise<number> => {
    const body = {
      categoryId,
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity),
      // PUT 은 전체 교체라 빠진 필드는 "비움"이다 — 이미지 목록은 빈 배열이라도 항상 보낸다.
      imageUrls: form.imageUrls,
      listPrice: form.listPrice === "" ? null : Number(form.listPrice),
      // 무료배송 표시는 판매 정책의 배송비에서 파생한다(서버도 정책이 있으면 정책을 따른다).
      freeShipping: policy.shippingFeeType === "FREE",
      brand: form.brand.trim() || null,
    };
    const res = await fetch(productId ? `/api/partner/products/${productId}` : "/api/partner/products", {
      method: productId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readError(res));
    const saved: ProductDetail = await res.json();
    const id = saved.id;
    setProductStatus(saved.status);
    setDetail(saved);
    if (!productId) {
      setProductId(id);
      // 새로고침해도 같은 상품을 보도록 주소만 바꾼다(재마운트하면 입력 중 상태를 잃는다).
      window.history.replaceState(null, "", `/partner/products/${id}`);
    }

    const codes = requirement?.requiredAttributes.map((a) => a.code) ?? [];
    const attrRes = await fetch(`/api/partner/products/${id}/attributes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attributes: codes.map((code) => ({ code, value: (attributes[code] ?? "").trim() })),
      }),
    });
    if (!attrRes.ok) throw new Error(`고시 항목 저장 실패: ${await readError(attrRes)}`);

    const polRes = await fetch(`/api/partner/products/${id}/policy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toRequest(policy)),
    });
    if (!polRes.ok) throw new Error(`판매 정책 저장 실패: ${await readError(polRes)}`);
    return id;
  };

  const handleSave = async () => {
    const invalid = validateLocally();
    if (invalid) return setMessage({ kind: "error", text: invalid });
    setBusy("save");
    setMessage(null);
    try {
      await save();
      setMessage({ kind: "ok", text: "임시저장했습니다. 검수를 받으려면 '검수 제출'을 눌러 주세요." });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  const pollSubmission = useCallback(async (id: number) => {
    for (let n = 0; n < POLL_MAX; n++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await fetch(`/api/partner/products/${id}/submission`, { cache: "no-store" });
      if (!res.ok) continue;
      const s: Submission = await res.json();
      setSubmission(s);
      if (!isValidating(s.status)) return s;
    }
    return null;
  }, []);

  const handleSubmit = async () => {
    const invalid = validateLocally();
    if (invalid) return setMessage({ kind: "error", text: invalid });
    setBusy("submit");
    setMessage(null);
    try {
      const id = await save();
      const res = await fetch(`/api/partner/products/${id}/submission`, { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      setMessage({ kind: "ok", text: "제출했습니다. 자동 검사 결과를 기다리는 중..." });
      const result = await pollSubmission(id);
      if (!result) {
        setMessage({ kind: "ok", text: "제출은 접수됐습니다. 자동 검사가 길어지고 있어 잠시 후 다시 확인해 주세요." });
      } else if (result.status === "NEEDS_FIX") {
        setMessage({ kind: "error", text: "보완이 필요한 항목이 있습니다. 표시된 입력칸을 고친 뒤 다시 제출해 주세요." });
      } else {
        setMessage({ kind: "ok", text: `검수 상태: ${SUBMISSION_STATUS[result.status]?.label ?? result.status}` });
      }
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      return setMessage({ kind: "error", text: "이미지는 5MB 이하만 올릴 수 있습니다." });
    }
    setBusy("upload");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/partner/upload", { method: "POST", body: data });
      if (!res.ok) throw new Error(await readError(res));
      const { imageUrl } = await res.json();
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, imageUrl] }));
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  if (loading) return <main className="max-w-3xl mx-auto p-6">불러오는 중...</main>;

  const disabled = !editable || busy !== "";
  // 옵션이 있으면 대표 가격·재고는 SKU 들에서 계산된 값이다 — 여기서 고쳐도 서버가 무시한다(product.api#47).
  const multiSku = (detail?.options.length ?? 0) > 0;
  const f = (field: string) => byField.get(field);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/partner/products" className="text-sm">← 내 상품</Link>
      </div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold">{productId ? "상품 수정" : "상품 등록"}</h1>
        {productStatus && <Tag variant={PRODUCT_STATUS[productStatus].variant}>{PRODUCT_STATUS[productStatus].label}</Tag>}
        {submission && (
          <Tag variant={SUBMISSION_STATUS[submission.status]?.variant ?? "neutral"}>
            검수: {SUBMISSION_STATUS[submission.status]?.label ?? submission.status}
          </Tag>
        )}
      </div>

      {!editable && (
        <p className="mb-4 p-3 text-sm" style={{ background: "var(--color-warning-bg)" }}>
          {productStatus && productStatus !== "DRAFT"
            ? "판매가 시작된 상품은 이 화면에서 수정할 수 없습니다. 변경이 필요하면 담당자에게 문의해 주세요."
            : "검수가 진행 중이라 수정할 수 없습니다. 결과가 나오면 다시 수정할 수 있습니다."}
        </p>
      )}

      {submission?.reviewNote && (
        <p className="mb-4 p-3 text-sm" style={{ background: "var(--color-danger-bg)" }}>
          심사 의견: {submission.reviewNote}
        </p>
      )}
      {general.length > 0 && (
        <div className="mb-4 p-3" style={{ background: "var(--color-danger-bg)" }}>
          <IssueList issues={general} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* 1) 카테고리 먼저 — 고시 항목이 카테고리에 따라 달라진다 */}
        <Field label="카테고리" required>
          <div className="flex gap-2">
            <select
              className="input"
              value={parentId ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setParentId(v);
                const hasChildren = categories.some((c) => c.parentId === v);
                setCategoryId(hasChildren ? null : v);
              }}
            >
              <option value="">대분류 선택</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {children.length > 0 && (
              <select
                className="input"
                value={categoryId ?? ""}
                disabled={disabled}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">소분류 선택</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <IssueList issues={f("categoryId")} />
        </Field>

        {/* 2) 고시 안내 */}
        {requirement && (
          <div className="p-3 text-sm" style={{ background: "var(--color-neutral-100)" }}>
            {requirement.requiredAttributes.length > 0 ? (
              <p>
                이 카테고리는 「전자상거래 등에서의 상품 등의 정보제공에 관한 고시」에 따라 아래{" "}
                <b>상품정보제공고시</b> 항목을 구매 전에 소비자에게 알려야 합니다. 모두 입력해야 검수를 통과합니다.
              </p>
            ) : (
              <p>이 카테고리는 별도 상품정보제공고시 입력 항목이 없습니다.</p>
            )}
            {requirement.restricted && (
              <p className="mt-2">
                판매 권한이 필요한 카테고리입니다
                {requirement.requiredDocuments.length > 0 &&
                  ` (필요 서류: ${requirement.requiredDocuments.map((d) => DOCUMENT_LABELS[d] ?? d).join(", ")})`}
                . 권한이 없으면 검수에서 보완 요청이 나옵니다 — 서류는 담당자에게 제출해 주세요.
              </p>
            )}
          </div>
        )}

        {/* 3) 기본 정보 */}
        <Field label="상품명" required error={!!f("name")}>
          <Input value={form.name} maxLength={200} disabled={disabled} onChange={(e) => set("name", e.target.value)} />
          <IssueList issues={f("name")} />
        </Field>
        <Field label="브랜드">
          <Input value={form.brand} maxLength={100} disabled={disabled} onChange={(e) => set("brand", e.target.value)} />
          <IssueList issues={f("brand")} />
        </Field>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <Field label="판매가(원)" required error={!!f("price")}>
            <Input inputMode="numeric" value={form.price} disabled={disabled || multiSku} onChange={(e) => set("price", e.target.value)} />
            <IssueList issues={f("price")} />
          </Field>
          <Field label="정가(원)" helpText="할인 전 가격. 없으면 비워 두세요.">
            <Input inputMode="numeric" value={form.listPrice} disabled={disabled} onChange={(e) => set("listPrice", e.target.value)} />
            <IssueList issues={f("listPrice")} />
          </Field>
          <Field label="재고" required error={!!f("stockQuantity")}>
            <Input inputMode="numeric" value={form.stockQuantity} disabled={disabled || multiSku} onChange={(e) => set("stockQuantity", e.target.value)} />
            <IssueList issues={f("stockQuantity")} />
          </Field>
        </div>
        {multiSku && (
          <p className="text-sm text-muted">옵션이 있는 상품은 판매가·재고를 아래 옵션·SKU 표에서 조합별로 고칩니다.</p>
        )}
        {/* 무료배송 여부는 아래 "판매 정책 > 배송비"에서 정한다(product.api#79). */}

        {/* 4) 이미지 */}
        <Field label="상품 이미지" required helpText="JPG·PNG·WEBP, 5MB 이하. 첫 번째 이미지가 대표 이미지입니다." error={!!f("imageUrls")}>
          <div className="flex gap-2 flex-wrap">
            {form.imageUrls.map((url, idx) => (
              <div key={url} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 직후 CDN 미리보기 */}
                <img src={url} alt={`상품 이미지 ${idx + 1}`} width={96} height={96} style={{ objectFit: "cover" }} />
                {editable && (
                  <button
                    type="button"
                    aria-label={`이미지 ${idx + 1} 삭제`}
                    onClick={() => set("imageUrls", form.imageUrls.filter((u) => u !== url))}
                    style={{ position: "absolute", top: 2, right: 2 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {editable && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              className="mt-2"
              onChange={(e) => {
                handleUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          )}
          {busy === "upload" && <p className="text-sm">업로드 중...</p>}
          <IssueList issues={f("imageUrls")} />
        </Field>

        <Field label="상세 설명">
          <Textarea rows={6} value={form.description} disabled={disabled} onChange={(e) => set("description", e.target.value)} />
          <IssueList issues={f("description")} />
        </Field>

        {/* 5) 고시 항목(동적) */}
        {requirement && requirement.requiredAttributes.length > 0 && (
          <fieldset className="flex flex-col gap-4" style={{ border: 0, padding: 0 }}>
            <legend className="font-bold mb-2">상품정보제공고시</legend>
            {requirement.requiredAttributes.map((a) => (
              <Field key={a.code} label={a.label} required={a.required} error={!!f(a.code)}>
                <Input
                  value={attributes[a.code] ?? ""}
                  disabled={disabled}
                  onChange={(e) => setAttributes((s) => ({ ...s, [a.code]: e.target.value }))}
                />
                <IssueList issues={f(a.code)} />
              </Field>
            ))}
          </fieldset>
        )}

        {/* 5-1) 판매 정책(product.api#79) */}
        <PolicySection
          policy={policy}
          set={(key, value) => setPolicy((p) => ({ ...p, [key]: value }))}
          disabled={disabled}
          issuesFor={f}
        />

        {/* 6) 옵션·SKU — 상품을 한 번 저장해야(id 가 생겨야) 구성할 수 있다 */}
        {detail ? (
          <OptionsEditor product={detail} editable={editable} readError={readError} onChanged={reloadDetail} />
        ) : (
          <p className="text-sm text-muted">옵션(색상·사이즈 등)은 임시저장한 뒤 설정할 수 있습니다.</p>
        )}

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} style={{ color: message.kind === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
            {message.text}
          </p>
        )}

        {editable && (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={disabled} onClick={handleSave}>
              {busy === "save" ? "저장 중..." : "임시저장"}
            </Button>
            <Button type="button" variant="primary" disabled={disabled} onClick={handleSubmit}>
              {busy === "submit" ? "제출 중..." : submission?.status === "NEEDS_FIX" ? "보완 후 재제출" : "검수 제출"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
