# 프로젝트 개선 계획 (Phase 1, 2, 3)

## 개요

이 문서는 Nuxt 3 + MSSQL 엔터프라이즈 애플리케이션의 보안, 안정성, 운영 효율성을 개선하기 위한 단계별 계획입니다.

**전체 분석 리포트**: 전체 60개 이상의 보완 사항을 발견했으며, 우선순위별로 3단계로 나누어 진행합니다.

**총 예상 기간**: 약 3개월 (63.5 작업일)

---

## Phase 1: 긴급 보안 패치 (1-2주)

### 목표
프로덕션 배포 전 반드시 해결해야 할 CRITICAL/HIGH 보안 취약점 수정

### 예상 소요 시간
8.5 작업일

### 작업 항목

#### 1.1 JWT Secret 검증 (1일)
**문제점**:
- 하드코딩된 기본값 (`'your-secret-key-change-in-production'`)
- 환경 변수 미설정 시 예측 가능한 토큰 생성
- 모든 JWT 토큰 위조 가능

**해결 방안**:
- 개발 환경: 기본값 허용하되 경고 로그 출력
- 프로덕션 환경: JWT_SECRET 필수, 없으면 앱 시작 거부
- 최소 32자 이상 검증

**수정 파일**:
- 신규: `server/utils/env-validator.ts`
- 수정: `server/utils/jwt.ts`

**구현 코드**:
```typescript
// server/utils/env-validator.ts
export function validateJwtSecret() {
  const secret = process.env.JWT_SECRET
  const isDev = process.env.NODE_ENV === 'development'

  if (!secret || secret === 'your-secret-key-change-in-production') {
    if (!isDev) {
      throw new Error('JWT_SECRET must be set in production environment')
    }
    console.warn('⚠️  WARNING: Using default JWT_SECRET in development mode')
  }

  if (!isDev && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production')
  }
}
```

---

#### 1.2 Rate Limiting (2일)
**문제점**:
- 로그인 API에 brute force 공격 방어 없음
- 채팅, 파일 업로드 API 무제한 요청 가능
- DoS 공격에 취약

**해결 방안**:
- 인메모리 Map 기반 rate limiter 구현
- 로그인: 5회/5분 (IP 기반)
- 일반 API: 60회/1분 (IP 기반)
- 로그인 성공 시 카운터 리셋

**수정 파일**:
- 신규: `server/utils/rate-limiter.ts`
- 수정: `server/api/auth/login.post.ts`

**주요 기능**:
```typescript
// IP당 제한, 윈도우 만료 자동 리셋
checkLoginRateLimit(ip) // 5회/5분
checkApiRateLimit(ip)   // 60회/1분
rateLimiter.reset(ip)   // 성공 시 리셋
```

---

#### 1.3 로그아웃 인증 추가 (0.5일)
**문제점**:
- 로그아웃 API가 인증 없이 호출 가능
- CSRF 공격에 취약
- 누구나 다른 사용자 로그아웃 시킬 수 있음

**해결 방안**:
- `getCurrentUserId(event)` 호출로 인증 검증
- 유효한 토큰 없으면 401 에러

**수정 파일**:
- `server/api/auth/logout.post.ts`

---

#### 1.4 파일 업로드 보안 강화 (2일)
**문제점**:
- Path traversal 공격 가능 (`../../../etc/passwd`)
- 확장자만 검증, 실제 파일 내용 검증 안 함
- MIME 타입 위조 가능 (`.jpg.exe`)

**해결 방안**:
- `file-type` 라이브러리로 실제 파일 내용 검증
- 파일명 sanitization (경로 구분자 제거)
- MIME 타입과 확장자 일치 확인
- 절대 경로 검증

**수정 파일**:
- 신규: `server/utils/file-validator.ts`
- 수정: `server/api/chats/[id]/attach.post.ts`

**설치 패키지**:
```bash
pnpm add file-type mime-types
pnpm add -D @types/mime-types
```

---

#### 1.5 Stored Procedure SQL Injection 방어 (1일)
**문제점**:
- 파라미터 타입이 자동 추론되어 타입 혼동 공격 가능
- 프로시저명 검증 부족

**해결 방안**:
- 파라미터 타입 명시 (`sql.Int`, `sql.NVarChar` 등)
- 프로시저명 화이트리스트 검증 (alphanumeric + underscore만 허용)

**수정 파일**:
- `server/utils/storedProcedure.ts`

---

#### 1.6 XSS 방어 (1.5일)
**문제점**:
- 채팅 메시지에 HTML/JavaScript 코드 저장 가능
- `<script>alert('XSS')</script>` 공격 가능
- 렌더링 시 실행됨

**해결 방안**:
- `isomorphic-dompurify`로 HTML sanitization
- 안전한 태그만 허용 (`<b>`, `<i>`, `<em>` 등)
- 위험한 속성 제거 (`onclick`, `onerror` 등)

**수정 파일**:
- 신규: `server/utils/sanitize.ts`
- 수정: `server/api/chats/[id]/message.post.ts`

**설치 패키지**:
```bash
pnpm add isomorphic-dompurify
```

---

#### 1.7 환경 변수 문서화 (0.5일)
**문제점**:
- `.env.example`에 JWT_SECRET 없음
- 보안 설정 가이드 부족

**해결 방안**:
- JWT_SECRET 필수 표시 및 생성 방법 안내
- COOKIE_SECURE 설정 추가
- Rate limiting 설명 추가

**수정 파일**:
- `docs/env.example`

---

### Phase 1 파일 목록

#### 신규 파일 (4개)
1. `server/utils/env-validator.ts` - JWT Secret 검증
2. `server/utils/rate-limiter.ts` - Rate limiting
3. `server/utils/file-validator.ts` - 파일 업로드 보안
4. `server/utils/sanitize.ts` - XSS 방어

#### 수정 파일 (7개)
1. `server/utils/jwt.ts` - 검증 로직 추가
2. `server/api/auth/login.post.ts` - Rate limiting 적용
3. `server/api/auth/logout.post.ts` - 인증 추가
4. `server/api/chats/[id]/attach.post.ts` - 파일 검증 적용
5. `server/api/chats/[id]/message.post.ts` - XSS 방어 적용
6. `server/utils/storedProcedure.ts` - SQL 타입 명시
7. `docs/env.example` - 문서화

#### 설치 패키지
```bash
pnpm add file-type mime-types isomorphic-dompurify
pnpm add -D @types/mime-types
```

### Breaking Changes
없음 (하위 호환성 유지)

### 주의사항
- 개발 환경에서는 기본값 허용 (경고 로그만)
- 프로덕션에서는 엄격한 검증
- 기존 기능 동작 유지

---

## Phase 2: 안정성 개선 (1-2개월)

### 목표
시스템 안정성 향상, 에러 핸들링 표준화, 테스트 커버리지 확보

### 예상 소요 시간
31 작업일

### 작업 항목

#### 2.1 에러 핸들링 표준화 (5일)
**문제점**:
- 에러 응답 형식 불일치
- 클라이언트에 내부 에러 노출
- 일부 API만 try-catch 처리

**해결 방안**:
- `ApiResponse<T>` 타입 정의
- 글로벌 에러 핸들러
- 표준화된 에러 코드

**신규 파일**:
- `server/types/api-response.ts`
- `server/utils/error-handler.ts`
- `server/middleware/error-handler.ts`

**수정 파일**:
- 모든 API 엔드포인트 (try-catch 추가)

**Breaking Change**: ⚠️ API 응답 형식 변경 (클라이언트 수정 필요)

---

#### 2.2 트랜잭션 헬퍼 (3일)
**문제점**:
- 트랜잭션 사용 불일치
- 데이터 정합성 보장 안 됨
- 중복 코드

**해결 방안**:
- `withTransaction<T>()` 헬퍼 함수
- 자동 commit/rollback
- 타입 안전성

**신규 파일**:
- `server/utils/transaction.ts`

**수정 파일**:
- 트랜잭션 필요한 모든 API

---

#### 2.3 데이터베이스 Health Check (1일)
**문제점**:
- 서버 정상이어도 DB 연결 끊김 감지 못 함
- 모니터링 불가능

**해결 방안**:
- `/api/health` 엔드포인트
- DB 연결 상태, 응답 시간 체크
- Docker HEALTHCHECK 연동

**신규 파일**:
- `server/api/health.get.ts`
- `server/utils/health-check.ts`

---

#### 2.4 비밀번호 정책 강화 (2일)
**문제점**:
- 최소 6자만 요구 (너무 약함)
- 복잡도 요구사항 없음

**해결 방안**:
- 최소 12자 이상
- 대소문자, 숫자, 특수문자 필수
- 검증 헬퍼 함수

**신규 파일**:
- `server/utils/password-policy.ts`

**수정 파일**:
- `server/api/users/create.post.ts`

---

#### 2.5 쿼리 최적화 (3일)
**문제점**:
- N+1 쿼리 (역할 조회 시 권한 반복 조회)
- 대량 데이터 시 성능 저하

**해결 방안**:
- JOIN으로 단일 쿼리화
- 결과 그룹화

**수정 파일**:
- `server/api/roles/index.get.ts`

---

#### 2.6 SSE 타임아웃 추가 (1일)
**문제점**:
- SSE 연결 무한 유지
- 메모리 누수 위험

**해결 방안**:
- 1시간 타임아웃
- 자동 연결 종료

**수정 파일**:
- `server/api/chats/stream.get.ts`

---

#### 2.7 마이그레이션 시스템 (4일)
**문제점**:
- 스키마 변경 추적 불가
- 버전 관리 없음

**해결 방안**:
- `schema_version` 테이블
- 마이그레이션 파일 시스템
- 자동 실행

**신규 파일**:
- `server/utils/migrations.ts`
- `server/migrations/001-add-schema-version.ts`
- `server/migrations/002-add-password-changed-at.ts`

**수정 파일**:
- `server/utils/db.ts`

---

#### 2.8 첫 로그인 비밀번호 변경 (2일)
**문제점**:
- 기본 관리자 비밀번호 (`admin123`) 변경 강제 안 함

**해결 방안**:
- **프로덕션**: 첫 로그인 시 비밀번호 변경 강제
- **개발**: 기본 비밀번호 유지 (편의성)
- `password_changed_at` 컬럼 추가

**신규 파일**:
- `server/api/auth/change-password.post.ts`

**수정 파일**:
- `server/api/auth/login.post.ts`
- `server/utils/db.ts`

---

#### 2.9 테스트 작성 (10일)
**목표 커버리지**: 60%

**테스트 케이스**: 35개
- 인증 (10개): 로그인, 로그아웃, JWT, 첫 로그인
- 권한 (5개): hasPermission, getUserPermissions
- 보안 (15개): 비밀번호 정책, 파일 업로드, SQL Injection, XSS, Rate limiting
- API (5개): 페이지네이션, 트랜잭션

**신규 파일**:
- `test/unit/auth/*.test.ts` (4개)
- `test/unit/security/*.test.ts` (5개)
- `test/unit/utils/*.test.ts` (1개)
- `test/unit/api/*.test.ts` (2개)

**설치 패키지**:
```bash
pnpm add -D @vitest/coverage-v8
```

---

### Phase 2 파일 목록

#### 신규 파일 (15개)
1. `server/types/api-response.ts`
2. `server/utils/error-handler.ts`
3. `server/middleware/error-handler.ts`
4. `server/utils/transaction.ts`
5. `server/api/health.get.ts`
6. `server/utils/health-check.ts`
7. `server/utils/password-policy.ts`
8. `server/utils/migrations.ts`
9. `server/migrations/001-add-schema-version.ts`
10. `server/migrations/002-add-password-changed-at.ts`
11. `server/api/auth/change-password.post.ts`
12. `test/unit/auth/*.test.ts` (4개)
13. `test/unit/security/*.test.ts` (5개)
14. `test/unit/utils/*.test.ts` (1개)
15. `test/unit/api/*.test.ts` (2개)

#### 수정 파일
- 모든 API 엔드포인트 (에러 핸들링)
- 트랜잭션 필요한 API
- `server/api/roles/index.get.ts`
- `server/api/chats/stream.get.ts`
- `server/api/users/create.post.ts`
- `server/api/auth/login.post.ts`
- `server/utils/db.ts`
- `package.json`

#### 설치 패키지
```bash
pnpm add -D @vitest/coverage-v8
```

### Breaking Changes
⚠️ **API 응답 형식 표준화**: 모든 API가 `ApiResponse<T>` 형식 반환
- 기존: `{ data: [...] }` 또는 `{ success: true, user: {...} }`
- 변경: `{ success: true, data: {...}, meta: {...} }`
- **영향**: 클라이언트 코드 수정 필요

### 주의사항
- 비밀번호 정책 강화로 기존 사용자 영향 가능 (다음 비밀번호 변경 시 적용)
- 첫 로그인 비밀번호 변경은 프로덕션에서만 적용

---

## Phase 3: 운영 체계 구축 (3-6개월)

### 목표
CI/CD 자동화, 모니터링, 감사 로그, Docker 보안 강화

### 예상 소요 시간
24 작업일

### 작업 항목

#### 3.1 CI/CD 개선 (3일)
**현재 상태**:
- 기본 린트, 테스트, 빌드만

**개선 사항**:
- npm audit (의존성 보안 스캔)
- Trivy (Docker 이미지 취약점 스캔)
- CodeQL (SAST)
- 커버리지 리포트 (Codecov)
- PR 자동 코멘트

**수정 파일**:
- `.github/workflows/main.yml`

**신규 파일**:
- `.github/workflows/security.yml`

---

#### 3.2 페이지네이션 표준화 (4일)
**문제점**:
- 일부 API만 페이지네이션 있음
- 대량 데이터 시 메모리 부담

**해결 방안**:
- 공통 페이지네이션 헬퍼
- users, notifications, chats 등 적용
- 표준 응답 형식

**신규 파일**:
- `server/utils/pagination.ts`

**수정 파일**:
- `server/api/users/index.get.ts`
- `server/api/notifications/index.get.ts`
- `server/api/chats/index.get.ts`

**Breaking Change**: ⚠️ 응답 구조 변경 (pagination 객체 추가)

---

#### 3.3 데이터베이스 인덱스 추가 (2일)
**추가할 인덱스**:
1. `app_users.department_id`
2. `notifications(user_id, is_read, created_at DESC)`
3. `chat_messages(chat_id, created_at DESC)`
4. `user_role_assignments(user_id)`
5. `department_role_assignments(department_id)`

**신규 파일**:
- `server/migrations/003-add-indexes.ts`

---

#### 3.4 감사 로그 (5일)
**목적**:
- 중요 작업 추적 (누가, 언제, 무엇을)
- 규정 준수 (Compliance)
- 보안 감사

**추적 항목**:
- 사용자 생성/수정/삭제
- 역할 변경
- 비밀번호 변경
- 로그인/로그아웃

**신규 파일**:
- `server/migrations/004-add-audit-logs.ts`
- `server/utils/audit-logger.ts`
- `server/api/audit-logs/index.get.ts`

**수정 파일**:
- `server/api/users/create.post.ts`
- `server/api/users/[id].put.ts`
- `server/api/roles/[id].put.ts`

---

#### 3.5 Docker 보안 강화 (3일)
**개선 사항**:
- 비루트 사용자로 실행
- Health check 추가
- 로그 rotation
- 리소스 제한

**수정 파일**:
- `Dockerfile`
- `docker-compose.yml`

---

#### 3.6 구조화된 로깅 (4일)
**현재 상태**:
- `console.log`만 사용
- 구조화 안 됨

**개선 사항**:
- Winston 라이브러리
- 로그 레벨 관리 (info, warn, error)
- Daily rotate (로그 파일 rotation)
- 민감한 정보 마스킹

**신규 파일**:
- `server/utils/logger.ts`
- `server/middleware/request-logger.ts`

**수정 파일**:
- `server/middleware/log.ts`

**설치 패키지**:
```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

---

#### 3.7 캐싱 시스템 (3일)
**목적**:
- 자주 조회되는 데이터 캐싱
- 데이터베이스 부하 감소

**구현 방식**:
- 인메모리 캐시 (간단)
- TTL 기반 만료
- 나중에 Redis로 확장 가능

**신규 파일**:
- `server/utils/cache.ts`
- `server/middleware/cache.ts`

---

### Phase 3 파일 목록

#### 신규 파일 (11개)
1. `.github/workflows/security.yml`
2. `server/utils/pagination.ts`
3. `server/migrations/003-add-indexes.ts`
4. `server/migrations/004-add-audit-logs.ts`
5. `server/utils/audit-logger.ts`
6. `server/api/audit-logs/index.get.ts`
7. `server/utils/logger.ts`
8. `server/middleware/request-logger.ts`
9. `server/utils/cache.ts`
10. `server/middleware/cache.ts`

#### 수정 파일 (10개)
1. `.github/workflows/main.yml`
2. `server/api/users/index.get.ts`
3. `server/api/notifications/index.get.ts`
4. `server/api/chats/index.get.ts`
5. `server/api/users/create.post.ts`
6. `server/api/users/[id].put.ts`
7. `server/api/roles/[id].put.ts`
8. `Dockerfile`
9. `docker-compose.yml`
10. `server/middleware/log.ts`

#### 설치 패키지
```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

### Breaking Changes
⚠️ **페이지네이션 추가**: 일부 API 응답 구조 변경
- 기존: `{ success: true, data: [...] }`
- 변경: `{ success: true, data: [...], pagination: {...} }`
- **영향**: 클라이언트에서 pagination 처리 필요

### 주의사항
- Docker 비루트 사용자로 인한 권한 문제 가능성
- 로그 파일 rotation으로 디스크 공간 관리 필요
- 캐시 무효화 전략 필요

---

## 전체 패키지 설치

### Phase 1
```bash
pnpm add file-type mime-types isomorphic-dompurify
pnpm add -D @types/mime-types
```

### Phase 2
```bash
pnpm add -D @vitest/coverage-v8
```

### Phase 3
```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

---

## 마이그레이션 순서

1. `001-add-schema-version.ts` - 마이그레이션 시스템 초기화
2. `002-add-password-changed-at.ts` - 첫 로그인 비밀번호 변경 지원
3. `003-add-indexes.ts` - 성능 향상 인덱스
4. `004-add-audit-logs.ts` - 감사 로그 테이블

---

## Breaking Changes 요약

| Phase | 변경 사항 | 영향 | 대응 방법 |
|-------|----------|------|----------|
| Phase 1 | 없음 | - | - |
| Phase 2 | API 응답 형식 표준화 | 모든 API 클라이언트 | 응답 구조 수정 |
| Phase 3 | 페이지네이션 추가 | 일부 API 클라이언트 | pagination 처리 추가 |

---

## 테스트 커버리지 목표

| Phase | 목표 커버리지 | 주요 테스트 |
|-------|-------------|-----------|
| Phase 1 | - | 수동 테스트 |
| Phase 2 | 60% | 보안 + 주요 로직 35개 케이스 |
| Phase 3 | 70% | 추가 통합 테스트 |

---

## 배포 전 체크리스트

### Phase 1 배포 전
- [ ] JWT_SECRET 환경 변수 설정 (프로덕션)
- [ ] 패키지 설치 완료
- [ ] 수동 테스트 (로그인, 파일 업로드, 채팅)
- [ ] 린트 통과
- [ ] 빌드 성공

### Phase 2 배포 전
- [ ] 모든 테스트 통과 (35개)
- [ ] 커버리지 60% 이상
- [ ] API 응답 형식 변경 클라이언트 반영
- [ ] 마이그레이션 테스트 (개발 DB)
- [ ] 첫 로그인 비밀번호 변경 테스트

### Phase 3 배포 전
- [ ] CI/CD 파이프라인 테스트
- [ ] 보안 스캔 통과 (npm audit, Trivy)
- [ ] Docker 이미지 빌드 성공
- [ ] Health check 동작 확인
- [ ] 페이지네이션 클라이언트 반영
- [ ] 로그 파일 경로 설정

---

## 롤백 계획

### Phase 1
- 변경 파일 git revert
- 패키지 uninstall

### Phase 2
- API 응답 형식 롤백 필요 시 클라이언트도 함께 롤백
- 마이그레이션 down 스크립트 실행

### Phase 3
- Docker 이미지 이전 버전으로 롤백
- 마이그레이션 down 스크립트 실행

---

## 문의 및 지원

문제 발생 시:
1. 로그 확인 (`logs/` 디렉토리)
2. Health check 엔드포인트 확인 (`/api/health`)
3. 마이그레이션 버전 확인 (`schema_version` 테이블)
4. 환경 변수 확인

---

**최종 업데이트**: 2025-10-30
**작성자**: Claude Code
**버전**: 1.0
