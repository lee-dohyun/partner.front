"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, EmptyState, Table, Tag } from "@posselect/ui";
import { PRODUCT_STATUS, SUBMISSION_STATUS, formatWon } from "@/lib/labels";
import type { PartnerProductSummary } from "@/lib/types";

export default function MyProductsPage() {
  const [items, setItems] = useState<PartnerProductSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/products", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        setItems(await res.json());
      })
      .catch(() => setError("상품 목록을 불러오지 못했습니다."));
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">내 상품</h1>
        <Link href="/partner/products/new">
          <Button variant="primary">상품 등록</Button>
        </Link>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-danger)" }}>{error}</p>}
      {!error && items === null && <p>불러오는 중...</p>}
      {items?.length === 0 && (
        <EmptyState icon="📦" title="등록한 상품이 없습니다" description="상품을 등록하고 검수를 요청해 보세요." />
      )}

      {items && items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>상품</th>
                <th>판매가</th>
                <th>재고</th>
                <th>상품 상태</th>
                <th>검수</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/partner/products/${p.id}`} className="flex items-center gap-2">
                      {p.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- 외부 CDN 썸네일, next/image 도메인 설정 불필요
                        <img src={p.thumbnailUrl} alt="" width={40} height={40} style={{ objectFit: "cover" }} />
                      )}
                      <span>{p.name}</span>
                    </Link>
                  </td>
                  <td>{formatWon(p.price)}</td>
                  <td>{p.stockQuantity}</td>
                  <td>
                    <Tag variant={PRODUCT_STATUS[p.status]?.variant ?? "neutral"}>
                      {PRODUCT_STATUS[p.status]?.label ?? p.status}
                    </Tag>
                  </td>
                  <td>
                    {p.submissionStatus ? (
                      <Tag variant={SUBMISSION_STATUS[p.submissionStatus]?.variant ?? "neutral"}>
                        {SUBMISSION_STATUS[p.submissionStatus]?.label ?? p.submissionStatus}
                      </Tag>
                    ) : (
                      <Tag variant="outline">미제출</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </main>
  );
}
