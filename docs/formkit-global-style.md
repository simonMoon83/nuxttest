# 📝 FormKit 글로벌 스타일 가이드 (PrimeVue 통합)

이 문서는 **SMART MES 시스템**에서 사용되는 FormKit + PrimeVue 통합 스타일 시스템을 설명합니다. 

## 🎯 시스템 개요

### 파일 구조
```
app/
├── App.scss                 # 메인 스타일 로더
├── assets/sass/
│   ├── form.scss            # FormKit 전역 스타일 (본 문서 주제)
│   ├── sidebar.scss         # 사이드바 스타일
│   └── main.scss           # 기타 글로벌 스타일
└── pages/form/index.vue     # FormKit 데모 페이지
```

### 핵심 컴포넌트
- **FormKitDataEdit**: 데이터 편집용 FormKit 래퍼
- **FormKitDataView**: 데이터 표시용 FormKit 래퍼  
- **FormKitDataDebug**: 디버깅용 FormKit 래퍼

## 🔧 핵심 개념

### 📐 레이아웃 시스템
- **form-horizontal**: 레이블과 입력을 가로 정렬 (md+ 화면)
- **grid-4**: 4열 그리드 레이아웃 (반응형: 1→2→4열)
- **grid-6**: 6열 그리드 레이아웃 (반응형: 1→3→6열) 
- **grid-12**: 12열 그리드 레이아웃 (반응형: 1→6→12열)
- **compact-form**: 컴팩트한 입력 크기 및 간격

### 🎛️ 컬럼 시스템
- **col-1 ~ col-12**: 유연한 컬럼 너비 지정 (lg+ 화면)
- **grid-column spans**: 그리드 시스템에서 컬럼 스팬 제어
- **자동 전체폭**: 제목(h1~h6)과 col-12 요소의 전체폭 처리

---

## 🚀 사용 방법

### 1️⃣ 기본 템플릿 구조

#### **표준 폼 레이아웃**
```vue
<template>
  <div class="card p-6">
    <!-- 제목 섹션 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">폼 제목</h1>
      <p class="text-gray-600">폼 설명</p>
    </div>

    <!-- FormKit 폼 -->
    <FormKitDataEdit
      v-model="formData"
      :schema="schema"
      form-class="form-horizontal grid-4"
      :submit-label="'저장'"
      @data-saved="handleSubmit"
    />
  </div>
</template>
```

#### **컴팩트 폼 레이아웃**
```vue
<template>
  <div class="card p-4">
    <div class="compact-form">
      <FormKitDataEdit
        v-model="searchData"
        :schema="searchSchema"
        form-class="form-horizontal grid-6"
        submit-label=""
      />
    </div>
  </div>
</template>
```

### 2️⃣ 다양한 그리드 시스템

#### **4열 그리드 (grid-4)**
- **모바일**: 1열
- **태블릿 (md+)**: 2열  
- **데스크톱 (lg+)**: 4열

```vue
<FormKitDataEdit
  v-model="data"
  :schema="schema"
  form-class="grid-4"
/>
```

#### **6열 그리드 (grid-6)**
- **모바일**: 1열
- **태블릿 (md+)**: 3열
- **데스크톱 (lg+)**: 6열

```vue
<FormKitDataEdit
  v-model="data"
  :schema="schema"
  form-class="grid-6"
/>
```

#### **12열 그리드 (grid-12)**
- **모바일**: 1열
- **태블릿 (md+)**: 6열
- **데스크톱 (lg+)**: 12열 (col-# 스팬 지원)

```vue
<FormKitDataEdit
  v-model="data"
  :schema="schema"
  form-class="form-horizontal grid-12"
/>
```

### 3️⃣ 스키마 작성 패턴

#### **기본 필드 스키마**
```js
const schema = [
  // 섹션 제목
  { $el: 'h5', children: '사용자 정보' },
  
  // 기본 입력 필드들
  { 
    $formkit: 'primeInputText', 
    name: 'username', 
    label: '사용자명', 
    validation: 'required',
    outerClass: 'col-6' 
  },
  { 
    $formkit: 'primeInputText', 
    name: 'email', 
    label: '이메일', 
    validation: 'required|email',
    outerClass: 'col-6' 
  },
  
  // 전체폭 필드
  { 
    $formkit: 'primeTextarea', 
    name: 'description', 
    label: '설명', 
    rows: 3,
    outerClass: 'col-12' 
  },
]
```

#### **검색 폼 스키마 (컴팩트)**
```js
const searchSchema = [
  { $el: 'h6', children: '검색 조건' },
  
  // 검색 필드들 (grid-6 기준)
  { $formkit: 'primeInputText', name: 'keyword', label: '키워드' },
  { $formkit: 'primeSelect', name: 'category', label: '카테고리', options: categoryOptions },
  { $formkit: 'primeDatePicker', name: 'startDate', label: '시작일', showIcon: true },
  { $formkit: 'primeDatePicker', name: 'endDate', label: '종료일', showIcon: true },
  
  // 버튼 영역
  {
    $el: 'div',
    attrs: { class: 'col-12 flex justify-end gap-2 mt-4' },
    children: [
      { $cmp: 'Button', props: { label: '조회', severity: 'primary', onClick: () => search() } },
      { $cmp: 'Button', props: { label: '초기화', outlined: true, onClick: () => reset() } },
    ]
  }
]
```

#### **고급 폼 스키마 (12열 그리드)**
```js
const advancedSchema = [
  { $el: 'h5', children: '상세 정보' },
  
  // 다양한 컬럼 스팬 활용
  { $formkit: 'primeInputText', name: 'title', label: '제목', outerClass: 'col-8' },
  { $formkit: 'primeSelect', name: 'status', label: '상태', outerClass: 'col-4' },
  
  { $formkit: 'primeInputText', name: 'code', label: '코드', outerClass: 'col-3' },
  { $formkit: 'primeInputNumber', name: 'quantity', label: '수량', outerClass: 'col-3' },
  { $formkit: 'primeInputNumber', name: 'price', label: '단가', outerClass: 'col-3' },
  { $formkit: 'primeInputNumber', name: 'total', label: '합계', disabled: true, outerClass: 'col-3' },
  
  // 체크박스 (특별 처리)
  { 
    $formkit: 'primeCheckbox', 
    name: 'isActive', 
    suffix: '활성 상태',
    outerClass: 'col-6' 
  },
]
```

### 4️⃣ PrimeVue 컴포넌트 통합

#### **사용 가능한 FormKit-PrimeVue 컴포넌트**
```js
// 입력 컴포넌트
$formkit: 'primeInputText'      // 텍스트 입력
$formkit: 'primeInputNumber'    // 숫자 입력
$formkit: 'primePassword'       // 비밀번호 입력
$formkit: 'primeTextarea'       // 텍스트 영역

// 선택 컴포넌트
$formkit: 'primeSelect'         // 드롭다운 선택
$formkit: 'primeMultiSelect'    // 다중 선택
$formkit: 'primeCheckbox'       // 체크박스
$formkit: 'primeRadioButton'    // 라디오 버튼

// 날짜/시간 컴포넌트
$formkit: 'primeDatePicker'     // 날짜 선택기
$formkit: 'primeCalendar'       // 달력

// 고급 컴포넌트
$formkit: 'primeSlider'         // 슬라이더
$formkit: 'primeKnob'           // 노브
$formkit: 'primeEditor'         // 리치 텍스트 에디터
```

#### **컴포넌트별 주요 속성**
```js
// 날짜 선택기
{ 
  $formkit: 'primeDatePicker',
  name: 'birthDate',
  label: '생년월일',
  showIcon: true,
  dateFormat: 'yy-mm-dd',
  placeholder: '날짜를 선택하세요'
}

// 드롭다운 선택
{
  $formkit: 'primeSelect',
  name: 'department',
  label: '부서',
  optionLabel: 'name',
  optionValue: 'id',
  options: departmentList,
  placeholder: '부서를 선택하세요',
  showClear: true
}

// 체크박스
{
  $formkit: 'primeCheckbox',
  name: 'agreeTerms',
  suffix: '이용약관에 동의합니다',
  validation: 'required'
}
```

---

## ⚙️ 전역 SCSS 시스템 상세

### 🎛️ 반응형 브레이크포인트
```scss
$grid-breakpoints: (
  sm: 640px,   // 스마트폰 (가로)
  md: 768px,   // 태블릿
  lg: 1024px,  // 노트북
  xl: 1280px,  // 데스크톱
  xxl: 1536px  // 대형 모니터
);
```

### 📦 컴팩트 폼 (compact-form)

**특징:**
- 입력 요소 크기 축소 (높이: 1.875rem)
- 레이블 폰트 크기 축소 (0.72rem)
- 기본 FormKit 제출 버튼 자동 숨김
- 검색 폼 및 필터 UI에 최적화

**핵심 CSS:**
```scss
.compact-form {
  .formkit-outer { margin-bottom: 0.25rem; }
  .formkit-label { 
    font-size: 0.72rem !important; 
    line-height: 1.15; 
    margin-bottom: 0.15rem; 
  }
  .p-inputtext,
  input[type='text'],
  input[type='number'] { 
    padding: 0.25rem 0.5rem; 
    font-size: 0.8125rem; 
    height: 1.875rem; 
  }
  // 기본 제출 버튼 숨김
  .formkit-actions,
  .formkit-outer[data-type='submit'],
  button[type='submit'] { display: none !important; }
}
```

### 📏 가로 레이블 (form-horizontal)

**특징:**
- md+ 화면에서 레이블과 입력을 가로 정렬
- 레이블 폭: 33.33% (4/12), 입력 폭: 66.67% (8/12)
- 체크박스 특별 정렬 규칙 포함

**핵심 CSS:**
```scss
@include media-breakpoint-up(md) {
  .formkit-form.form-horizontal {
    .formkit-wrapper { display: flex; }
    .formkit-outer label { 
      width: calc((4 / 12) * 100%); 
      padding-top: 0.25rem; 
    }
    .formkit-outer .formkit-inner { 
      width: calc((8 / 12) * 100%); 
    }
  }
}
```

### 🔢 그리드 시스템

#### **grid-4 (4열 그리드)**
```scss
.formkit-form.grid-4 {
  display: grid;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  
  // 반응형 컬럼
  grid-template-columns: minmax(0, 1fr);                    // 모바일: 1열
  @include media-breakpoint-up(md) { 
    grid-template-columns: repeat(2, minmax(0, 1fr));       // 태블릿: 2열
  }
  @include media-breakpoint-up(lg) { 
    grid-template-columns: repeat(4, minmax(0, 1fr));       // 데스크톱: 4열
  }
}
```

#### **grid-6 (6열 그리드)**
```scss
.formkit-form.grid-6 {
  display: grid;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  
  // 반응형 컬럼
  grid-template-columns: minmax(0, 1fr);                    // 모바일: 1열
  @include media-breakpoint-up(md) { 
    grid-template-columns: repeat(3, minmax(0, 1fr));       // 태블릿: 3열
  }
  @include media-breakpoint-up(lg) { 
    grid-template-columns: repeat(6, minmax(0, 1fr));       // 데스크톱: 6열
  }
}
```

#### **grid-12 (12열 그리드)**
```scss
.formkit-form.grid-12 {
  display: grid;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  
  // 반응형 컬럼
  grid-template-columns: minmax(0, 1fr);                    // 모바일: 1열
  @include media-breakpoint-up(md) { 
    grid-template-columns: repeat(6, minmax(0, 1fr));       // 태블릿: 6열
  }
  @include media-breakpoint-up(lg) { 
    grid-template-columns: repeat(12, minmax(0, 1fr));      // 데스크톱: 12열
  }
  
  // 컬럼 스팬 지원
  @for $i from 1 through 12 {
    > .col-#{$i} { grid-column: span $i; }
  }
}
```

### 📐 컬럼 유틸리티 (col-1 ~ col-12)

**특징:**
- lg+ 화면에서만 활성화
- Flexbox 기반 12열 시스템
- 모바일에서는 100% 스택

**핵심 CSS:**
```scss
@include media-breakpoint-up(lg) {
  .formkit-form {
    display: flex;
    flex-wrap: wrap;
    margin-left: -$gutter-width;
    margin-right: -$gutter-width;
    
    & > * { 
      width: 100%; 
      padding-left: $gutter-width; 
      padding-right: $gutter-width; 
    }
  }
  
  // 컬럼 너비 생성
  @for $i from 1 through 12 {
    .col-#{$i} { width: #{($i / 12) * 100%}; }
  }
}
```

### 🔳 체크박스 특별 처리

**특징:**
- `primeCheckbox`는 복잡한 레이아웃 규칙 적용
- prefix/suffix 레이블 조합 지원
- `form-horizontal`과 완벽 호환

**체크박스 스키마 패턴:**
```js
// 기본 체크박스 (suffix 사용)
{
  $formkit: 'primeCheckbox',
  name: 'isActive',
  suffix: '활성 상태로 설정'
}

// prefix + suffix 조합
{
  $formkit: 'primeCheckbox',
  name: 'agreeTerms',
  label: '약관 동의:',        // prefix 레이블
  suffix: '이용약관에 동의합니다'  // suffix 레이블
}
```

---

## 🛠️ 실무 활용 팁

### ✅ **모범 사례**

#### **1. 반응형 고려**
```js
// ✅ 좋은 예: 다양한 화면 크기 고려
const schema = [
  { $formkit: 'primeInputText', name: 'title', label: '제목', outerClass: 'col-12' },      // 전체폭
  { $formkit: 'primeInputText', name: 'code', label: '코드', outerClass: 'col-6' },        // 절반폭
  { $formkit: 'primeSelect', name: 'status', label: '상태', outerClass: 'col-6' },         // 절반폭
]
```

#### **2. 의미적 그룹핑**
```js
// ✅ 좋은 예: 논리적 섹션 구분
const schema = [
  { $el: 'h5', children: '기본 정보' },
  { $formkit: 'primeInputText', name: 'name', label: '이름' },
  { $formkit: 'primeInputText', name: 'email', label: '이메일' },
  
  { $el: 'h5', children: '추가 정보' },
  { $formkit: 'primeTextarea', name: 'description', label: '설명' },
]
```

#### **3. 일관된 버튼 배치**
```js
// ✅ 좋은 예: 버튼을 별도 영역에 배치
{
  $el: 'div',
  attrs: { class: 'col-12 flex justify-end gap-2 mt-6 pt-4 border-t' },
  children: [
    { $cmp: 'Button', props: { label: '취소', outlined: true, onClick: cancel } },
    { $cmp: 'Button', props: { label: '저장', severity: 'primary', onClick: save } },
  ]
}
```

### ❌ **피해야 할 패턴**

#### **1. 과도한 컬럼 분할**
```js
// ❌ 나쁜 예: 너무 많은 컬럼 분할 (모바일에서 읽기 어려움)
{ $formkit: 'primeInputText', name: 'field1', outerClass: 'col-2' },
{ $formkit: 'primeInputText', name: 'field2', outerClass: 'col-2' },
{ $formkit: 'primeInputText', name: 'field3', outerClass: 'col-2' },
// ... 6개 필드를 한 줄에
```

#### **2. 일관성 없는 레이아웃**
```js
// ❌ 나쁜 예: 그리드와 컬럼 시스템 혼용
form-class="grid-4"  // grid 시스템 사용
outerClass="col-6"   // 동시에 flexbox 컬럼 시스템 사용 (충돌 가능)
```

### 🎯 **성능 최적화**

#### **대용량 폼 처리**
```js
// 섹션별 조건부 렌더링
const schema = computed(() => [
  { $el: 'h5', children: '기본 정보' },
  // 기본 필드들...
  
  // 고급 옵션은 조건부 표시
  ...(showAdvanced.value ? [
    { $el: 'h5', children: '고급 설정' },
    // 고급 필드들...
  ] : [])
])
```

#### **유효성 검사 최적화**
```js
// 실시간 검사가 필요한 필드만 선별적 적용
{
  $formkit: 'primeInputText',
  name: 'username',
  label: '사용자명',
  validation: 'required|length:3,20',
  'validation-visibility': 'dirty'  // 입력 후에만 검사
}
```

---

## 🔍 **문제 해결 가이드**

### **Q: 모바일에서 레이아웃이 깨져요**
**A:** `form-horizontal`은 md+ 화면에서만 활성화됩니다. 모바일에서는 자동으로 세로 스택으로 표시됩니다.

### **Q: 그리드에서 특정 필드만 전체폭으로 만들려면?**
**A:** `outerClass: 'col-12'`를 사용하세요.
```js
{ $formkit: 'primeTextarea', name: 'description', outerClass: 'col-12' }
```

### **Q: 컴팩트 폼에서 제출 버튼이 안 보여요**
**A:** 의도된 동작입니다. 커스텀 버튼을 스키마에 추가하세요.
```js
{
  $el: 'div',
  attrs: { class: 'col-12 flex justify-end gap-2' },
  children: [
    { $cmp: 'Button', props: { label: '제출', onClick: handleSubmit } }
  ]
}
```

### **Q: 체크박스 레이아웃이 이상해요**
**A:** `suffix` 속성을 사용하여 레이블을 지정하세요.
```js
// ✅ 올바른 체크박스 사용법
{ $formkit: 'primeCheckbox', name: 'agree', suffix: '동의합니다' }
```

---

## 📚 **추가 자료**

### **관련 문서**
- [FormKit-PrimeVue 공식 문서](https://formkit-primevue.netlify.app/)
- [PrimeVue 컴포넌트 가이드](https://primevue.org/)
- [Nuxt 3 FormKit 통합](https://formkit.com/guides/nuxt)

### **예제 페이지**
- `app/pages/form/index.vue` - 기본 FormKit 예제
- `app/pages/form/toggle.vue` - 고급 폼 패턴
- `app/pages/exam/demo.vue` - 실제 활용 사례

### **디버깅 도구**
```vue
<!-- 개발 중 데이터 확인 -->
<FormKitDataEdit
  v-model="formData"
  :schema="schema"
  :debug-data="true"
  :debug-schema="false"
/>
```

이 가이드를 통해 **일관성 있고 사용자 친화적인 폼 인터페이스**를 구축하실 수 있습니다! 🎉


