import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

interface MarkReadBody {
  ids?: number[]
  markAll?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const userId = getCurrentUserId(event)
    const body = await readBody(event) as MarkReadBody
    const ids = Array.isArray(body?.ids) ? (body.ids as number[]).filter((v) => Number.isFinite(v)) : []
    const markAll = Boolean(body?.markAll)

    const connection = await getDbConnection()

    if (markAll) {
      const result = await connection.request()
        .input('user_id', sql.Int, userId)
        .query(`
          UPDATE notifications
          SET is_read = 1, read_at = GETDATE()
          WHERE user_id = @user_id AND is_read = 0
        `)
      return { success: true, updated: result.rowsAffected?.[0] || 0 }
    }

    if (!ids.length) {
      throw createError({ statusCode: 400, message: 'ids가 필요합니다.' })
    }

    if (ids.length > 200) {
      throw createError({ statusCode: 400, message: '한 번에 최대 200개까지 처리 가능합니다.' })
    }

    const req = connection.request().input('user_id', sql.Int, userId)
    const placeholders: string[] = []
    ids.forEach((id, idx) => {
      const name = `id${idx}`
      req.input(name, sql.Int, Number(id))
      placeholders.push(`@${name}`)
    })
    const inClause = placeholders.join(', ')

    const result = await req.query(`
      UPDATE notifications
      SET is_read = 1, read_at = GETDATE()
      WHERE user_id = @user_id AND id IN (${inClause})
    `)

    return { success: true, updated: result.rowsAffected?.[0] || 0 }
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: '알림 읽음 처리 중 오류가 발생했습니다.' })
  }
})


