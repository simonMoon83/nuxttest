import sql from 'mssql'
import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const tableName = query.table_name as string
    
    if (!tableName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'table_name 파라미터가 필요합니다.'
      })
    }
    
    const connection = await getDbConnection()
    const request = connection.request()
    request.input('tableName', sql.NVarChar, tableName)
    
    // 테이블의 컬럼 정보 조회
    const result = await request.query(`
      SELECT 
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        CHARACTER_MAXIMUM_LENGTH as max_length,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as default_value,
        COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as is_identity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `)
    
    // Primary Key 정보 조회
    const pkRequest = connection.request()
    pkRequest.input('tableName', sql.NVarChar, tableName)
    
    const pkResult = await pkRequest.query(`
      SELECT COLUMN_NAME as column_name
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = @tableName
        AND CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE TABLE_NAME = @tableName
            AND CONSTRAINT_TYPE = 'PRIMARY KEY'
        )
      ORDER BY ORDINAL_POSITION
    `)
    
    const pkColumns = pkResult.recordset.map((r: any) => r.column_name)
    
    return {
      success: true,
      data: result.recordset.map((col: any) => ({
        ...col,
        is_primary_key: pkColumns.includes(col.column_name),
        is_identity: col.is_identity === 1
      })),
      count: result.recordset.length
    }
  } catch (error) {
    console.error('컬럼 정보 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '컬럼 정보 조회 실패'
    })
  }
})

