import { executeStoredProcedure, executeMultipleStoredProcedures, getStoredProcedureParameters } from '../../utils/storedProcedure'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { procedureName, parameters, action } = body

    console.log('[API] Stored Procedure 요청:', { procedureName, parameters, action })

    // action이 'parameters'인 경우 프로시저 파라미터 정보 조회
    if (action === 'parameters') {
      if (!procedureName) {
        throw createError({
          statusCode: 400,
          statusMessage: '프로시저명이 필요합니다.'
        })
      }
      
      console.log('[API] 프로시저 파라미터 정보 조회:', procedureName)
      const result = await getStoredProcedureParameters(procedureName)
      return result
    }

    // action이 'multiple'인 경우 여러 프로시저 실행
    if (action === 'multiple') {
      if (!Array.isArray(parameters)) {
        throw createError({
          statusCode: 400,
          statusMessage: '여러 프로시저 실행시에는 procedures 배열이 필요합니다.'
        })
      }
      
      console.log('[API] 여러 프로시저 실행:', parameters)
      const result = await executeMultipleStoredProcedures(parameters)
      return {
        success: true,
        results: result,
        totalCount: result.length,
        successCount: result.filter(r => r.success).length
      }
    }

    // 단일 프로시저 실행 (기본 동작)
    if (!procedureName) {
      throw createError({
        statusCode: 400,
        statusMessage: '프로시저명이 필요합니다.'
      })
    }

    console.log('[API] 단일 프로시저 실행:', { procedureName, parameters })
    const result = await executeStoredProcedure(procedureName, parameters || {})
    console.log('[API] 프로시저 실행 결과:', { success: result.success, dataLength: result.data?.length || 0 })
    return result

  } catch (error) {
    console.error('[API] Stored procedure 실행 오류:', error)
    console.error('[API] 오류 상세 정보:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})
