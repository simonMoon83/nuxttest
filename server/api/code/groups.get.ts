import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async () => {
  try {
    const connection = await getDbConnection()
    const result = await connection.request().query(`
      SELECT 
        code_grp,
        code_grp_name,
        description,
        use_yn
      FROM c_code_group WITH (NOLOCK)
      ORDER BY code_grp
    `)

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    }
  }
  catch (error) {
    console.error('코드 그룹 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '코드 그룹 목록을 불러오는데 실패했습니다.',
    })
  }
})

