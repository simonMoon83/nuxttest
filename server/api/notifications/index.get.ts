import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const userId = getCurrentUserId(event)
    const query = getQuery(event)
    const limitRaw = Number(query.limit || 50)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50

    const connection = await getDbConnection()
    const request = connection.request()
      .input('user_id', sql.Int, userId)
      .input('limit', sql.Int, limit)

    const listResult = await request.query(`
      SELECT id, title, message, is_read, created_at, read_at
      FROM notifications
      WHERE user_id = @user_id
      ORDER BY created_at DESC
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
    `)

    const unreadResult = await connection.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT COUNT(*) AS cnt FROM notifications
        WHERE user_id = @user_id AND is_read = 0
      `)

    return {
      success: true,
      data: listResult.recordset,
      unreadCount: unreadResult.recordset[0]?.cnt ?? 0,
    }
  } catch (error) {
    console.error('알림 목록 조회 실패:', error)
    throw createError({ statusCode: 500, statusMessage: '알림을 불러오지 못했습니다.' })
  }
})


