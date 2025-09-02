import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const userId = getCurrentUserId(event)
    const query = getQuery(event)
    const limitRaw = Number(query.limit || 50)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50
    const mode = (query.mode as string) || 'inbox' // inbox | sent
    const q = ((query.q as string) || '').toString().trim()

    const connection = await getDbConnection()
    const request = connection.request()
      .input('user_id', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .input('q', sql.NVarChar(200), `%${q}%`)

    const where = mode === 'sent'
      ? `sender_id = @user_id`
      : `user_id = @user_id`

    const listResult = await request.query(`
      SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.read_at, n.sender_id,
             CONVERT(varchar(19), n.created_at, 120) AS created_at_text,
             CASE WHEN n.read_at IS NULL THEN NULL ELSE CONVERT(varchar(19), n.read_at, 120) END AS read_at_text,
             s.full_name AS sender_name, s.username AS sender_username
      FROM notifications n
      LEFT JOIN app_users s ON s.id = n.sender_id
      WHERE ${where}
        AND (@q = '%%' OR n.title LIKE @q OR n.message LIKE @q)
      ORDER BY n.created_at DESC
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


