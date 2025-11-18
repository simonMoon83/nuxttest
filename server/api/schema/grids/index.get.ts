import { executeStoredProcedure } from '../../../utils/storedProcedure'

interface GridMasterRow {
  grid_id: string
  grid_name: string
  grid_type: string | null
  grid_row: number | null
  use_yn: 'Y' | 'N'
}

export default defineEventHandler(async () => {
  try {
    const result = await executeStoredProcedure('sp_adm011', {
      case: 'search'
    })
    
    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '그리드 목록 조회 실패'
      })
    }

    const data = (result.data || result.recordset || []) as GridMasterRow[]
    
    return {
      success: true,
      data,
      count: data.length
    }
  } catch (error) {
    console.error('그리드 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '그리드 목록 조회 실패'
    })
  }
})

