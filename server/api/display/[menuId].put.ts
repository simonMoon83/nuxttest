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

    const body = await readBody(event)
    
    if (!body.contents_seq) {
      throw createError({
        statusCode: 400,
        statusMessage: 'contents_seq는 필수입니다.'
      })
    }

    const result = await executeStoredProcedure('sp_menu_display_info', {
      case: 'save',
      row_state: 'M', // Modify
      menu_id: String(menuId),
      contents_seq: body.contents_seq,
      contents_type: body.contents_type || null,
      contents_header: body.contents_header || null,
      contents_width: body.contents_width || null,
      contents_height: body.contents_height || null,
      search_case: body.search_case || null,
      save_case: body.save_case || null,
      row_click_case: body.row_click_case || null,
      row_click_target: body.row_click_target || null,
      user_id: body.user_id || 'admin'
    })

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || '메뉴 화면 구성 수정 실패'
      })
    }

    return {
      success: true,
      message: '메뉴 화면 구성이 수정되었습니다.'
    }
  } catch (error) {
    console.error('메뉴 화면 구성 수정 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})

