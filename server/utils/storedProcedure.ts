import sql from 'mssql'
import { getDbConnection } from './db'

export interface StoredProcedureParams {
  [key: string]: any
}

export interface StoredProcedureResult {
  success: boolean
  data?: any
  error?: string
  executionTime?: number
  procedureName: string
  parameters: StoredProcedureParams
  recordset?: any[]
  rowsAffected?: number[]
  output?: any
  returnValue?: any
}

/**
 * Stored Procedure를 호출하는 서비스
 * @param procedureName 프로시저명
 * @param parameters 프로시저 파라미터 (JSON 형태)
 * @returns 실행 결과 (JSON 형태)
 */
export async function executeStoredProcedure(
  procedureName: string, 
  parameters: StoredProcedureParams = {}
): Promise<StoredProcedureResult> {
  const startTime = Date.now()
  const commandSql = buildExecCommand(procedureName, parameters)

  try {
    const connection = await getDbConnection()

    // 프로시저 존재 여부 확인
    const checkRequest = connection.request()
    checkRequest.input('procedureName', procedureName)

    const checkProcedure = await checkRequest.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.routines 
      WHERE routine_name = @procedureName
    `)

    if (checkProcedure.recordset[0].count === 0) {
      console.log(`[StoredProcedure] ${commandSql} -> result=not_found, dataCount=0`)
      return {
        success: false,
        error: `Stored procedure '${procedureName}' not found`,
        executionTime: Date.now() - startTime,
        procedureName,
        parameters
      }
    }

    // 프로시저 호출을 위한 request 생성
    const request = connection.request()
    
    // 파라미터를 request에 추가
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value)
    })

    // 프로시저 실행
    const result = await request.execute(procedureName)

    const executionTime = Date.now() - startTime
    const dataCount = Array.isArray((result as any)?.recordset)
      ? (result as any).recordset.length
      : Array.isArray((result as any)?.recordsets)
        ? (result as any).recordsets.reduce((sum: number, rs: any) => sum + (Array.isArray(rs) ? rs.length : 0), 0)
        : 0

    console.log(`[StoredProcedure] ${commandSql} -> result=success, dataCount=${dataCount}`)
    
    return {
      success: true,
      data: result.recordset,
      recordset: result.recordset,  // 원본 recordset도 포함
      rowsAffected: result.rowsAffected,
      output: result.output,
      returnValue: result.returnValue,
      executionTime,
      procedureName,
      parameters
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.log(`[StoredProcedure] ${commandSql} -> result=failed, dataCount=0`)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime,
      procedureName,
      parameters
    }
  }
}

/**
 * 여러 Stored Procedure를 순차적으로 실행하는 서비스
 * @param procedures 실행할 프로시저 목록
 * @returns 각 프로시저의 실행 결과
 */
export async function executeMultipleStoredProcedures(
  procedures: Array<{
    name: string
    parameters?: StoredProcedureParams
  }>
): Promise<StoredProcedureResult[]> {
  const results: StoredProcedureResult[] = []
  
  for (const procedure of procedures) {
    const result = await executeStoredProcedure(procedure.name, procedure.parameters || {})
    results.push(result)
    
    // 실패한 경우 중단 (선택사항)
    if (!result.success) {
      break
    }
  }
  
  return results
}

/**
 * Stored Procedure의 파라미터 정보를 조회하는 서비스
 * @param procedureName 프로시저명
 * @returns 파라미터 정보
 */
export async function getStoredProcedureParameters(procedureName: string): Promise<any> {
  try {
    const connection = await getDbConnection()
    
    const request = connection.request()
    request.input('procedureName', procedureName)
    
    const result = await request.query(`
      SELECT 
        PARAMETER_NAME,
        PARAMETER_MODE,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.PARAMETERS 
      WHERE SPECIFIC_NAME = @procedureName
      ORDER BY ORDINAL_POSITION
    `)
    
    return {
      success: true,
      data: result.recordset,
      procedureName
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      procedureName
    }
  }
}

function buildExecCommand(procedureName: string, parameters: StoredProcedureParams): string {
  const pairs = Object.entries(parameters).map(([key, value]) => {
    const formatted = formatValueForLog(value)
    return `@${key}=${formatted}`
  })
  const paramSql = pairs.join(', ')
  return `EXEC ${procedureName}${paramSql ? ' ' + paramSql : ''}`
}

function formatValueForLog(value: any): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof Date) return `'${value.toISOString()}'`
  try {
    if (typeof value === 'object') return `'${JSON.stringify(value)}'`
  } catch {}
  const text = String(value).replace(/'/g, "''")
  return `'${text}'`
}
