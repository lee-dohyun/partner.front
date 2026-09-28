import { NextRequest, NextResponse } from "next/server";
import { forward, verifiedToken } from "@/lib/backend";
import { isAllowed } from "@/lib/proxy-rules";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, ctx: Ctx) {
  const token = verifiedToken(request);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const path = (await ctx.params).path.join("/");
  if (!isAllowed(request.method, path)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = request.method === "GET" ? undefined : await request.text();
  return forward(`/api/partner/${path}`, { method: request.method, token, body });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
