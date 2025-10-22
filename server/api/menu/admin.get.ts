import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const connection = await getDbConnection()
    
    // 관리자용으로 모든 메뉴 (비활성 포함) 조회 - 새 테이블에 맞춰 alias 제공(기존 UI 호환)
    const result = await connection.request()
      .query(`
        SELECT 
          menu_id        AS id,
          menu_name      AS title,
          menu_url       AS href,
          menu_icon      AS icon,
          p_menu_id      AS parent_id,
          sort           AS sort_order,
          separate_yn    AS is_separator,
          use_yn         AS is_active,
          search_yn,
          save_yn,
          templete_id
        FROM s_menu_info WITH (NOLOCK)
        ORDER BY p_menu_id ASC, sort ASC
      `)
    
    return {
      success: true,
      data: result.recordset
    }
  } catch (error) {
    console.error('메뉴 관리 데이터 로드 실패:', error)
    throw createError({
      statusCode: 500,
      message: '메뉴 데이터를 불러오는데 실패했습니다.'
    })
  }
})