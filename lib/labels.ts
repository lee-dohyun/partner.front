import type { ProductStatus, Submission, SubmissionIssue, SubmissionStatus } from "./types";

type TagVariant = "accent" | "neutral" | "outline" | "success" | "warning" | "danger";

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; variant: TagVariant }> = {
  DRAFT: { label: "작성 중", variant: "outline" },
  LIVE: { label: "판매 중", variant: "success" },
  PAUSED: { label: "판매 중지", variant: "warning" },
  ARCHIVED: { label: "보관", variant: "neutral" },
};

export const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; variant: TagVariant }> = {
  DRAFT: { label: "미제출", variant: "outline" },
  SUBMITTED: { label: "제출됨", variant: "accent" },
  VALIDATING: { label: "자동 검사 중", variant: "accent" },
  NEEDS_FIX: { label: "보완 필요", variant: "danger" },
  IN_REVIEW: { label: "심사 중", variant: "accent" },
  LIVE: { label: "승인", variant: "success" },
  PAUSED: { label: "중지", variant: "warning" },
};

/** product.api PartnerProductService 와 같은 규칙: 검수가 진행 중이면 수정·제출 불가. */
const IN_PROGRESS: ReadonlySet<SubmissionStatus> = new Set(["SUBMITTED", "VALIDATING", "IN_REVIEW"]);

export function isReviewInProgress(status: SubmissionStatus | null | undefined): boolean {
  return !!status && IN_PROGRESS.has(status);
}

/** 수정 가능 = 상품이 DRAFT 이고 검수가 진행 중이 아님. 서버가 최종 판단(409)하고 화면은 미리 막을 뿐이다. */
export function canEdit(productStatus: ProductStatus | null, submission: Submission | null): boolean {
  if (productStatus !== null && productStatus !== "DRAFT") return false;
  return !isReviewInProgress(submission?.status);
}

/** 자동 검사가 끝나기를 기다릴 상태(이 동안은 이슈 목록이 아직 비어 있다). */
export function isValidating(status: SubmissionStatus | null | undefined): boolean {
  return status === "SUBMITTED" || status === "VALIDATING";
}

/**
 * 검수 이슈를 입력칸 옆에 붙이기 위해 field 별로 묶는다. field 가 없거나(판매자 상태 등) 화면에 없는
 * 입력칸을 가리키는 이슈는 "general" 로 모아 폼 위에 보여 준다 — 조용히 사라지지 않게.
 */
export function groupIssues(
  issues: SubmissionIssue[],
  knownFields: ReadonlySet<string>,
): { byField: Map<string, SubmissionIssue[]>; general: SubmissionIssue[] } {
  const byField = new Map<string, SubmissionIssue[]>();
  const general: SubmissionIssue[] = [];
  for (const issue of issues) {
    if (issue.field && knownFields.has(issue.field)) {
      byField.set(issue.field, [...(byField.get(issue.field) ?? []), issue]);
    } else {
      general.push(issue);
    }
  }
  return { byField, general };
}

export function formatWon(n: number | null | undefined): string {
  return n == null ? "-" : `${Number(n).toLocaleString("ko-KR")}원`;
}
