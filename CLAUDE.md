# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

MSSQL 백엔드를 사용하는 Nuxt 3 + PrimeVue 4 엔터프라이즈 애플리케이션입니다. JWT 인증, 역할 기반 권한 시스템(RBAC), 파일 첨부 기능이 있는 실시간 채팅, InfluxDB 통합 기능을 제공합니다. FormKit으로 폼 검증, UnoCSS로 스타일링, AG Grid로 데이터 테이블 구현, Pinia로 상태 관리를 합니다.

## 필수 명령어

### 개발
```bash
pnpm dev                    # 개발 서버 시작 (포트 3000)
pnpm build                  # 프로덕션 빌드
pnpm start                  # 프로덕션 서버 시작 (node .output/server/index.mjs)
pnpm preview                # 프로덕션 빌드 미리보기
```

### 테스트
```bash
pnpm test:unit              # Vitest 유닛 테스트 실행
pnpm test:ui                # Vitest UI로 테스트 실행
pnpm test:ci                # CI 테스트 실행 (app.test.ts 제외)
pnpm test:coverage          # 커버리지 리포트 생성
```

### 코드 품질
```bash
pnpm lint                   # ESLint로 코드 검사
pnpm lint:fix               # 린트 문제 자동 수정
```

### 릴리스
```bash
pnpm release                # 린트 + 빌드 + 버전 업데이트 + git push (태그 포함)
```

## 아키텍처 개요

### 데이터베이스 레이어 (MSSQL)
- **연결 풀**: `server/utils/db.ts`에서 재시도 로직과 커넥션 풀링 설정
- **자동 초기화**: `SKIP_DB_INIT=true`가 아니면 첫 실행시 테이블 자동 생성
- **주요 테이블**:
  - `app_users`: 부서 할당이 포함된 사용자 계정
  - `departments`: 부모/자식 관계가 있는 조직 계층 구조
  - `user_roles`: JSON과 정규화된 권한을 가진 RBAC 역할
  - `user_role_assignments`, `department_role_assignments`: 사용자-역할, 부서-역할 매핑
  - `role_permissions`: 정규화된 리소스 레벨 권한 (읽기/쓰기)
  - `chats`, `chat_members`, `chat_messages`, `chat_attachments`: 실시간 채팅 시스템
  - `notifications`: 발신자 추적이 있는 사용자 알림

### 인증 및 권한
- **JWT 기반 인증**: 토큰을 HTTP-only 쿠키에 저장 (`auth-token`)
- **세션 관리**: 24시간 토큰 만료
- **비밀번호 해싱**: bcryptjs 사용, salt rounds 10
- **권한 시스템**:
  - 이중 소스: `user_roles.permissions`의 JSON + `role_permissions` 테이블의 정규화된 권한
  - 사용자 할당 역할과 부서 할당 역할 모두에서 권한 병합
  - 형식: `{ resource: 'read' | 'write' }` 또는 관리자용 `{ all: true }`
- **미들웨어**:
  - `app/middleware/auth.ts`: 보호된 라우트에서 인증 강제
  - `app/middleware/role.ts`, `role.global.ts`: 역할 기반 접근 제어
  - `server/utils/auth.ts`: JWT 검증 헬퍼 (`getCurrentUser`, `getCurrentUserId`)
  - `server/utils/permissions.ts`: 권한 확인 (`hasPermission`, `getUserPermissions`)

### 파일 업로드 시스템
- **저장소**: `UPLOADS_DIR`에 파일 저장 (Docker에서 기본값 `/uploads`, 로컬에서 `public/uploads`)
- **채팅 첨부파일**: `server/api/chats/[id]/attach.post.ts`를 통한 문서, 이미지, 압축파일 지원
- **크기 제한**: `nuxt.config.ts`의 `CHAT_MAX_FILE_MB`로 설정 (기본값 150MB)
- **허용 확장자**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.pdf`, `.txt`, `.zip`, `.doc`, `.docx`, `.xls`, `.xlsx`
- **서빙**: `server/routes/uploads/[...file].get.ts`를 통한 정적 파일 제공

### 실시간 채팅
- **SSE 스트리밍**: `server/api/chats/stream.get.ts`를 통한 Server-Sent Events
- **이벤트 버스**: `server/utils/chatBus.ts`의 인메모리 이벤트 이미터
- **기능**: 1대1 및 그룹 채팅, 파일 첨부, 메시지 검색, 읽음 확인
- **상태 관리**: 클라이언트 채팅 상태를 위한 `app/stores/chat.ts`

### API 구조
- **RESTful 엔드포인트**: `server/api/`에 위치
  - 인증: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/permissions`
  - 사용자: `/api/users`, `/api/users/[id]`, `/api/users/create`, `/api/users/[userId]/roles`
  - 역할: `/api/roles`, `/api/roles/[id]`, `/api/roles/[id]/departments`, `/api/roles/[id]/users`
  - 부서: `/api/departments`, `/api/departments/[id]`, `/api/departments/[deptId]/roles`
  - 채팅: `/api/chats`, `/api/chats/[id]/messages`, `/api/chats/[id]/attach`, `/api/chats/stream`
  - 알림: `/api/notifications`, `/api/notifications/mark-read`, `/api/notifications/create`
  - 저장 프로시저: `/api/stored-procedure/list`, `/api/stored-procedure/execute`
  - 설정: `/api/settings` (앱 레벨 설정을 위한 GET/POST)
- **미들웨어**: 요청 로깅을 위한 `server/middleware/log.ts`

### 프론트엔드 아키텍처
- **레이아웃**:
  - `app/layouts/default.vue`: 사이드바, 상단바, 푸터가 있는 메인 인증 레이아웃
  - `app/layouts/marketing.vue`: 공개 마케팅 페이지
- **라우팅**: `app/pages/`의 파일 기반 라우팅
- **컴포넌트**:
  - `app/components/app/`: 핵심 UI 컴포넌트 (AppSidebar, AppTopbar, AppFooter, AppColorMode)
  - `app/components/chat/`: 채팅 UI (ChatList, ChatWindow)
  - `app/components/home/`: 대시보드 위젯 (HomeKpis, HomeQuickActions, HomeActivityTabs 등)
  - `app/components/content/`: Nuxt Content 컴포넌트
  - `app/components/tiptap/`: 리치 텍스트 에디터
- **상태 관리**:
  - `app/stores/auth.ts`: 인증 상태, 권한
  - `app/stores/chat.ts`: 채팅 메시지, 멤버, 읽지 않은 개수
  - `app/stores/tabs.ts`: 동적 탭 네비게이션
  - `app/stores/theme.ts`: 다크 모드 토글
  - `app/stores/notifications.ts`: 실시간 알림
- **컴포저블**:
  - `app/composables/permissions.ts`: 권한 확인 헬퍼
  - `app/composables/navigation.ts`: 메뉴 및 네비게이션 유틸리티
  - `app/composables/useStoredProcedure.ts`: MSSQL 저장 프로시저 실행
  - `app/composables/primeDataTable.ts`: PrimeVue DataTable 유틸리티
  - `app/composables/messages.ts`, `confirmation.ts`: 토스트 및 다이얼로그 헬퍼

### 스타일링
- **UnoCSS**: `uno.config.ts`에 설정된 Atomic CSS 프레임워크
- **PrimeVue 4**: 다크 모드 지원하는 Aura 프리셋 테마 (`.dark` 셀렉터)
- **커스텀 SCSS**: 글로벌 스타일, 사이드바, 폼, 테이블을 위한 `app/App.scss`, `app/assets/sass/`
- **FormKit 스타일링**: `docs/formkit-global-style.md`의 글로벌 폼 스타일

### 테스트
- **Vitest**: 유닛 테스트 프레임워크
- **테스트 파일**: `test/` 디렉토리에 위치
  - `test/basic/vitest_base.test.ts`: 기본 Vitest 테스트
  - `test/nuxt/ToDo.test.ts`: 컴포넌트 테스트
  - `test/e2e/app.test.ts`: E2E 테스트 (CI에서 제외)
- **K6 부하 테스트**: API 성능 테스트를 위한 `test/k6/` 스크립트

## 환경 변수

필수 환경 변수 (전체 목록은 `docs/env.example` 참조):

### 데이터베이스 (MSSQL)
```bash
DB_HOST=infopath.iptime.org     # MSSQL 서버 호스트명
DB_PORT=1433                     # MSSQL 기본 포트
DB_USER=sa                       # 데이터베이스 사용자명
DB_PASSWORD=change-me            # 데이터베이스 비밀번호
DB_NAME=nuxttest                 # 데이터베이스 이름
DB_TRUST_SERVER_CERT=true        # 자체 서명 인증서 신뢰
DB_POOL_MAX=50                   # 최대 연결 풀 크기
DB_POOL_MIN=10                   # 최소 연결 풀 크기
SKIP_DB_INIT=true                # 자동 초기화 건너뛰기 (첫 실행시 false 설정)
```

### 연결 및 재시도
```bash
DB_CONNECTION_TIMEOUT_MS=15000   # 연결 타임아웃
DB_REQUEST_TIMEOUT_MS=30000      # 쿼리 타임아웃
DB_MAX_RETRIES=5                 # 최대 연결 재시도 횟수
DB_RETRY_DELAY_MS=2000           # 재시도 간 지연 시간
```

### 인증
```bash
JWT_SECRET=your-secret-key       # JWT 서명 시크릿 (프로덕션에서 필수)
```

### 파일 업로드
```bash
UPLOADS_DIR=/uploads             # 업로드 디렉토리 (컨테이너 내부)
```

### InfluxDB (선택사항)
```bash
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-token
INFLUX_ORG=your-org
INFLUX_BUCKET_TEST=testspc
INFLUX_BUCKET_SPEC=testspecspc
```

## Docker 배포

### 이미지 빌드
```bash
docker build -t nuxttest:latest .
```

### 개발 환경 (업로드용 바인드 마운트)
```bash
docker-compose --profile dev up
```

### 프로덕션 환경 (네임드 볼륨)
```bash
docker-compose --profile prod up
```

**중요**: Docker 설정 사항:
- 멀티 스테이지 빌드 (builder + runner)
- Node 20 bookworm-slim 베이스 이미지
- pnpm 10.8.0 패키지 매니저
- @nuxt/content를 위한 Better-sqlite3 네이티브 리빌드
- 영구 업로드를 위한 볼륨 마운팅

## 주요 기술 세부사항

### FormKit + PrimeVue 통합
- **모듈**: `@sfxcode/formkit-primevue-nuxt`가 FormKit과 PrimeVue 컴포넌트를 통합
- **래핑된 입력**: `nuxt.config.ts`의 목록(`wrappedPrimeInputs`)이 PrimeVue 컴포넌트를 자동 import에서 제외하여 FormKit 래퍼 사용
- **설정**: `formkit.config.ts`가 AutoAnimate, MultiStep, PrimeAsterisk 플러그인 설정
- **i18n**: FormKit i18n (영어, 독일어)은 Nuxt i18n과 별도로 설정

### 저장 프로시저 지원
- **API**: `/api/stored-procedure/list`가 사용 가능한 프로시저 목록 제공, `/api/stored-procedure/execute`가 실행
- **컴포저블**: `app/composables/useStoredProcedure.ts`가 타입이 지정된 인터페이스 제공
- **서버 유틸**: `server/utils/storedProcedure.ts`가 MSSQL 파라미터 매핑 및 실행 처리
- **사용 목적**: 기존 데이터베이스 로직을 Node.js로 재작성하지 않고 사용

### 동적 메뉴 시스템
- **API**: `/api/menu` (사용자 메뉴용 GET, 관리용 `/api/menu/admin`)
- **데이터베이스 기반**: 데이터베이스에 저장된 메뉴 구조, 사용자 권한으로 필터링
- **사이드바**: `app/components/app/AppSidebar.vue`가 아이콘이 있는 계층적 메뉴 렌더링

### 탭 네비게이션
- **글로벌 미들웨어**: `app/middleware/tabs.global.ts`가 열린 탭 추적
- **스토어**: `app/stores/tabs.ts`가 탭 상태 관리
- **컴포넌트**: `app/components/DynamicTabs.vue`가 닫기 버튼이 있는 탭 렌더링
- **영속성**: 페이지 새로고침 후에도 탭 유지

### InfluxDB 통합
- **서버 유틸**: 시계열 데이터 저장을 위한 `server/utils/influx.ts`
- **API 엔드포인트**: 쿼리를 위한 `/api/influx/gettest`, `/api/influx/getspectest`
- **사용 사례**: K6 부하 테스트 메트릭, 성능 모니터링

### ESLint 설정
- **기반**: Nuxt, UnoCSS, formatters를 포함한 Antfu의 ESLint 설정
- **완화된 규칙**: 기존 디자인 보존을 위해 Vue 템플릿 스타일 규칙 비활성화 (`eslint.config.js` 참조)
- **파일**: Vue 파일은 `app/` 디렉토리만 린트

## 개발 패턴

### 새 API 엔드포인트 추가
1. `server/api/[resource]/[action].[method].ts`에 파일 생성
2. 인증을 위해 `getCurrentUserId(event)` 또는 `getCurrentUser(event)` 사용
3. `hasPermission(permissions, resource, action)`으로 권한 확인
4. `connection.request().input('param', value).query(...)`를 통한 파라미터화된 쿼리 사용
5. 적절한 HTTP 상태 코드 반환 (200, 201, 400, 401, 403, 404, 500)

### 새 보호 페이지 추가
1. `app/pages/[route].vue`에 페이지 생성
2. 인증을 위해 `definePageMeta({ middleware: 'auth' })` 사용
3. 컴포넌트에서 권한 확인: `authStore.hasPermission('resource', 'read')`
4. `/api/menu/create`를 통해 또는 데이터베이스에 직접 메뉴 항목 추가

### 새 데이터베이스 테이블 추가
1. `server/utils/db.ts`에 초기화 로직 추가 (`ensure[TableName]Table` 함수 생성)
2. `initializeDatabase()` 함수에서 호출
3. 멱등성 컬럼 체크 사용: `addColumnIfMissing()`
4. 첫 배포시 `SKIP_DB_INIT=false` 설정

### 새 권한 추가
1. 옵션 A (JSON): `/api/roles/[id]`를 통해 `{ "resource": "read" | "write" }`로 역할 업데이트
2. 옵션 B (정규화): `role_permissions` 테이블에 삽입
3. 두 소스 모두 `getUserPermissions()`에서 병합 (write가 read 우선)

### FormKit + PrimeVue 작업
1. FormKit 스키마 또는 컴포넌트 문법 사용
2. FormKit으로 래핑된 PrimeVue 컴포넌트: `type="primevue-[component]"` 사용 (예: `type="primevue-InputText"`)
3. 글로벌 스타일: `docs/formkit-global-style.md` 참조
4. 검증: FormKit 검증 규칙이 모든 입력에 적용

## 일반적인 문제 해결

### 데이터베이스 연결 문제
- MSSQL 서버가 실행 중이고 접근 가능한지 확인
- 환경 변수의 `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` 확인
- "trust server certificate" 오류는 `DB_TRUST_SERVER_CERT=true` 설정 확인
- 재시도 로그 검토: 연결 시도가 콘솔에 로깅됨

### JWT 인증 오류
- 환경 변수에 `JWT_SECRET` 설정 확인 (프로덕션)
- 쿠키 존재 확인: `auth-token`은 HTTP-only여야 함
- 토큰 만료 확인 (기본값 24시간)
- "invalid token" 오류는 `server/utils/jwt.ts`의 서명 검증 확인

### 권한 거부
- 사용자에게 역할 할당이 있는지 확인: `user_role_assignments` 또는 `department_role_assignments` 확인
- 역할에 필요한 권한이 있는지 확인: `role_permissions` 또는 `user_roles.permissions` JSON 확인
- 서버 콘솔에서 `getUserPermissions(userId)`로 디버깅
- 클라이언트에서 `authStore.initAuth()` 호출 확인

### 파일 업로드 실패
- `UPLOADS_DIR`이 존재하고 쓰기 가능한지 확인
- 파일 크기가 `CHAT_MAX_FILE_MB` 제한 이하인지 확인 (기본값 150MB)
- 파일 확장자가 `CHAT_ALLOWED_EXTS` 목록에 있는지 확인
- `nuxt.config.ts`의 Nitro body parser 설정 검토 (채팅 엔드포인트는 `parser: false`)

## 테스트 참고사항

### 단일 테스트 실행
```bash
pnpm test:unit test/basic/vitest_base.test.ts
```

### 테스트 의존성
- Nuxt 컴포넌트 마운팅을 위한 `@nuxt/test-utils` 사용
- DOM 시뮬레이션을 위한 `happy-dom` 환경
- `c8` (V8 코드 커버리지)를 통한 커버리지

### K6 부하 테스트
```bash
# 먼저 k6 설치: https://k6.io/docs/get-started/installation/
cd test/k6
k6 run main-api.test.js
```

## 추가 문서

`docs/`에서 자세한 가이드 확인:
- `authentication-system.md`: 다이어그램을 포함한 완전한 인증 구현
- `user-role-management-guide.md`: RBAC 설정 및 관리
- `chat-overview.md`, `chat-api.md`: 채팅 시스템 아키텍처
- `stored-procedure-service.md`: MSSQL 저장 프로시저 사용
- `default-page.md`: DefaultPage 컴포넌트로 표준 페이지 생성
- `build-and-deploy.md`: Docker 및 배포 지침
- `routing-configuration.md`: Nuxt 라우팅 패턴
- `aggrid-params.md`: AG Grid 설정 예제
- `formkit-global-style.md`: FormKit 스타일링 가이드

## 중요 사항

- **패키지 매니저**: `pnpm` 독점 사용 (버전 10.8.0+)
- **Node 버전**: Node 20 LTS 필요
- **데이터베이스**: MSSQL만 사용; 연결 풀은 요청 간 공유
- **기본 관리자**: 사용자명 `admin`, 비밀번호 `admin123` (프로덕션에서 변경 필요!)
- **Git**: 메인 브랜치는 `main`
- **호환성**: Nuxt 4 준비 완료 (`compatibilityVersion: 4`)
