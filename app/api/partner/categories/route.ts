import { NextRequest, NextResponse } from "next/server";
import { forward, verifiedToken } from "@/lib/backend";

/** 카테고리 목록은 product.api 공개 경로에서 가져온다(파트너 경로에는 목록이 없다). */
export async function GET(request: NextRequest) {
  if (!verifiedToken(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return forward("/api/categories", { method: "GET" });
}
