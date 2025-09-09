import sql from 'mssql'
import { getDbConnection } from '../utils/db'
import { getRequestIP } from 'h3'

interface ContactBody {
  name?: string
  email: string
  message?: string
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({})) as ContactBody
  const name = (body?.name || '').toString().trim().slice(0, 200)
  const email = (body?.email || '').toString().trim().slice(0, 320)
  const message = (body?.message || '').toString().trim().slice(0, 4000)

  if (!email || !isValidEmail(email)) {
    throw createError({ statusCode: 400, message: '유효한 이메일을 입력하세요.' })
  }
  if (!message) {
    throw createError({ statusCode: 400, message: '메시지를 입력하세요.' })
  }

  const ip = (getRequestIP(event) || '').toString()
  const conn = await getDbConnection()

  // 간단 레이트 리밋: 동일 IP에서 1시간 이내 5건 초과 차단 + 테이블 보장
  try {
    const rate = await conn.request()
      .input('ip', sql.NVarChar(64), ip)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='contact_messages')
          CREATE TABLE contact_messages (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(200) NULL,
            email NVARCHAR(320) NOT NULL,
            message NVARCHAR(4000) NOT NULL,
            ip NVARCHAR(64) NULL,
            created_at DATETIME2 NOT NULL DEFAULT GETDATE()
          )
        SELECT COUNT(*) AS cnt FROM contact_messages WHERE ip=@ip AND created_at >= DATEADD(hour, -1, GETDATE())
      `)
    const cnt = rate.recordset?.[0]?.cnt || 0
    if (cnt >= 5) {
      throw createError({ statusCode: 429, message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' })
    }
  } catch (e: any) {
    if (e?.statusCode) throw e
  }

  const tx = new sql.Transaction(conn)
  await tx.begin()
  try {
    // 저장
    const ins = await new sql.Request(tx)
      .input('name', sql.NVarChar(200), name || null)
      .input('email', sql.NVarChar(320), email)
      .input('message', sql.NVarChar(4000), message)
      .input('ip', sql.NVarChar(64), ip || null)
      .query(`
        INSERT INTO contact_messages(name, email, message, ip)
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES(@name, @email, @message, @ip)
      `)
    const contactId = ins.recordset?.[0]?.id

    // 관리자 식별 (role 'admin'에 속한 사용자 대상)
    const adminIdsRes = await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_roles')
        CREATE TABLE user_roles (
          id INT IDENTITY(1,1) PRIMARY KEY,
          role_name NVARCHAR(50) UNIQUE NOT NULL,
          role_description NVARCHAR(200) NULL,
          is_active BIT NOT NULL DEFAULT 1,
          permissions NVARCHAR(MAX) NULL
        )
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_role_assignments')
        CREATE TABLE user_role_assignments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL,
          role_id INT NOT NULL
        )
      DECLARE @adminId INT = (SELECT TOP 1 id FROM user_roles WHERE role_name='admin')
      SELECT a.user_id AS id
      FROM user_role_assignments a
      WHERE a.role_id = @adminId
    `)
    const adminIds: number[] = (adminIdsRes.recordset || []).map((r: any) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0)
    const targets = adminIds.length ? adminIds : [1]  // fallback: id=1

    // 알림 생성 (관리자들에게)
    const title = '새 Contact Us 문의'
    const preview = `${name || '익명'} <${email}>`
    const bodyText = `${preview}: ${message.slice(0, 200)}`

    for (const uid of targets) {
      await new sql.Request(tx)
        .input('user_id', sql.Int, uid)
        .input('title', sql.NVarChar(200), title)
        .input('message', sql.NVarChar(1000), bodyText)
        .query(`
          INSERT INTO notifications (user_id, title, message)
          VALUES (@user_id, @title, @message)
        `)
    }

    await tx.commit()
    return { success: true, id: contactId }
  } catch (error) {
    await tx.rollback()
    throw createError({ statusCode: 500, message: '문의 접수 중 오류가 발생했습니다.' })
  }
})


