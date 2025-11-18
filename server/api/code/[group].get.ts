import sql from 'mssql'
import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const groupParam = event.context.params?.group

  if (!groupParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'code group가 필요합니다.',
    })
  }

  const codeGroup = String(groupParam).toUpperCase()

  try {
    const connection = await getDbConnection()
    const request = connection.request()
    request.input('code_grp', sql.NVarChar(50), codeGroup)

    const result = await request.query(`
      SELECT 
        code_grp,
        code,
        code_name,
        code_value1,
        code_value2,
        code_value3,
        code_value4,
        code_value5
      FROM c_code WITH (NOLOCK)
      WHERE code_grp = @code_grp
      ORDER BY code
    `)

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    }
  }
  catch (error) {
    console.error('코드 그룹 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '코드 그룹을 불러오는데 실패했습니다.',
    })
  }
})

