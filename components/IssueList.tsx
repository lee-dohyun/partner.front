import type { SubmissionIssue } from "@/lib/types";

/** 검수 이슈를 해당 입력칸 바로 아래에 표시한다(BLOCKING=보완 필요, WARNING=참고). */
export default function IssueList({ issues }: { issues?: SubmissionIssue[] }) {
  if (!issues?.length) return null;
  return (
    <ul className="mt-1 text-sm" style={{ listStyle: "none", padding: 0 }}>
      {issues.map((i) => (
        <li
          key={i.id}
          style={{ color: i.severity === "BLOCKING" ? "var(--color-danger)" : "var(--color-warning)" }}
        >
          {i.severity === "BLOCKING" ? "보완 필요" : "참고"} · {i.message}
        </li>
      ))}
    </ul>
  );
}
