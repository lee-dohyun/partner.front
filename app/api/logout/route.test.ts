// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// gateway#283 — 이 앱은 게이트웨이/Traefik 뒤에서 `next start` 로 돈다. 서버가 보는 요청 URL 은
// 사용자가 접속한 주소(partner.posselect.com)가 아니라 컨테이너 호스트(localhost:3000)라서,
// `new URL("/login", request.url)` 로 만든 절대 주소로 리다이렉트하면 사용자가 열리지 않는
// `https://localhost:3000/login` 으로 간다. Location 은 요청 URL 과 무관한 상대 경로여야 한다.
const fromContainer = (cookie?: string) =>
  new NextRequest("http://localhost:3000/api/logout", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/logout", () => {
  it("/login 으로 상대 경로 303 리다이렉트한다 — 요청 URL 의 호스트를 따르지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await POST(fromContainer());
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("세션 쿠키 두 개를 지운다", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const setCookie = (await POST(fromContainer())).headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/PARTNER_ACCESS_TOKEN=;/);
    expect(setCookie).toMatch(/PARTNER_REFRESH_TOKEN=;/);
  });

  it("refresh 토큰이 있으면 Keycloak 세션도 끊고, 그래도 같은 곳으로 간다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(fromContainer("PARTNER_REFRESH_TOKEN=r1"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/protocol\/openid-connect\/logout$/);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("Keycloak 호출이 실패해도 쿠키는 지우고 리다이렉트한다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const res = await POST(fromContainer("PARTNER_REFRESH_TOKEN=r1"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login");
    expect(res.headers.get("set-cookie") ?? "").toMatch(/PARTNER_ACCESS_TOKEN=;/);
  });
});
