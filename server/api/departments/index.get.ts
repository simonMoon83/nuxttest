import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string) || ''

    const connection = await getDbConnection()

    // 간단한 검색과 정렬 적용
    const result = await connection.request()
      .input('search', `%${search}%`)
      .query(`
        SELECT id, name, code, description, parent_id, sort_order, is_active, created_at, updated_at
        FROM departments
        WHERE (@search = '%%') OR (name LIKE @search OR code LIKE @search OR description LIKE @search)
        ORDER BY sort_order ASC, name ASC
      `)

    return {
      success: true,
      data: result.recordset,
    }
  } catch (error) {
    console.error('부서 목록 조회 실패:', error)
    throw createError({ statusCode: 500, statusMessage: '부서 목록을 불러오지 못했습니다.' })
  }
})


