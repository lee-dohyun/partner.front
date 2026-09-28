# 스테이지는 base → builder → production 뿐이다. dev 스테이지를 두지 않는다 —
# CI 가 target 을 빠뜨리면 마지막 스테이지가 빌드되는데, admin.front 는 그 때문에 프로덕션에
# `next dev` 가 떠 있었다(2026-07-31). 마지막 스테이지가 production 이면 그 사고가 성립하지 않는다.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat git
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS builder
WORKDIR /app
# npm install 이 아니라 npm ci — 배포 이미지도 lock 에 고정한다(pr-check 만 고치면 재현성이 반쪽이다).
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
USER nextjs
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
