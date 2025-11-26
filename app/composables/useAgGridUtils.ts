/**
 * AG Grid 유틸리티 함수 모음
 * - 값 변환, 포맷팅, 키 매칭 등 공통 유틸리티
 */

import type { DynamicColumnDef, EditPolicy, RowStatus, StatusRow } from '~/types/ag-grid'

/**
 * 다양한 형태의 값을 boolean으로 변환
 * @param value 변환할 값 (true/false, 'Y'/'N', 1/0, 'yes'/'no' 등)
 * @returns boolean 값
 */
export function coerceBooleanValue(value: any): boolean {
  if (value === true || value === false)
    return value
  const str = String(value ?? '').trim().toLowerCase()
  if (str === 'y' || str === 'yes' || str === 'true' || str === '1' || str === 't')
    return true
  if (str === 'n' || str === 'no' || str === 'false' || str === '0' || str === 'f' || str === '')
    return false
  return Boolean(value)
}

/**
 * 날짜 값을 포맷팅된 문자열로 변환
 * @param input 날짜 값 (Date, string, number 등)
 * @param kind 포맷 종류 ('date' | 'datetime')
 * @returns 포맷팅된 날짜 문자열 (YYYY-MM-DD 또는 YYYY-MM-DD HH:mm)
 */
export function formatDateValue(input: any, kind: 'date' | 'datetime'): string {
  if (input == null || input === '')
    return ''

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const y = input.getFullYear()
    const m = String(input.getMonth() + 1).padStart(2, '0')
    const d = String(input.getDate()).padStart(2, '0')
    if (kind === 'datetime') {
      const hh = String(input.getHours()).padStart(2, '0')
      const mm = String(input.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${hh}:${mm}`
    }
    return `${y}-${m}-${d}`
  }

  const raw = String(input).trim()

  // YYYYMMDD 형식
  if (/^\d{8}$/.test(raw)) {
    const y = Number(raw.slice(0, 4))
    const m = Number(raw.slice(4, 6)) - 1
    const d = Number(raw.slice(6, 8))
    const dt = new Date(y, m, d)
    return Number.isNaN(dt.getTime()) ? raw : formatDateValue(dt, kind)
  }

  // YYYYMMDDHHmmss 형식
  if (/^\d{14}$/.test(raw)) {
    const y = Number(raw.slice(0, 4))
    const m = Number(raw.slice(4, 6)) - 1
    const d = Number(raw.slice(6, 8))
    const hh = Number(raw.slice(8, 10))
    const mm = Number(raw.slice(10, 12))
    const ss = Number(raw.slice(12, 14))
    const dt = new Date(y, m, d, hh, mm, ss)
    return Number.isNaN(dt.getTime()) ? raw : formatDateValue(dt, kind)
  }

  const tryDate = new Date(raw)
  return Number.isNaN(tryDate.getTime()) ? raw : formatDateValue(tryDate, kind)
}

/**
 * col_edit 정책을 표준화
 * @param value 정책 값
 * @returns 표준화된 편집 정책 ('A' | 'F' | 'N')
 */
export function coerceEditPolicy(value: any): EditPolicy {
  const s = String(value ?? '').trim().toUpperCase()
  if (s === 'A' || s === 'F')
    return s
  return 'N'
}

/**
 * 신규 행 여부 확인 (__status === 'N')
 * @param row 행 데이터
 * @returns 신규 행이면 true
 */
export function isNewRow(row: StatusRow | null | undefined): boolean {
  try {
    return !!row && row.__status === 'N'
  }
  catch {
    return false
  }
}

/**
 * 문자열 값을 trim하여 반환
 * @param value 입력 값
 * @returns trim된 문자열
 */
export function toTrimmedString(value: any): string {
  return String(value ?? '').trim()
}

/**
 * 소문자로 변환된 trim 문자열 반환
 * @param value 입력 값
 * @returns 소문자 trim 문자열
 */
export function toLowerTrimmed(value: any): string {
  return toTrimmedString(value).toLowerCase()
}

/**
 * 숫자로 변환, 실패 시 undefined 반환
 * @param value 입력 값
 * @returns 숫자 또는 undefined
 */
export function toNumberOrUndefined(value: any): number | undefined {
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

/**
 * hide 값을 boolean으로 변환 (1 = true, 0 = false)
 * @param value 입력 값
 * @returns boolean
 */
export function toHideBoolean(value: any): boolean {
  const n = Number(value)
  return !Number.isNaN(n) ? n === 1 : String(value ?? '').trim() === '1'
}

/**
 * 키 정규화 (소문자, 특수문자 제거)
 * @param input 입력 키
 * @returns 정규화된 키
 */
export function normalizeKey(input: any): string {
  return String(input ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * 데이터 객체에서 매칭되는 키 찾기 (대소문자/구분자 무시)
 * @param data 데이터 객체
 * @param expectedField 찾을 필드명
 * @returns 매칭된 키 또는 null
 */
export function findMatchingKey(data: any, expectedField: string): string | null {
  if (!data || typeof data !== 'object')
    return null
  if (expectedField in data)
    return expectedField

  const target = normalizeKey(expectedField)
  const keys = Object.keys(data)
  for (const k of keys) {
    if (normalizeKey(k) === target)
      return k
  }
  return null
}

/**
 * 데이터 객체에서 값 가져오기 (키 매칭 적용)
 * @param data 데이터 객체
 * @param expectedField 필드명
 * @returns 값 또는 null
 */
export function smartGet(data: any, expectedField: string): any {
  if (!data)
    return null
  const key = findMatchingKey(data, expectedField)
  if (key)
    return (data as any)[key]
  return (data as any)[expectedField]
}

/**
 * 데이터 객체에 값 설정 (키 매칭 적용)
 * @param data 데이터 객체
 * @param expectedField 필드명
 * @param newValue 새 값
 * @returns 설정 성공 여부
 */
export function smartSet(data: any, expectedField: string, newValue: any): boolean {
  if (!data)
    return false
  const key = findMatchingKey(data, expectedField)
  if (key) {
    (data as any)[key] = newValue
    return true
  }
  if (expectedField) {
    (data as any)[expectedField] = newValue
    return true
  }
  return false
}

/**
 * 체크박스 값을 비트(0/1)로 변환
 * @param dynamicColumnDefs 동적 컬럼 정의 배열
 * @param field 필드명
 * @param value 값
 * @returns 변환된 값
 */
export function coerceCheckboxToBit(dynamicColumnDefs: DynamicColumnDef[], field: string, value: any): any {
  try {
    const def = dynamicColumnDefs.find((d: any) => d && d.field === field)
    const t = String(def?.__colType || '').toLowerCase()
    if (t === 'checkbox' || t === 'bool' || t === 'boolean') {
      return coerceBooleanValue(value) ? 1 : 0
    }
  }
  catch {
    // ignore
  }
  return value
}

/**
 * 행 객체에서 저장용 필드만 추출
 * @param row 행 데이터
 * @param fields 추출할 필드 목록
 * @param dynamicColumnDefs 동적 컬럼 정의 (체크박스 변환용)
 * @returns 추출된 객체
 */
export function pickSaveFields(
  row: any,
  fields: string[],
  dynamicColumnDefs: DynamicColumnDef[] = [],
): Record<string, any> {
  if (!row || typeof row !== 'object')
    return {}

  const out: Record<string, any> = {}
  fields.forEach((f) => {
    const key = findMatchingKey(row, f) || f
    const raw = (row as any)[key]
    out[f] = coerceCheckboxToBit(dynamicColumnDefs, f, raw)
  })
  return out
}

/**
 * rowData 샘플에서 자동 컬럼 정의 생성
 * @param sample 샘플 행 데이터
 * @returns 컬럼 정의 배열
 */
export function buildAutoColumnDefsFromRow(sample: any): any[] {
  if (!sample || typeof sample !== 'object')
    return []
  const keys = Object.keys(sample).filter(k => k && k !== '__rownum' && k !== '__status')
  return keys.map(k => ({ field: k, headerName: k }))
}

/**
 * useAgGridUtils composable
 * 컴포넌트에서 사용할 수 있는 유틸리티 함수 모음
 */
export function useAgGridUtils() {
  return {
    coerceBooleanValue,
    formatDateValue,
    coerceEditPolicy,
    isNewRow,
    toTrimmedString,
    toLowerTrimmed,
    toNumberOrUndefined,
    toHideBoolean,
    normalizeKey,
    findMatchingKey,
    smartGet,
    smartSet,
    coerceCheckboxToBit,
    pickSaveFields,
    buildAutoColumnDefsFromRow,
  }
}

