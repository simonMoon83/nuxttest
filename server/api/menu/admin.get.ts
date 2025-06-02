import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // 관리자용으로 모든 메뉴 (비활성 포함) 조회
    const result = await connection.request()
      .query(`
        SELECT 
          id, title, href, icon, parent_id, sort_order, is_separator, is_active
        FROM nuxt_menu 
        ORDER BY parent_id ASC, sort_order ASC
      `)
    
    return {
      success: true,
      data: result.recordset
    }
  } catch (error) {
    console.error('메뉴 관리 데이터 로드 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '메뉴 데이터를 불러오는데 실패했습니다.'
    })
  }
}) 