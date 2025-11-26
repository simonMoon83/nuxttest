/**
 * FormKit Schema 헬퍼 컴포저블
 *
 * FormKit + PrimeVue 스키마 생성을 위한 유틸리티 함수 제공
 * 타입 안전성과 코드 재사용성을 높이기 위한 팩토리 함수들
 *
 * @example
 * ```ts
 * const { createSearchSchema, createEditSchema, createButtonGroup } = useFormKitSchemaHelpers()
 *
 * const searchSchema = createSearchSchema([
 *   { name: 'keyword', label: '검색어' },
 *   { name: 'status', label: '상태', type: 'primeSelect', options: statusOptions },
 * ], [
 *   { label: '검색', onClick: search },
 *   { label: '초기화', onClick: reset, outlined: true },
 * ])
 * ```
 */

import type {
  ButtonConfig,
  ButtonSeverity,
  ColumnWidth,
  EditFieldConfig,
  FormKitComponentNode,
  FormKitElementNode,
  FormKitInputNode,
  FormKitSchema,
  FormKitSchemaNode,
  PrimeInputType,
  SearchFieldConfig,
} from '~/types/formkit-schema'

export function useFormKitSchemaHelpers() {
  /**
   * HTML 엘리먼트 노드 생성
   * @param tag HTML 태그명 (h1, h2, div, span 등)
   * @param children 자식 요소 (문자열 또는 FormKit 표현식)
   * @param attrs 추가 속성
   */
  function addElement(
    tag: string,
    children: string | string[],
    attrs?: Record<string, any>,
  ): FormKitElementNode {
    return {
      $el: tag,
      children: Array.isArray(children) ? children : [children],
      ...(attrs && { attrs }),
    }
  }

  /**
   * 섹션 제목 생성 (h5 태그, 전체 너비)
   * @param title 섹션 제목
   * @param level 헤딩 레벨 (기본값: 5)
   */
  function addSectionTitle(title: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 5): FormKitElementNode {
    return {
      $el: `h${level}`,
      children: [title],
      attrs: { class: 'col-12 mb-2' },
    }
  }

  /**
   * 입력 필드 노드 생성
   * @param config 필드 설정
   */
  function createInputField(config: SearchFieldConfig | EditFieldConfig): FormKitInputNode {
    const {
      name,
      label,
      type = 'primeInputText',
      width = 'col-4',
      validation,
      placeholder,
      options,
      optionLabel,
      optionValue,
      showClear,
      filter,
      ...rest
    } = config

    const node: FormKitInputNode = {
      $formkit: type,
      name,
      label,
      outerClass: width,
    }

    if (validation)
      node.validation = Array.isArray(validation) ? validation.join('|') : validation
    if (placeholder)
      node.placeholder = placeholder

    // Select 관련 속성
    if (options)
      node.options = options
    if (optionLabel)
      node.optionLabel = optionLabel
    if (optionValue)
      node.optionValue = optionValue
    if (showClear !== undefined)
      node.showClear = showClear
    if (filter !== undefined)
      node.filter = filter

    // 나머지 속성 병합
    Object.assign(node, rest)

    return node
  }

  /**
   * 버튼 컴포넌트 노드 생성
   * @param config 버튼 설정
   */
  function createButton(config: ButtonConfig): FormKitComponentNode {
    const {
      label,
      onClick,
      severity = 'secondary',
      outlined = false,
      loading,
      disabled,
      icon,
      type = 'button',
      if: condition,
    } = config

    const node: FormKitComponentNode = {
      $cmp: 'Button',
      props: {
        label,
        severity,
        onClick,
      },
    }

    if (outlined)
      node.props!.outlined = true
    if (loading !== undefined)
      node.props!.loading = loading
    if (disabled !== undefined)
      node.props!.disabled = disabled
    if (icon)
      node.props!.icon = icon
    if (type !== 'button')
      node.props!.type = type
    if (condition)
      node.if = condition

    return node
  }

  /**
   * 버튼 그룹 생성 (오른쪽 정렬)
   * @param buttons 버튼 설정 배열
   * @param className 추가 클래스명
   */
  function createButtonGroup(
    buttons: ButtonConfig[],
    className: string = 'col-12 w-full flex justify-end items-center gap-x-2 mt-1',
  ): FormKitElementNode {
    return {
      $el: 'div',
      attrs: { class: className },
      children: buttons.map(btn => createButton(btn)),
    }
  }

  /**
   * 검색 폼 스키마 생성
   * @param fields 검색 필드 설정 배열
   * @param actions 버튼 설정 배열
   * @param options 추가 옵션
   */
  function createSearchSchema(
    fields: SearchFieldConfig[],
    actions: ButtonConfig[],
    options?: {
      sectionTitle?: string
      buttonGroupClass?: string
    },
  ): FormKitSchema {
    const schema: FormKitSchema = []

    // 섹션 제목 추가 (선택적)
    if (options?.sectionTitle) {
      schema.push(addSectionTitle(options.sectionTitle))
    }

    // 필드 추가
    for (const field of fields) {
      schema.push(createInputField(field))
    }

    // 버튼 그룹 추가
    schema.push(createButtonGroup(actions, options?.buttonGroupClass))

    return schema
  }

  /**
   * 편집 폼 스키마 생성
   * @param fields 편집 필드 설정 배열
   * @param actions 버튼 설정 배열
   * @param options 추가 옵션
   */
  function createEditSchema(
    fields: EditFieldConfig[],
    actions: ButtonConfig[],
    options?: {
      includeHiddenId?: boolean
      sectionTitle?: string
      buttonGroupClass?: string
    },
  ): FormKitSchema {
    const schema: FormKitSchema = []

    // hidden id 필드 추가 (선택적)
    if (options?.includeHiddenId) {
      schema.push({ $formkit: 'hidden', name: 'id' } as FormKitInputNode)
    }

    // 섹션 제목 추가 (선택적)
    if (options?.sectionTitle) {
      schema.push(addSectionTitle(options.sectionTitle))
    }

    // 필드 추가
    for (const field of fields) {
      const inputField = createInputField(field)

      // required 플래그를 validation으로 변환
      if ((field as EditFieldConfig).required && !field.validation) {
        inputField.validation = 'required'
      }

      schema.push(inputField)
    }

    // 버튼 그룹 추가
    schema.push(createButtonGroup(actions, options?.buttonGroupClass || 'col-12 w-full flex justify-end items-center gap-x-2 mt-2'))

    return schema
  }

  /**
   * 표준 검색 버튼 세트 생성
   * @param handlers 핸들러 함수들
   */
  function createStandardSearchButtons(handlers: {
    onSearch: () => void
    onReset: () => void
    onCreate?: () => void
    onExport?: () => void
  }): ButtonConfig[] {
    const buttons: ButtonConfig[] = [
      { label: '검색', onClick: handlers.onSearch, severity: 'primary' },
      { label: '초기화', onClick: handlers.onReset, outlined: true, severity: 'secondary', type: 'reset' },
    ]

    if (handlers.onCreate) {
      buttons.push({ label: '등록', onClick: handlers.onCreate, severity: 'secondary' })
    }

    if (handlers.onExport) {
      buttons.push({ label: '엑셀', onClick: handlers.onExport, outlined: true, severity: 'secondary' })
    }

    return buttons
  }

  /**
   * 표준 편집 다이얼로그 버튼 세트 생성
   * @param handlers 핸들러 함수들
   * @param options 추가 옵션
   */
  function createStandardEditButtons(
    handlers: {
      onSave: () => void
      onCancel: () => void
      onDelete?: () => void
    },
    options?: {
      deleting?: Ref<boolean>
      showDeleteWhen?: string // FormKit 조건 표현식 (예: '$id')
    },
  ): ButtonConfig[] {
    const buttons: ButtonConfig[] = []

    // 삭제 버튼 (조건부)
    if (handlers.onDelete) {
      buttons.push({
        label: '삭제',
        onClick: handlers.onDelete,
        severity: 'danger',
        loading: options?.deleting?.value,
        if: options?.showDeleteWhen || '$id',
      })
    }

    // 취소 버튼
    buttons.push({
      label: '취소',
      onClick: handlers.onCancel,
      severity: 'secondary',
    })

    // 저장 버튼
    buttons.push({
      label: '저장',
      onClick: handlers.onSave,
      severity: 'primary',
    })

    return buttons
  }

  /**
   * 컬럼 너비 헬퍼
   * @param cols 컬럼 수 (1-12)
   * @param mdCols 태블릿 이상에서의 컬럼 수 (선택적)
   */
  function col(cols: number, mdCols?: number): string {
    if (mdCols) {
      return `col-${cols} md:col-${mdCols}`
    }
    return `col-${cols}`
  }

  return {
    // 기본 헬퍼
    addElement,
    addSectionTitle,
    createInputField,
    createButton,
    createButtonGroup,

    // 스키마 팩토리
    createSearchSchema,
    createEditSchema,

    // 표준 버튼 세트
    createStandardSearchButtons,
    createStandardEditButtons,

    // 유틸리티
    col,
  }
}

// Vue Ref 타입 (런타임용)
type Ref<T> = { value: T }

