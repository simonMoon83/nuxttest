## 전역 폼/스타일 가이드 (FormKit + Prime 기반)

이 문서는 Nuxt 앱 전역에서 재사용되는 FormKit 전용 SCSS 규칙과 사용 방법을 설명합니다. 전역 규칙은 `app/assets/sass/form.scss`에 위치하며, `app/App.scss`에서 다음과 같이 로드됩니다.

```scss
// app/App.scss
@use 'assets/sass/sidebar';
@use 'assets/sass/form';
@use 'assets/sass/main';
```

### 핵심 개념
- **compact-form**: 컴팩트한 입력 높이/간격, 기본 submit 버튼 숨김을 적용하는 래퍼 클래스
- **form-horizontal**: 레이블과 입력을 가로(한 줄)로 정렬하는 전역 폼 클래스 (md 이상 화면 폭에서 활성)
- **grid-4**: 한 줄에 4개의 필드를 배치하는 전역 폼 클래스 (CSS Grid)
- **col-1 ~ col-12**: 각 필드 너비(그리드 칼럼 수)를 지정하는 유틸 클래스 (lg 이상 화면 폭에서 폭 적용)
- **제목 전체폭**: h1~h6 제목 요소는 그리드에서 항상 한 줄 전체를 차지

---

## 사용 방법

### 1) 템플릿 권장 구조
```vue
<template>
  <div class="card p-4">
    <div class="compact-form">
      <FormKitDataEdit
        v-model="formData"
        :schema="schema"
        form-class="form-horizontal grid-4"
        submit-label=""
      />
    </div>
  </div>
  <!-- ... -->
  
  <!-- 버튼/툴바는 스키마에서 별도의 col-12 행으로 배치 권장 -->
</template>
```

포인트:
- `compact-form` 래퍼 안에 둘 경우 입력 높이/간격이 축소되고, 기본 FormKit submit/action이 자동으로 숨겨집니다.
- `form-class="form-horizontal grid-4"`를 주면 md 이상에서 가로 라벨 + 4열 그리드가 적용됩니다.

### 2) 스키마 작성 예시
```js
const schema = [
  { $el: 'h5', children: '검색 조건' },
  { $formkit: 'primeInputText', name: 'field1', label: '필드 1', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'field2', label: '필드 2', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'field3', label: '필드 3', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'field4', label: '필드 4', outerClass: 'col-3' },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' },
    children: [
      { $cmp: 'Button', props: { label: '조회', severity: 'primary', onClick: () => fetchData() } },
      { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', onClick: () => resetForm() } },
    ],
  },
]
```

포인트:
- 제목(h1~h6)은 자동으로 한 줄 전체를 차지합니다.
- `outerClass: 'col-3'`로 4등분(12/3) 배치. 다른 비율도 가능(`col-4`, `col-6` 등).
- 버튼 행은 `col-12`로 전체폭 사용 권장.

---

## 전역 SCSS 규칙 요약

### compact-form (컴팩트 폼)
- 입력 높이/패딩 축소, 라벨 폰트 축소, 버튼 패딩 축소
- 기본 submit/action 숨김

핵심 선택자:
```scss
.compact-form {
  .formkit-outer { margin-bottom: 0.25rem; }
  .formkit-label { font-size: 0.75rem; margin-bottom: 0.15rem; }
  .p-inputtext,
  input[type='text'],
  input[type='number'] { padding: 0.25rem 0.5rem; font-size: 0.875rem; height: 2rem; }
  select { padding: 0.25rem 0.5rem; font-size: 0.875rem; height: 2rem; }
  .p-button { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
  .formkit-actions,
  .formkit-outer[data-type='submit'],
  button[type='submit'] { display: none !important; }
}
```

### form-horizontal (가로 라벨)
- md 이상에서 레이블 폭 4/12, 입력 폭 8/12
- 체크박스는 전용 정렬 규칙 제공

핵심 선택자 발췌:
```scss
@include media-breakpoint-up(md) {
  .formkit-form.form-horizontal {
    .formkit-wrapper { display: flex; }
    .formkit-outer { width: 100%; }
    .formkit-outer label { width: calc((4 / 12) * 100%); padding-top: 0.25rem; }
    .formkit-outer .formkit-inner { width: calc((8 / 12) * 100%); }
    // 체크박스/메시지 정렬 규칙 포함
  }
}
```

### grid-4 (4열 배치)
- CSS Grid로 한 줄에 4개 필드 배치
- 제목(h1~h6)과 `col-12` 요소는 전체폭(span) 처리

핵심 선택자:
```scss
.formkit-form.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 0.75rem;
  row-gap: 0.25rem;
}
.formkit-form.grid-4 > .formkit-outer { width: 100% !important; max-width: 100% !important; }
.formkit-form.grid-4 > .col-12 { grid-column: 1 / -1; }
.formkit-form.grid-4 > h1,
.formkit-form.grid-4 > h2,
.formkit-form.grid-4 > h3,
.formkit-form.grid-4 > h4,
.formkit-form.grid-4 > h5,
.formkit-form.grid-4 > h6 { grid-column: 1 / -1; }
```

### col-1 ~ col-12 (폭 유틸)
- lg 이상에서 칼럼 너비를 비율로 고정합니다. (예: `col-3` = 25%)
- 작은 화면에서는 자동으로 100% 폭(스택)으로 동작

핵심 규칙:
```scss
@include media-breakpoint-up(lg) {
  .formkit-form {
    display: flex;
    flex-wrap: wrap;
    margin-left: -$gutter-width;
    margin-right: -$gutter-width;
    & > * { width: 100%; max-width: 100%; padding-left: $gutter-width; padding-right: $gutter-width; }
  }
  @for $i from 1 through 12 { .col-#{$i} { width: math.percentage(math.div($i, 12)); } }
}
```

---

## 체크박스 특별 규칙
- `primeCheckbox`는 라벨/체크 위치와 접두/접미(label/prefix/suffix) 조합을 고려한 레이아웃 규칙이 적용됩니다.
- 일반 입력과 동일하게 `form-horizontal`과 함께 사용할 수 있습니다.

---

## 팁 & 문제 해결
- 작은 화면에서 라벨·입력이 두 줄로 보이면 정상입니다. md 이상에서 가로 정렬됩니다.
- 제목과 버튼 행이 다른 필드와 같은 줄에 보이면, 제목은 자동 전체폭 처리되므로 스키마에서 `$el: 'h5'`를 첫 항목으로 두고, 버튼 행에는 `col-12`를 지정하세요.
- 필드를 4개보다 적게/많게 두면 그리드가 자동 줄바꿈합니다. 특정 행만 전체폭으로 쓰려면 해당 항목에 `outerClass: 'col-12'`를 지정하세요.

---

## 마이그레이션 노트
- `app/pages/dashboard3.vue`에 있던 컴팩트/그리드/헤딩 전용 규칙은 모두 전역으로 이동했습니다.
- 앞으로는 각 페이지에서 로컬 CSS 없이, `compact-form` 래퍼 + `form-class`와 `outerClass`만으로 동일한 UI를 재사용하세요.


