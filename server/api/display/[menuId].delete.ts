import { executeStoredProcedure } from '../../utils/storedProcedure'

export default defineEventHandler(async (event) => {
  try {
    const menuId = event.context.params?.menuId
    if (!menuId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'menuId는 필수입니다.'
      })
    }

    const query = getQuery(event)
    const contentsSeq = query.contents_seq
    
    if (!contentsSeq) {
      throw createError({
        statusCode: 400,
        statusMessage: 'contents_seq는 필수입니다.'
      })
    }

    const result = await executeStoredProcedure('sp_menu_display_info', {
      case: 'save',
      row_state: 'D', // Delete
      menu_id: String(menuId),
      contents_seq: Number(contentsSeq),
      user_id: query.user_id || 'admin'
    })

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '메뉴 화면 구성 삭제 실패'
      })
    }

    return {
      success: true,
      message: '메뉴 화면 구성이 삭제되었습니다.'
    }
  } catch (error) {
    console.error('메뉴 화면 구성 삭제 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})

