import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      menu_id,
      contents_seq,
      contents_type,
      contents_header,
      grid_id,
      save_yn,
      search_case,
      save_case,
      contents_width,
      contents_height
    } = body
    
    if (!menu_id || contents_seq === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'menu_id와 contents_seq는 필수입니다.'
      })
    }
    
    const connection = await getDbConnection()
    const request = connection.request()
    
    // 기존 데이터 확인
    request.input('menu_id', sql.NVarChar, menu_id)
    request.input('contents_seq', sql.Int, contents_seq)
    
    const checkResult = await request.query(`
      SELECT COUNT(*) as count
      FROM s_menu_display
      WHERE menu_id = @menu_id AND contents_seq = @contents_seq
    `)
    
    const exists = checkResult.recordset[0].count > 0
    
    if (exists) {
      // UPDATE
      const updateRequest = connection.request()
      updateRequest.input('menu_id', sql.NVarChar, menu_id)
      updateRequest.input('contents_seq', sql.Int, contents_seq)
      updateRequest.input('contents_type', sql.NVarChar, contents_type || null)
      updateRequest.input('contents_header', sql.NVarChar, contents_header || null)
      updateRequest.input('grid_id', sql.NVarChar, grid_id || null)
      updateRequest.input('save_yn', sql.Char(1), save_yn || 'N')
      updateRequest.input('search_case', sql.NVarChar, search_case || null)
      updateRequest.input('save_case', sql.NVarChar, save_case || null)
      updateRequest.input('contents_width', sql.Int, contents_width || null)
      updateRequest.input('contents_height', sql.Int, contents_height || null)
      
      await updateRequest.query(`
        UPDATE s_menu_display
        SET contents_type = @contents_type,
            contents_header = @contents_header,
            grid_id = @grid_id,
            save_yn = @save_yn,
            search_case = @search_case,
            save_case = @save_case,
            contents_width = @contents_width,
            contents_height = @contents_height
        WHERE menu_id = @menu_id AND contents_seq = @contents_seq
      `)
    } else {
      // INSERT
      const insertRequest = connection.request()
      insertRequest.input('menu_id', sql.NVarChar, menu_id)
      insertRequest.input('contents_seq', sql.Int, contents_seq)
      insertRequest.input('contents_type', sql.NVarChar, contents_type || null)
      insertRequest.input('contents_header', sql.NVarChar, contents_header || null)
      insertRequest.input('grid_id', sql.NVarChar, grid_id || null)
      insertRequest.input('save_yn', sql.Char(1), save_yn || 'N')
      insertRequest.input('search_case', sql.NVarChar, search_case || null)
      insertRequest.input('save_case', sql.NVarChar, save_case || null)
      insertRequest.input('contents_width', sql.Int, contents_width || null)
      insertRequest.input('contents_height', sql.Int, contents_height || null)
      
      await insertRequest.query(`
        INSERT INTO s_menu_display (
          menu_id, contents_seq, contents_type, contents_header,
          grid_id, save_yn, search_case, save_case,
          contents_width, contents_height
        )
        VALUES (
          @menu_id, @contents_seq, @contents_type, @contents_header,
          @grid_id, @save_yn, @search_case, @save_case,
          @contents_width, @contents_height
        )
      `)
    }
    
    return {
      success: true,
      message: exists ? '메뉴 디스플레이를 수정했습니다.' : '메뉴 디스플레이를 추가했습니다.'
    }
  } catch (error) {
    console.error('메뉴 디스플레이 저장 실패:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '메뉴 디스플레이 저장 실패'
    })
  }
})

