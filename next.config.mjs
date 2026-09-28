// .ts 가 아니라 .mjs 다 — next.config.ts 는 `next start` 시점에 TypeScript 가 있어야 로드된다.
// 프로덕션 이미지는 devDependencies 를 prune 하므로 TypeScript 가 없고, 그러면 Next 가 런타임에
// 설치를 시도하다 힙 OOM 으로 죽는다(2026-09-28 첫 배포에서 실제로 CrashLoop).
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@posselect/ui"],
  poweredByHeader: false,
};

export default nextConfig;
