import { getDbConnection } from '../../utils/db'

interface MenuUpdateData {
  title?: string
  href?: string
  icon?: string
  parent_id?: number | null
  sort_order?: number
  is_separator?: boolean
  is_active?: boolean
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT') {
    throw createError({
      statusCode: 405,
      message: 'Method Not Allowed'
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event) as MenuUpdateData

  // ID 유효성 검사
  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid menu ID'
    })
  }

  try {
    const connection = await getDbConnection()

    // 메뉴 존재 여부 확인
    const checkResult = await connection.request()
      .input('id', id)
      .query('SELECT id FROM nuxt_menu WHERE id = @id')

    if (checkResult.recordset.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Menu not found'
      })
    }

    // 업데이트할 필드가 있는지 확인
    const updateFields = Object.keys(body).filter(key => body[key as keyof MenuUpdateData] !== undefined)
    
    if (updateFields.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No fields to update'
      })
    }

    // 동적으로 UPDATE 쿼리 생성
    const setParts: string[] = []
    const request = connection.request()

    if (body.title !== undefined) {
      setParts.push('title = @title')
      request.input('title', body.title)
    }
    if (body.href !== undefined) {
      setParts.push('href = @href')
      request.input('href', body.href)
    }
    if (body.icon !== undefined) {
      setParts.push('icon = @icon')
      request.input('icon', body.icon)
    }
    if (body.parent_id !== undefined) {
      setParts.push('parent_id = @parent_id')
      request.input('parent_id', body.parent_id)
    }
    if (body.sort_order !== undefined) {
      setParts.push('sort_order = @sort_order')
      request.input('sort_order', body.sort_order)
    }
    if (body.is_separator !== undefined) {
      setParts.push('is_separator = @is_separator')
      request.input('is_separator', body.is_separator)
    }
    if (body.is_active !== undefined) {
      setParts.push('is_active = @is_active')
      request.input('is_active', body.is_active)
    }

    // updated_at은 항상 현재 시간으로 설정
    setParts.push('updated_at = GETDATE()')

    const updateQuery = `
      UPDATE nuxt_menu 
      SET ${setParts.join(', ')}
      WHERE id = @id
    `

    request.input('id', id)
    await request.query(updateQuery)

    return {
      success: true,
      message: 'Menu updated successfully'
    }

  } catch (error) {
    console.error('메뉴 수정 오류:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: 'Failed to update menu'
    })
  }
}) 