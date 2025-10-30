import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'
import { parsePaginationParams, createPaginatedResponse, getSqlPagination } from '../../utils/pagination'
import { handleError } from '../../utils/error-handler'
import type { PaginatedResponse } from '../../types/api-response'

export default defineEventHandler(async (event): Promise<PaginatedResponse> => {
  try {
    const userId = getCurrentUserId(event)
    const query = getQuery(event)
    const mode = (query.mode as string) || 'inbox' // inbox | sent
    const q = ((query.q as string) || '').toString().trim()

    // Parse pagination parameters
    const { page, pageSize, offset } = parsePaginationParams(query)

    const connection = await getDbConnection()

    const where = mode === 'sent'
      ? `sender_id = @user_id`
      : `user_id = @user_id`

    // Get total count
    const countResult = await connection.request()
      .input('user_id', sql.Int, userId)
      .input('q', sql.NVarChar(200), `%${q}%`)
      .query(`
        SELECT COUNT(*) as total
        FROM notifications n
        WHERE ${where}
          AND (@q = '%%' OR n.title LIKE @q OR n.message LIKE @q)
      `)

    const total = countResult.recordset[0].total

    // Get paginated data
    const listResult = await connection.request()
      .input('user_id', sql.Int, userId)
      .input('q', sql.NVarChar(200), `%${q}%`)
      .query(`
        SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.read_at, n.sender_id,
               CONVERT(varchar(19), n.created_at, 120) AS created_at_text,
               CASE WHEN n.read_at IS NULL THEN NULL ELSE CONVERT(varchar(19), n.read_at, 120) END AS read_at_text,
               s.full_name AS sender_name, s.username AS sender_username
        FROM notifications n
        LEFT JOIN app_users s ON s.id = n.sender_id
        WHERE ${where}
          AND (@q = '%%' OR n.title LIKE @q OR n.message LIKE @q)
        ORDER BY n.created_at DESC
        ${getSqlPagination(offset, pageSize)}
      `)

    // Get unread count (for meta)
    const unreadResult = await connection.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT COUNT(*) AS cnt FROM notifications
        WHERE user_id = @user_id AND is_read = 0
      `)

    return createPaginatedResponse(
      listResult.recordset,
      page,
      pageSize,
      total,
      {
        unreadCount: unreadResult.recordset[0]?.cnt ?? 0,
        mode,
      },
    )
  }
  catch (error) {
    return handleError(error, event)
  }
})


