import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@posselect/ui";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "파트너센터 | PosSelect",
  description: "PosSelect 판매 파트너 상품 등록·검수 포털",
  icons: { icon: "https://image.posselect.com/cdn/favicons/favicon-transparent-red-256.png" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  // 메뉴 노출용 힌트일 뿐이다. 실제 접근 통제는 middleware 가 한다.
  const signedIn = jar.has(ACCESS_COOKIE) || jar.has(REFRESH_COOKIE);

  return (
    <html lang="ko">
      <body>
        <div className="max-w-5xl mx-auto" style={{ borderBottom: "1px solid var(--color-divider)" }}>
          <Nav brand="파트너센터">
            {signedIn ? (
              <>
                <Link href="/partner/products">내 상품</Link>
                <Link href="/partner/products/new">상품 등록</Link>
                <form action="/api/logout" method="post" style={{ display: "inline" }}>
                  <button type="submit" className="nav-link-button">로그아웃</button>
                </form>
              </>
            ) : (
              <Link href="/login">로그인</Link>
            )}
          </Nav>
        </div>
        {children}
      </body>
    </html>
  );
}
