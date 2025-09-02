import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const userId = getCurrentUserId(event)
    const id = Number(getRouterParam(event, 'id'))
    if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: '잘못된 id' })

    const connection = await getDbConnection()
    const res = await connection.request()
      .input('id', sql.Int, id)
      .input('user_id', sql.Int, userId)
      .query(`
        DELETE FROM notifications
        WHERE id = @id AND (user_id = @user_id OR sender_id = @user_id)
      `)

    const deleted = res?.rowsAffected?.[0] || 0
    if (deleted === 0) throw createError({ statusCode: 404, statusMessage: '삭제할 알림이 없거나 권한이 없습니다.' })

    return { success: true, deleted }
  } catch (error) {
    console.error('알림 삭제 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '알림 삭제 중 오류' })
  }
})


