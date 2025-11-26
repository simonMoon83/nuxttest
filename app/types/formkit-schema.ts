/**
 * FormKit Schema 타입 정의
 * 
 * FormKit + PrimeVue 통합을 위한 타입 안전성 제공
 * @see https://formkit.com/essentials/schema
 */

// PrimeVue FormKit 입력 컴포넌트 타입
export type PrimeInputType =
  | 'primeInputText'
  | 'primeInputNumber'
  | 'primePassword'
  | 'primeTextarea'
  | 'primeSelect'
  | 'primeMultiSelect'
  | 'primeCheckbox'
  | 'primeRadioButton'
  | 'primeDatePicker'
  | 'primeCalendar'
  | 'primeSlider'
  | 'primeKnob'
  | 'primeEditor'
  | 'primeAutoComplete'
  | 'primeCascadeSelect'
  | 'primeColorPicker'
  | 'primeInputMask'
  | 'primeInputOtp'
  | 'primeListbox'
  | 'primeRating'
  | 'primeSelectButton'
  | 'primeToggleButton'
  | 'primeToggleSwitch'
  | 'primeTreeSelect'
  | 'hidden'

// PrimeVue FormKit 출력 컴포넌트 타입
export type PrimeOutputType =
  | 'primeOutputText'
  | 'primeOutputNumber'
  | 'primeOutputDate'
  | 'primeOutputLink'

// 컬럼 너비 타입
export type ColumnWidth =
  | 'col-1' | 'col-2' | 'col-3' | 'col-4' | 'col-5' | 'col-6'
  | 'col-7' | 'col-8' | 'col-9' | 'col-10' | 'col-11' | 'col-12'

// 반응형 컬럼 너비 (md:col-N 패턴)
export type ResponsiveColumnWidth = `${ColumnWidth}` | `${ColumnWidth} md:${ColumnWidth}`

// FormKit 유효성 검사 규칙
export type ValidationRule =
  | 'required'
  | 'email'
  | 'number'
  | 'confirm'
  | `length:${number},${number}`
  | `min:${number}`
  | `max:${number}`
  | `matches:${string}`
  | string // 기타 커스텀 규칙 허용

// 버튼 심각도 타입
export type ButtonSeverity =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warn'
  | 'warning'
  | 'danger'
  | 'help'
  | 'contrast'

// Select 옵션 타입
export interface SelectOption<T = string | number> {
  label: string
  value: T
  disabled?: boolean
}

// FormKit 입력 필드 스키마 노드
export interface FormKitInputNode {
  $formkit: PrimeInputType | PrimeOutputType
  name: string
  label?: string
  validation?: ValidationRule | ValidationRule[]
  'validation-visibility'?: 'blur' | 'dirty' | 'live'
  outerClass?: ResponsiveColumnWidth | string
  help?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  
  // Select/MultiSelect 전용
  options?: SelectOption[] | Ref<SelectOption[]> | ComputedRef<SelectOption[]> | any[]
  optionLabel?: string
  optionValue?: string
  showClear?: boolean
  filter?: boolean
  
  // InputNumber 전용
  min?: number
  max?: number
  step?: number
  showButtons?: boolean
  useGrouping?: boolean
  minFractionDigits?: number
  maxFractionDigits?: number
  
  // Textarea 전용
  rows?: number | string
  autoResize?: boolean
  
  // DatePicker 전용
  showIcon?: boolean
  dateFormat?: string
  
  // Password 전용
  toggleMask?: boolean
  feedback?: boolean
  inputProps?: Record<string, any>
  
  // Checkbox 전용
  suffix?: string
  prefix?: string
  
  // 아이콘
  iconPrefix?: string
  iconSuffix?: string
  
  // 조건부 렌더링 (FormKit 표현식)
  if?: string
  
  // 기타 속성
  [key: string]: any
}

// HTML 엘리먼트 스키마 노드
export interface FormKitElementNode {
  $el: string
  children?: (FormKitSchemaNode | string)[] | string
  attrs?: {
    class?: string
    style?: string
    [key: string]: any
  }
  if?: string
}

// Vue 컴포넌트 스키마 노드
export interface FormKitComponentNode {
  $cmp: string
  props?: {
    label?: string
    severity?: ButtonSeverity
    outlined?: boolean
    text?: boolean
    rounded?: boolean
    loading?: boolean | Ref<boolean>
    disabled?: boolean | Ref<boolean>
    icon?: string
    iconPos?: 'left' | 'right'
    type?: 'button' | 'submit' | 'reset'
    onClick?: () => void | Promise<void>
    [key: string]: any
  }
  if?: string
}

// 통합 스키마 노드 타입
export type FormKitSchemaNode =
  | FormKitInputNode
  | FormKitElementNode
  | FormKitComponentNode

// 스키마 배열 타입
export type FormKitSchema = FormKitSchemaNode[]

// 검색 필드 설정 타입
export interface SearchFieldConfig {
  name: string
  label: string
  type?: PrimeInputType
  width?: ColumnWidth
  options?: SelectOption[] | Ref<SelectOption[]> | any[]
  optionLabel?: string
  optionValue?: string
  placeholder?: string
  showClear?: boolean
  filter?: boolean
  validation?: ValidationRule | ValidationRule[]
}

// 편집 필드 설정 타입
export interface EditFieldConfig extends SearchFieldConfig {
  required?: boolean
  help?: string
  disabled?: boolean
  // Checkbox 전용
  suffix?: string
  // Password 전용
  toggleMask?: boolean
  feedback?: boolean
  // Textarea 전용
  rows?: number
  // InputNumber 전용
  min?: number
  max?: number
}

// 버튼 설정 타입
export interface ButtonConfig {
  label: string
  onClick: () => void | Promise<void>
  severity?: ButtonSeverity
  outlined?: boolean
  loading?: boolean | Ref<boolean>
  disabled?: boolean | Ref<boolean>
  icon?: string
  type?: 'button' | 'submit' | 'reset'
  if?: string // 조건부 표시
}

// 폼 클래스 타입
export type FormClass =
  | 'form-horizontal'
  | 'grid-4'
  | 'grid-6'
  | 'grid-12'
  | 'form-horizontal grid-4'
  | 'form-horizontal grid-6'
  | 'form-horizontal grid-12'
  | string

// Vue Ref 타입 (타입 추론용)
type Ref<T> = { value: T }
type ComputedRef<T> = { readonly value: T }

