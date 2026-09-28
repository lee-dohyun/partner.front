// product.api 응답 형태(PartnerDtos / SubmissionDtos / ProductDtos). 필요한 필드만 옮겼다.
export type ProductStatus = "DRAFT" | "LIVE" | "PAUSED" | "ARCHIVED";
export type SubmissionStatus =
  | "DRAFT" | "SUBMITTED" | "VALIDATING" | "NEEDS_FIX" | "IN_REVIEW" | "LIVE" | "PAUSED";

export type PartnerProductSummary = {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  stockQuantity: number;
  thumbnailUrl: string | null;
  status: ProductStatus;
  submissionId: number | null;
  submissionStatus: SubmissionStatus | null;
  submissionUpdatedAt: string | null;
};

export type Category = { id: number; name: string; parentId: number | null; sortOrder: number | null };

export type CategoryRequirement = {
  categoryId: number;
  requiredAttributes: { code: string; label: string; required: boolean }[];
  requiredDocuments: string[];
  commissionRate: number | null;
  restricted: boolean;
};

export type ProductDetail = {
  id: number;
  category: { id: number; name: string; parentId: number | null } | null;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  images: { id: number; imageUrl: string; sortOrder: number }[];
  listPrice: number | null;
  freeShipping: boolean;
  brand: string | null;
  status: ProductStatus;
};

export type SubmissionIssue = {
  id: number;
  code: string;
  field: string | null;
  message: string;
  severity: "BLOCKING" | "WARNING";
};

export type Submission = {
  id: number;
  status: SubmissionStatus;
  reviewNote: string | null;
  updatedAt: string;
  issues: SubmissionIssue[];
};
