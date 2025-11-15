import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // s_로 시작하는 테이블 목록 조회
    const result = await connection.request().query(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_SCHEMA as table_schema
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE 's_%'
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)
    
    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    }
  } catch (error) {
    console.error('테이블 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '테이블 목록 조회 실패'
    })
  }
})

