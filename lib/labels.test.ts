import { describe, expect, it } from "vitest";
import { canEdit, groupIssues } from "./labels";
import type { Submission, SubmissionIssue } from "./types";

const sub = (status: Submission["status"]): Submission => ({
  id: 1, status, reviewNote: null, updatedAt: "", issues: [],
});

describe("canEdit — product.api PartnerProductService 규칙과 같아야 한다", () => {
  it("새 상품·DRAFT·보완필요는 수정 가능", () => {
    expect(canEdit(null, null)).toBe(true);
    expect(canEdit("DRAFT", null)).toBe(true);
    expect(canEdit("DRAFT", sub("NEEDS_FIX"))).toBe(true);
  });
  it("검수 진행 중이거나 판매 중이면 불가", () => {
    expect(canEdit("DRAFT", sub("SUBMITTED"))).toBe(false);
    expect(canEdit("DRAFT", sub("VALIDATING"))).toBe(false);
    expect(canEdit("DRAFT", sub("IN_REVIEW"))).toBe(false);
    expect(canEdit("LIVE", null)).toBe(false);
  });
});

describe("groupIssues", () => {
  const issue = (id: number, field: string | null): SubmissionIssue => ({
    id, code: "X", field, message: "m", severity: "BLOCKING",
  });
  it("아는 입력칸은 칸 옆으로, 모르는 field·null 은 general 로 — 조용히 사라지지 않게", () => {
    const { byField, general } = groupIssues(
      [issue(1, "name"), issue(2, "capacity"), issue(3, null), issue(4, "name")],
      new Set(["name"]),
    );
    expect(byField.get("name")?.map((i) => i.id)).toEqual([1, 4]);
    expect(general.map((i) => i.id)).toEqual([2, 3]);
  });
});
