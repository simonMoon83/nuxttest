export interface SchemaTable {
  table_name: string
  table_schema: string
}

export interface SchemaColumn {
  column_name: string
  data_type: string
  max_length: number | null
  precision: number | null
  scale: number | null
  is_nullable: 'YES' | 'NO'
  default_value: string | null
  is_primary_key: boolean
  is_identity: boolean
}

export interface GridMaster {
  grid_id: string
  grid_name: string
  grid_type: string | null
  grid_row: number | null
  use_yn: 'Y' | 'N'
}

export interface GridDetail {
  grid_id: string
  col_id: string
  col_name: string
  col_seq: number | null
  col_type: string | null
  col_size: string | null
  col_code: string | null
  col_width: number | null
  col_hide: number | null
  col_flex: number | null
  use_yn: 'Y' | 'N'
}

export interface MenuAdminNode {
  id?: string
  menu_id?: string
  title: string
  href?: string
  icon?: string
  parent_id?: string
  sort_order?: number
  is_separator?: string
  is_active?: string
  search_yn?: string
  save_yn?: string
  templete_id?: string
}

export interface MenuDisplayEntry {
  menu_id: string
  contents_seq: number
  contents_type: string
  contents_header: string | null
  contents_width: number | null
  contents_height: number | null
  search_case: string | null
  save_case: string | null
  row_click_case: string | null
  row_click_target: string | null
}

export interface CodeItem {
  code_grp: string
  code: string
  code_name: string
  code_value1?: string | null
  code_value2?: string | null
  code_value3?: string | null
  code_value4?: string | null
  code_value5?: string | null
}

export interface CodeGroup {
  code_grp: string
  code_grp_name?: string
  description?: string | null
  use_yn?: 'Y' | 'N'
}

export type CodeDictionary = Record<string, CodeItem[]>

