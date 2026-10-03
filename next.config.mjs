// .ts 가 아니라 .mjs 다 — next.config.ts 를 `next start` 로 띄우면 런타임에 TypeScript 가 있어야 로드된다.
// devDependencies 없는 이미지에서 Next 가 설치를 시도하다 힙 OOM 으로 죽었다(2026-09-28 첫 배포 CrashLoop).
// 지금은 standalone(node server.js)이라 설정이 빌드 때 구워지지만, `next start` 로 되돌릴 때를 위해 .mjs 를 유지한다.
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dockerfile 이 .next/standalone 산출물만 실어 node server.js 로 띄운다(gateway#247).
  output: "standalone",
  transpilePackages: ["@posselect/ui"],
  poweredByHeader: false,
};

export default nextConfig;
