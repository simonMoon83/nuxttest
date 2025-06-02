import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id || isNaN(Number(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: '유효하지 않은 메뉴 ID입니다.'
      })
    }

    const connection = await getDbConnection()
    
    // 기존 메뉴 확인
    const existingMenu = await connection.request()
      .input('id', Number(id))
      .query('SELECT * FROM nuxt_menu WHERE id = @id')

    if (existingMenu.recordset.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: '메뉴를 찾을 수 없습니다.'
      })
    }

    // 자식 메뉴가 있는지 확인
    const childMenus = await connection.request()
      .input('parent_id', Number(id))
      .query('SELECT COUNT(*) as count FROM nuxt_menu WHERE parent_id = @parent_id AND is_active = 1')

    if (childMenus.recordset[0].count > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '하위 메뉴가 있는 메뉴는 삭제할 수 없습니다. 먼저 하위 메뉴를 삭제해주세요.'
      })
    }

    // 소프트 삭제 (is_active = 0으로 설정)
    await connection.request()
      .input('id', Number(id))
      .query(`
        UPDATE nuxt_menu 
        SET is_active = 0, updated_at = GETDATE()
        WHERE id = @id
      `)

    return {
      success: true,
      message: '메뉴가 성공적으로 삭제되었습니다.'
    }

  } catch (error) {
    console.error('메뉴 삭제 실패:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    return createError({
      statusCode: 500,
      statusMessage: '메뉴 삭제에 실패했습니다.'
    })
  }
}) 