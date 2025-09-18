import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // 모든 stored procedure 조회
    const result = await connection.request().query(`
      SELECT 
        ROUTINE_NAME as procedureName,
        ROUTINE_DEFINITION as definition,
        CREATED as createdDate,
        LAST_ALTERED as lastModified
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `)
    
    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    }
    
  } catch (error) {
    console.error('Stored procedure 목록 조회 오류:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})
