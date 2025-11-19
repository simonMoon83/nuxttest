import { getQuery } from 'h3'
import { executeStoredProcedure } from '../../../utils/storedProcedure'

interface GridMasterRow {
  grid_id: string
  grid_name: string
  grid_type: string | null
  grid_row: number | null
  use_yn: 'Y' | 'N'
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    
    // 쿼리 파라미터에서 프로시저 이름 가져오기
    // 예: /api/schema/grids?procedureName=sp_adm019
    // 또는 /api/schema/grids?sp=019 → sp_adm019
    let procedureName = query.procedureName as string
    
    if (!procedureName && query.sp) {
      procedureName = `sp_adm${String(query.sp).padStart(3, '0')}`
    }
    
    if (!procedureName) {
      throw createError({
        statusCode: 400,
        statusMessage: '프로시저 이름(procedureName)이 필요합니다.',
      })
    }
    
    // 프로시저 이름 검증 (SQL Injection 방지)
    // sp_adm### 또는 sp_grid_master 허용
    if (!/^sp_adm\d{3}$/.test(procedureName) && procedureName !== 'sp_grid_master') {
      throw createError({
        statusCode: 400,
        statusMessage: '유효하지 않은 프로시저 이름입니다. sp_adm### 또는 sp_grid_master 형식만 허용됩니다.',
      })
    }
    
    const result = await executeStoredProcedure(procedureName, {
      case: 'search'
    })
    
    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '그리드 목록 조회 실패',
      })
    }

    const data = (result.data || result.recordset || []) as GridMasterRow[]
    
    return {
      success: true,
      data,
      count: data.length
    }
  }
  catch (error) {
    console.error('그리드 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '그리드 목록 조회 실패',
    })
  }
})
