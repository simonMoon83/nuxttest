import { executeStoredProcedure } from '../../../utils/storedProcedure'

interface GridDetailRow {
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

export default defineEventHandler(async (event) => {
  try {
    const gridId = event.context.params?.gridId
    
    if (!gridId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'gridId 파라미터가 필요합니다.'
      })
    }
    
    const result = await executeStoredProcedure('sp_grid_info', {
      case: 'search',
      grid_id: gridId
    })
    
    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '그리드 상세 정보 조회 실패'
      })
    }

    const data = (result.data || result.recordset || []) as GridDetailRow[]
    
    return {
      success: true,
      data,
      count: data.length
    }
  } catch (error) {
    console.error('그리드 상세 정보 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '그리드 상세 정보 조회 실패'
    })
  }
})

