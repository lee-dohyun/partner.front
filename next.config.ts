import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@posselect/ui"],
  // 업로드는 route handler 가 직접 받는다(app/api/partner/upload). 크기 상한은 거기서 검사한다.
  poweredByHeader: false,
};

export default nextConfig;
