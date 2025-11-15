import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const menuId = query.menu_id as string
    const contentsSeq = query.contents_seq as string
    
    if (!menuId || !contentsSeq) {
      throw createError({
        statusCode: 400,
        statusMessage: 'menu_id와 contents_seq는 필수입니다.'
      })
    }
    
    const connection = await getDbConnection()
    const request = connection.request()
    request.input('menu_id', sql.NVarChar, menuId)
    request.input('contents_seq', sql.Int, parseInt(contentsSeq))
    
    await request.query(`
      DELETE FROM s_menu_display
      WHERE menu_id = @menu_id AND contents_seq = @contents_seq
    `)
    
    return {
      success: true,
      message: '메뉴 디스플레이를 삭제했습니다.'
    }
  } catch (error) {
    console.error('메뉴 디스플레이 삭제 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '메뉴 디스플레이 삭제 실패'
    })
  }
})

