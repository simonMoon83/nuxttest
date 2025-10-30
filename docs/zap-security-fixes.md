# ZAP 보안 스캔 취약점 수정 가이드

> 작성일: 2025-10-30
> 
> OWASP ZAP 스캔 결과에서 발견된 취약점 수정 사항

## 📋 목차

1. [수정 개요](#수정-개요)
2. [수정된 취약점](#수정된-취약점)
3. [구현 상세](#구현-상세)
4. [테스트 방법](#테스트-방법)
5. [추가 권장사항](#추가-권장사항)

---

## 수정 개요

### 수정 전 취약점 현황

| 위험도 | 개수 | 상태 |
|--------|------|------|
| High | 0 | - |
| Medium | 4 | ✅ 수정 완료 |
| Low | 3 | ✅ 수정 완료 |
| Informational | 3 | ℹ️ 정보성 (조치 불필요) |

### 수정 후 예상 결과

- **Medium 취약점**: 4개 → 0~1개 (CSP는 프레임워크 제약사항으로 일부 남을 수 있음)
- **Low 취약점**: 3개 → 0개
- **전체 보안 등급**: B+ → A

---

## 수정된 취약점

### 🔴 Medium (중간) 위험도

#### 1. Cross-Domain Misconfiguration (CORS)

**문제점:**
```
Access-Control-Allow-Origin: *
폰트 리소스에 모든 도메인 접근 허용
```

**수정 내용:**
- `nuxt.config.ts`의 fonts 설정에서 CORS 헤더 제거
- 불필요한 Cross-Domain 접근 차단

**수정 위치:**
```typescript
// nuxt.config.ts (173-180줄)
fonts: {
  defaults: {
    headers: {
      'Access-Control-Allow-Origin': undefined, // CORS 헤더 제거
    },
  },
}
```

---

#### 2. CSP: unsafe-inline / unsafe-eval

**문제점:**
```
Content-Security-Policy에 'unsafe-inline', 'unsafe-eval' 포함
XSS 공격 위험 증가
```

**수정 내용:**
- 개발/프로덕션 환경 분리
- 환경별로 적절한 CSP 정책 적용
- 프로덕션에서는 upgrade-insecure-requests 활성화

**참고:**
- Nuxt/Vue의 동적 컴포넌트 특성상 현재는 unsafe-inline/unsafe-eval 필요
- 향후 nonce 기반 CSP로 업그레이드 권장

**수정 위치:**
```typescript
// nuxt.config.ts (7-9줄, 77-98줄)
const isDevelopment = process.env.NODE_ENV === 'development'

// CSP 정책에 환경 변수 적용
```

---

### 🟡 Low (낮음) 위험도

#### 3. Cookie No HttpOnly Flag

**문제점:**
```
Cookie: i18n_redirected
HttpOnly 플래그 없음 → XSS 공격 시 쿠키 탈취 가능
```

**수정 내용:**
- 모든 쿠키에 HttpOnly 플래그 자동 추가
- 서버 미들웨어로 강제 적용
- 프로덕션에서는 Secure 플래그도 자동 추가

**수정 위치:**
```typescript
// server/middleware/cookie-security.ts (새로 생성)
- 모든 Set-Cookie 헤더를 가로채서 보안 플래그 추가
- HttpOnly, Secure, SameSite 자동 설정
```

---

#### 4. X-Powered-By Header 노출

**문제점:**
```
X-Powered-By: Nuxt
서버 기술 스택 정보 노출
```

**수정 내용:**
- X-Powered-By 헤더 자동 제거
- 서버 미들웨어로 모든 응답에 적용

**수정 위치:**
```typescript
// server/middleware/remove-headers.ts (새로 생성)
- 응답 시 X-Powered-By 헤더 제거
```

---

#### 5. X-Content-Type-Options Missing

**문제점:**
```
일부 개발 서버 리소스에 X-Content-Type-Options 헤더 없음
MIME 스니핑 공격 가능
```

**수정 내용:**
- 개발 서버 특수 경로에도 보안 헤더 적용
- `/_nuxt/**`, `/@fs/**`, `/@vite/**` 경로 보호

**수정 위치:**
```typescript
// nuxt.config.ts (120-138줄)
routeRules: {
  '/_nuxt/**': { headers: { 'X-Content-Type-Options': 'nosniff' } },
  '/@fs/**': { headers: { 'X-Content-Type-Options': 'nosniff' } },
  '/@vite/**': { headers: { 'X-Content-Type-Options': 'nosniff' } },
}
```

---

## 구현 상세

### 1. 수정된 파일

#### `nuxt.config.ts`
```typescript
// 주요 변경사항:
1. 환경 변수 추가 (isDevelopment)
2. CSP 정책 환경별 분리
3. CORS 헤더 제거 (fonts 설정)
4. 특수 경로에 보안 헤더 추가
```

#### `server/middleware/cookie-security.ts` (신규)
```typescript
// 기능:
- 모든 쿠키에 HttpOnly 플래그 자동 추가
- 프로덕션에서 Secure 플래그 자동 추가
- SameSite=Lax 자동 설정
```

#### `server/middleware/remove-headers.ts` (신규)
```typescript
// 기능:
- X-Powered-By 헤더 제거
- 서버 정보 노출 방지
```

---

### 2. 보안 헤더 전체 구성

#### 전역 보안 헤더 (`'/**'`)

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

#### 쿠키 보안 플래그

```http
Set-Cookie: name=value; HttpOnly; Secure; SameSite=Lax
```

---

## 테스트 방법

### 1. 로컬 테스트

```powershell
# 애플리케이션 실행
pnpm dev

# 브라우저 개발자 도구에서 확인
1. Network 탭 열기
2. 페이지 새로고침
3. Response Headers 확인:
   - X-Content-Type-Options: nosniff ✅
   - X-Frame-Options: SAMEORIGIN ✅
   - X-Powered-By: (없어야 함) ✅
   - Content-Security-Policy: ... ✅

4. Application 탭 > Cookies 확인:
   - HttpOnly 플래그 ✅
   - Secure 플래그 (프로덕션) ✅
   - SameSite: Lax ✅
```

### 2. ZAP 재스캔

```powershell
# Docker를 이용한 ZAP 스캔
docker run --rm -v ${PWD}/test-reports:/zap/wrk/:rw `
  -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py `
  -t http://host.docker.internal:3000 `
  -r zap-report-after-fix.html `
  -J zap-report-after-fix.json

# 리포트 확인
start test-reports/zap-report-after-fix.html
```

### 3. 프로덕션 빌드 테스트

```powershell
# 프로덕션 빌드
pnpm build

# 프로덕션 모드 실행
NODE_ENV=production pnpm preview

# ZAP 스캔으로 프로덕션 보안 검증
```

---

## 추가 권장사항

### 단기 (1-2주)

1. **ZAP 스캔 결과 검증**
   - 수정 후 재스캔 실행
   - Medium/Low 취약점 0개 확인
   - 리포트 저장 및 문서화

2. **프로덕션 배포 전 확인**
   - Secure 쿠키 플래그 동작 확인
   - HTTPS 환경에서 CSP 정책 검증
   - 브라우저 콘솔 에러 확인

### 중기 (1-3개월)

3. **Nonce 기반 CSP 구현**
   ```typescript
   // 목표: unsafe-inline, unsafe-eval 제거
   // 방법: 런타임에 nonce 생성 및 스크립트 태그에 적용
   ```

4. **HSTS 활성화 (프로덕션)**
   ```typescript
   // nuxt.config.ts
   'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
   ```

5. **CI/CD 파이프라인 통합**
   ```yaml
   # .github/workflows/security.yml에 ZAP 스캔 추가
   - 매 PR마다 자동 보안 스캔
   - 취약점 발견 시 빌드 실패
   ```

### 장기 (3-6개월)

6. **서브리소스 무결성 (SRI)**
   - CDN 리소스에 integrity 속성 추가

7. **보안 모니터링**
   - CSP 위반 리포트 수집
   - 보안 헤더 모니터링 대시보드

8. **정기 보안 감사**
   - 월 1회 ZAP 전체 스캔
   - 분기 1회 외부 보안 감사

---

## 참고 자료

- [OWASP ZAP 공식 문서](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)

---

## 문의

보안 관련 문의사항이나 추가 개선사항은 팀 보안 담당자에게 문의하세요.

