import { getDbConnection } from '../../utils/db'

interface MenuCreateData {
  title: string
  href?: string
  icon?: string
  parent_id?: number
  sort_order?: number
  is_separator?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as MenuCreateData
    const { title, href, icon, parent_id, sort_order, is_separator } = body

    // 필수 필드 검증
    if (!title && !is_separator) {
      throw createError({
        statusCode: 400,
        message: '제목은 필수입니다.'
      })
    }

    const connection = await getDbConnection()
    
    // 새 메뉴 추가
    const result = await connection.request()
      .input('title', title || '')
      .input('href', href || '')
      .input('icon', icon || '')
      .input('parent_id', parent_id || null)
      .input('sort_order', sort_order || 0)
      .input('is_separator', is_separator || false)
      .query(`
        INSERT INTO nuxt_menu (title, href, icon, parent_id, sort_order, is_separator)
        OUTPUT INSERTED.id
        VALUES (@title, @href, @icon, @parent_id, @sort_order, @is_separator)
      `)

    const newMenuId = result.recordset[0].id

    return {
      success: true,
      message: '메뉴가 성공적으로 추가되었습니다.',
      data: { id: newMenuId }
    }

  } catch (error) {
    console.error('메뉴 생성 실패:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    return createError({
      statusCode: 500,
      message: '메뉴 생성에 실패했습니다.'
    })
  }
}) 