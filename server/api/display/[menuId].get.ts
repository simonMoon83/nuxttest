import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const menuIdParam = event.context.params?.menuId
    if (!menuIdParam || String(menuIdParam).trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'menuId is required' })
    }
    const q = getQuery(event) as any
    const procedureName = typeof q?.procedure_name === 'string' ? q.procedure_name : undefined
    const searchName = typeof q?.search_name === 'string' ? q.search_name : undefined

    const connection = await getDbConnection()
    const request = connection.request()
    // menu_id가 문자열(코드)일 수 있으므로 변환하지 않고 그대로 전달
    request.input('menu_id', String(menuIdParam))

    const result = await request.query(`
      SELECT *
      FROM s_menu_display WITH (NOLOCK)
      WHERE menu_id = @menu_id
      ORDER BY contents_seq ASC
    `)

    return {
      success: true,
      data: Array.isArray(result.recordset) ? result.recordset : [],
      count: Array.isArray(result.recordset) ? result.recordset.length : 0,
      procedure_name: procedureName,
      search_name: searchName
    }
  } catch (error) {
    console.error('s_menu_display 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})


