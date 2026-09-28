# partner.front

`partner.posselect.com` — PosSelect 판매 파트너(외부 판매자)가 상품을 직접 등록하고 검수를 받는 포털.
Next.js App Router, admin.front 와 같은 BFF 구조. 부모 이슈: lee-dohyun/gateway#214, 신설: lee-dohyun/gateway#279.

```
app/login, app/api/login|logout      Keycloak partner realm ROPC → httpOnly 쿠키(액세스+refresh)
middleware.ts                        /partner/** · /api/partner/** 인증 게이트 + 조용한 토큰 갱신
app/api/partner/[...path]            product.api /api/partner/** 중계(allow-list: lib/proxy-rules.ts)
app/api/partner/categories           카테고리 목록(product.api 공개 경로)
app/api/partner/upload               이미지 업로드 → MinIO cdn 버킷 products/partner/<sellerId>/ (→ image.posselect.com/cdn/...)
app/partner/products                 내 상품 목록 / 등록 / 수정(components/ProductEditor.tsx)
```

로컬 실행: `npm ci && npm run dev` (클러스터 주소는 `KEYCLOAK_REALM_URL`, `PRODUCT_API_URL` 로 덮어쓴다).
검증: `scripts/verify.sh` (typecheck + lint + test). 배포: main push → Docker Hub → self-hosted runner `kubectl set image`.
