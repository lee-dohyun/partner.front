# 스테이지는 base → deps → builder → production 뿐이다. dev 스테이지를 두지 않는다 —
# CI 가 target 을 빠뜨리면 마지막 스테이지가 빌드되는데, admin.front 는 그 때문에 프로덕션에
# `next dev` 가 떠 있었다(2026-07-31). 마지막 스테이지가 production 이면 그 사고가 성립하지 않는다.
FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat git
WORKDIR /app
COPY package.json package-lock.json ./
# npm install 이 아니라 npm ci — 배포 이미지도 lock 에 고정한다(pr-check 만 고치면 재현성이 반쪽이다).
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build

FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# 런타임은 node 만 쓴다. 베이스 이미지에 딸린 npm·yarn·corepack 은 지운다 - 이미지 스캔 경고의
# 대부분이 npm 자신의 node_modules 였고, 침해 시 공격자가 쓸 도구이기도 하다(gateway#247).
# apk upgrade: 베이스 이미지 태그가 갱신되기 전에 나온 OS 패키지 수정본(openssl 등)을 받는다.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    rm -rf /usr/local/lib/node_modules /opt/yarn-v* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg && \
    apk upgrade --no-cache

# next.config 의 output: "standalone" 산출물만 싣는다 - 빌드 도구와 devDependencies 는 들어가지 않는다.
# .next 는 런타임 사용자 소유여야 한다(캐시 쓰기).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
