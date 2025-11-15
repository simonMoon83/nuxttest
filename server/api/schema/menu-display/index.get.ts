import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const menuId = query.menu_id as string
    
    const connection = await getDbConnection()
    const request = connection.request()
    
    if (menuId) {
      // 특정 메뉴의 display 구성 조회
      request.input('menu_id', sql.NVarChar, menuId)
      const result = await request.query(`
        SELECT *
        FROM s_menu_display WITH (NOLOCK)
        WHERE menu_id = @menu_id
        ORDER BY contents_seq ASC
      `)
      
      return {
        success: true,
        data: result.recordset || [],
        count: result.recordset.length
      }
    } else {
      // 전체 목록 조회
      const result = await request.query(`
        SELECT *
        FROM s_menu_display WITH (NOLOCK)
        ORDER BY menu_id ASC, contents_seq ASC
      `)
      
      return {
        success: true,
        data: result.recordset || [],
        count: result.recordset.length
      }
    }
  } catch (error) {
    console.error('메뉴 디스플레이 목록 조회 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '메뉴 디스플레이 목록 조회 실패'
    })
  }
})

