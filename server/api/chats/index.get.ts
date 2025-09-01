import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const connection = await getDbConnection()

  const q = getQuery(event) as any

  const result = await connection.request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT c.id, c.is_group, c.title, c.updated_at,
        (
          SELECT TOP 1 
            COALESCE(
              NULLIF(LTRIM(RTRIM(m.content)), ''),
              CASE WHEN EXISTS (SELECT 1 FROM chat_attachments a WHERE a.message_id = m.id) THEN N'파일 첨부' ELSE '' END
            )
          FROM chat_messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC
        ) AS last_content,
        (
          SELECT TOP 1 m.created_at 
          FROM chat_messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC
        ) AS last_at,
        (
          SELECT TOP 1 CONVERT(varchar(19), m.created_at, 120)
          FROM chat_messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC
        ) AS last_at_text,
        (
          SELECT TOP 1 COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username)
          FROM chat_messages m
          JOIN app_users u ON u.id = m.sender_id
          WHERE m.chat_id = c.id
          ORDER BY m.created_at DESC
        ) AS last_sender_name,
        (
          SELECT COUNT(1) FROM chat_messages m
          WHERE m.chat_id = c.id
            AND m.id > ISNULL(cm.last_read_message_id, 0)
            AND m.sender_id <> @user_id
            AND m.created_at >= DATEADD(day, -7, GETDATE())
        ) AS unread_count,
        (
          SELECT TOP 1 u.id
          FROM chat_members cm2
          JOIN app_users u ON u.id = cm2.user_id
          WHERE cm2.chat_id = c.id AND u.id <> @user_id
          ORDER BY u.id
        ) AS other_user_id,
        (
          SELECT TOP 1 COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username)
          FROM chat_members cm2
          JOIN app_users u ON u.id = cm2.user_id
          WHERE cm2.chat_id = c.id AND u.id <> @user_id
          ORDER BY u.id
        ) AS other_user_name,
        (
          SELECT COUNT(1) FROM chat_members cmx WHERE cmx.chat_id = c.id
        ) AS member_count
      FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = @user_id
      ORDER BY c.updated_at DESC
    `)

  return { success: true, data: result.recordset }
})
