/**
 * AG Grid 관련 타입 정의
 */

import type { ColDef, GridApi, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from 'ag-grid-community'

/**
 * AG Grid 컴포넌트 Props
 */
export interface AgGridProps {
  title?: string
  columnDefs?: ColDef[]
  rowData?: any[]
  searchQuery?: string
  gridId?: string
  treeData?: boolean
  autoGroupColumnName?: string
  editable?: boolean
  showAddRowButton?: boolean
  showDeleteRowButton?: boolean
  editMode?: 'singleClick' | 'doubleClick' | 'enterKey'
  rowSelect?: boolean
  procedureName?: string
  saveCase?: string
  menuId?: string | number
  extraSaveParams?: Record<string, any>
  saveParamFields?: string[]
  showSaveButton?: boolean
  saveButtonLabel?: string
  savingState?: boolean
}

/**
 * 동적 컬럼 정의 (sp_grid_info 결과)
 */
export interface DynamicColumnDef extends ColDef {
  __colType?: string
  __options?: DropdownOption[]
  __saveParam?: boolean
}

/**
 * 드롭다운 옵션
 */
export interface DropdownOption {
  code: string
  code_name?: string
  name?: string
  text?: string
}

/**
 * 행 상태 타입
 * - N: 신규 (New)
 * - M: 수정됨 (Modified)
 * - D: 삭제됨 (Deleted)
 */
export type RowStatus = 'N' | 'M' | 'D'

/**
 * 상태가 포함된 행 데이터
 */
export interface StatusRow {
  __status?: RowStatus
  __rownum?: number
  [key: string]: any
}

/**
 * 변경된 행 데이터 그룹
 */
export interface ChangedRows {
  added: StatusRow[]
  modified: StatusRow[]
  deleted: StatusRow[]
}

/**
 * 저장 결과 요약
 */
export interface SaveResult {
  added: number
  modified: number
  deleted: number
}

/**
 * 편집 정책
 * - A: Always, 항상 편집 가능
 * - F: First/New row only, 신규 행에서만 편집 가능
 * - N: Never, 편집 불가
 */
export type EditPolicy = 'A' | 'F' | 'N'

/**
 * sp_grid_info 컬럼 정보 (API 응답)
 */
export interface GridInfoColumn {
  col_id: string
  col_name: string
  col_type?: string
  col_width?: number
  col_hide?: number | string
  col_flex?: number
  col_edit?: string
  col_save?: string | boolean
  col_code?: string
}

/**
 * AG Grid Expose 메서드
 */
export interface AgGridExposeMethods {
  expandAll: () => void
  collapseAll: () => void
  exportExcel: () => void
  applyFilter: () => void
  getGridApi: () => GridApi | null
  loadDynamicColumnDefs: () => Promise<void>
  getDynamicColumnDefs: () => DynamicColumnDef[]
  markDeleted: (row: StatusRow) => void
  clearStatuses: () => void
  addRow: () => void
  deleteSelectedRows: () => void
  stopEditing: () => void
  save: () => Promise<SaveResult>
  getAllRows: () => StatusRow[]
  getChangedRows: () => ChangedRows
  getSaveParamFields: () => string[]
}

