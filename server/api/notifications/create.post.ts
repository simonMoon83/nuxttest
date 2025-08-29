import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

interface CreateNotificationBody {
  title: string
  message?: string
  broadcast?: boolean
  targetUserIds?: number[]
}

export default defineEventHandler(async (event) => {
  try {
    // 인증 확인 (작성자 식별용)
    getCurrentUserId(event)
    const body = await readBody(event) as CreateNotificationBody
    if (!body?.title || typeof body.title !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'title은 필수입니다.' })
    }

    const connection = await getDbConnection()
    const title = (body.title || '').toString().slice(0, 200)
    const message = body.message ? body.message.toString().slice(0, 1000) : null

    const isBroadcast = Boolean(body?.broadcast)
    const rawIds = Array.isArray(body?.targetUserIds) ? body!.targetUserIds! : []
    const targetIds = Array.from(new Set(rawIds
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)))

    // case 1: 전체 발송
    if (isBroadcast) {
      const result = await connection.request()
        .input('title', sql.NVarChar(200), title)
        .input('message', sql.NVarChar(1000), message)
        .query(`
          INSERT INTO notifications (user_id, title, message)
          SELECT id, @title, @message
          FROM app_users
          WHERE is_active = 1
        `)
      const created = result?.rowsAffected?.[0] || 0
      return { success: true, created }
    }

    // case 2: 특정 수신자 지정
    if (targetIds.length > 0) {
      if (targetIds.length > 500) {
        throw createError({ statusCode: 400, statusMessage: '한 번에 최대 500명까지 지정 가능합니다.' })
      }
      const tx = new sql.Transaction(connection)
      await tx.begin()
      try {
        let created = 0
        for (const uid of targetIds) {
          const res = await new sql.Request(tx)
            .input('user_id', sql.Int, uid)
            .input('title', sql.NVarChar(200), title)
            .input('message', sql.NVarChar(1000), message)
            .query(`
              INSERT INTO notifications (user_id, title, message)
              VALUES (@user_id, @title, @message)
            `)
          created += res?.rowsAffected?.[0] || 0
        }
        await tx.commit()
        return { success: true, created }
      } catch (e) {
        await tx.rollback()
        throw e
      }
    }

    // case 3: 호환성 유지 - 대상 미제공 시 자기 자신에게 생성
    // (기존 클라이언트가 title, message만 보내는 경우를 지원)
    const currentUserId = getCurrentUserId(event)
    const res = await connection.request()
      .input('user_id', sql.Int, currentUserId)
      .input('title', sql.NVarChar(200), title)
      .input('message', sql.NVarChar(1000), message)
      .query(`
        INSERT INTO notifications (user_id, title, message)
        OUTPUT INSERTED.id
        VALUES (@user_id, @title, @message)
      `)
    const id = res.recordset?.[0]?.id
    return { success: true, id, created: id ? 1 : 0 }
  } catch (error) {
    console.error('알림 생성 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '알림 생성 중 오류가 발생했습니다.' })
  }
})


