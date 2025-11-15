import { executeStoredProcedure } from '../../../utils/storedProcedure'

export default defineEventHandler(async (event) => {
  try {
    // sp_adm011 프로시저 호출하여 그리드 마스터 목록 조회
    const result = await executeStoredProcedure('sp_adm011', {
      case: 'search'
    })
    
    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '그리드 목록 조회 실패'
      })
    }
    
    return {
      success: true,
      data: result.data || result.recordset || [],
      count: Array.isArray(result.data) ? result.data.length : (Array.isArray(result.recordset) ? result.recordset.length : 0)
    }
  } catch (error) {
    console.error('그리드 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '그리드 목록 조회 실패'
    })
  }
})

