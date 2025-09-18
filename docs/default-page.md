## 기본 레이아웃 및 기본 페이지 가이드

이 문서는 앱의 기본 레이아웃(`app/layouts/default.vue`)과 기본 페이지(`app/pages/index.vue`)의 구조와 동작을 설명합니다. 또한 기본 UI를 구성하는 핵심 컴포넌트(`AppTopbar`, `AppSidebar`, `AppFooter`)의 역할도 간략히 요약합니다.

### 기본 레이아웃: app/layouts/default.vue

- **핵심 상태**
  - `collapsed`: 사이드바 접힘 상태
  - `isOnMobile`: 모바일 뷰 상태
  - `headerCollapsed`: 상단 헤더(탭바/툴바) 접힘 상태
  - `authStore`: 로그인 여부와 사용자 상태
- **구성**
  - `ConfirmDialog`, `Toast` 전역 컴포넌트 포함
  - 로그인 상태(`authStore.isLoggedIn`)에서만 `AppSidebar`, `AppTopbar` 표시
  - 콘텐츠 영역은 `<slot />`으로 주입되며, `headerCollapsed`에 따라 마진/패딩이 달라짐
- **클래스 구조**
  - `#workspace`에 `collapsed`, `mobile`, `workspace-compact/workspace-default` 클래스를 조건부 적용
- **스타일**
  - `workspace-compact`와 `workspace-default`로 상단 영역 높이/여백 제어

### 기본 페이지: app/pages/index.vue

- **라우팅/보안**
  - `definePageMeta({ middleware: 'auth' })`로 인증 미들웨어 적용
- **주요 섹션**
  - 로그인 환영 카드: 로그인 성공 사용자명 표기 (`authStore.user`)
  - 기술 스택 하이라이트 카드 그리드: `AdvertiseBox`를 사용해 사용 기술 소개
- **스토어 사용**
  - `useAuthStore()`를 사용하여 사용자 정보 표시

### AppTopbar: app/components/app/AppTopbar.vue

- **기능**
  - 상단 탭 네비게이션(`DynamicTabs`), 전역 메뉴 검색(오토컴플리트)
  - 알림 패널(폴링, 미읽음 표시, 모두 읽음), 프로필 카드 토글
  - 다크모드 스위치(`AppColorMode`), GitHub 이동, 로그아웃 버튼
  - 헤더 접기/펼치기 버튼 및 접힘 상태에서의 고정 확장 버튼(Teleport)

### AppSidebar: app/components/app/AppSidebar.vue

- **데이터 로드**
  - `/api/settings`에서 로고/앱이름/설명 로드 및 로컬 스토리지 캐시 폴백
  - `/api/menu/admin`에서 메뉴 로드(`useNavigationMenu` 훅)
- **동작**
  - 반응형: 창 크기에 따라 `collapsed`/`isOnMobile` 자동 전환
  - `sidebar-menu` 컴포넌트로 메뉴 렌더링, 헤더/푸터 슬롯 커스터마이즈
  - 탭 제목 선지정: 메뉴 클릭 시 `tabsStore.setPendingTitle(path, label)` 호출

### AppFooter: app/components/app/AppFooter.vue

- `APP_NAME`과 `APP_VERSION`을 `useRuntimeConfig()`로 읽어 하단에 표기

### 페이지 배치 요약

- 로그인 상태에서만 사이드바/탑바가 노출되며, 모든 페이지 콘텐츠는 기본 레이아웃의 `<slot />` 안에서 렌더됩니다.
- 상단 헤더를 접으면 작업공간 여백이 줄어들어 보다 넓은 화면을 확보할 수 있습니다.

### 참고

- 인증 미들웨어(`app/middleware/auth.ts`)에서 로그인 여부를 검증하므로, 기본 페이지 접근 시 자동으로 로그인 페이지로 리디렉션될 수 있습니다.
