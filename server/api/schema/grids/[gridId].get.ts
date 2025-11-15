import { executeStoredProcedure } from '../../../utils/storedProcedure'

export default defineEventHandler(async (event) => {
  try {
    const gridId = event.context.params?.gridId
    
    if (!gridId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'gridId 파라미터가 필요합니다.'
      })
    }
    
    // sp_grid_info 프로시저 호출하여 그리드 상세 정보 조회
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
    
    return {
      success: true,
      data: result.data || result.recordset || [],
      count: Array.isArray(result.data) ? result.data.length : (Array.isArray(result.recordset) ? result.recordset.length : 0)
    }
  } catch (error) {
    console.error('그리드 상세 정보 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '그리드 상세 정보 조회 실패'
    })
  }
})

