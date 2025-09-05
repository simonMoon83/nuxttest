import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const userId = getCurrentUserId(event)
    const body = await readBody(event) as { ids?: number[], mode?: 'inbox' | 'sent', all?: boolean }
    const ids = Array.isArray(body?.ids) ? body!.ids!.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0) : []
    const mode = body?.mode === 'sent' ? 'sent' : 'inbox'

    const connection = await getDbConnection()

    if (body?.all) {
      const where = mode === 'sent' ? 'sender_id = @user_id' : 'user_id = @user_id'
      const res = await connection.request()
        .input('user_id', sql.Int, userId)
        .query(`DELETE FROM notifications WHERE ${where}`)
      return { success: true, deleted: res?.rowsAffected?.[0] || 0 }
    }

    if (ids.length > 0) {
      const idList = ids.join(',')
      const where = mode === 'sent' ? 'sender_id = @user_id' : 'user_id = @user_id'
      const res = await connection.request()
        .input('user_id', sql.Int, userId)
        .query(`DELETE FROM notifications WHERE id IN (${idList}) AND ${where}`)
      return { success: true, deleted: res?.rowsAffected?.[0] || 0 }
    }

    return { success: false, message: '삭제할 항목이 없습니다.' }
  } catch (error) {
    console.error('알림 일괄 삭제 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: '알림 삭제 중 오류' })
  }
})


