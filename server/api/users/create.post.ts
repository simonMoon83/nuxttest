import { getDbConnection } from '../../utils/db'

interface UserCreateBody {
  username: string
  email: string
  full_name?: string
  is_active?: boolean
  department_id?: number | null
  password?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as UserCreateBody
    if (!body?.username || !body?.email) {
      throw createError({ statusCode: 400, message: 'username, email은 필수입니다.' })
    }

    const connection = await getDbConnection()
    const bcryptMod = await import('bcryptjs')
    const bcryptHash = (bcryptMod as any)?.default?.hash ?? (bcryptMod as any).hash
    const password = body.password && body.password.length >= 6 ? await bcryptHash(body.password, 10) : '!'
    const result = await connection.request()
      .input('username', body.username)
      .input('email', body.email)
      .input('full_name', body.full_name || null)
      .input('password', password)
      .input('is_active', body.is_active ?? true)
      .input('department_id', body.department_id ?? null)
      .query(`
        INSERT INTO app_users (username, email, full_name, password, is_active, department_id)
        OUTPUT INSERTED.id
        VALUES (@username, @email, @full_name, @password, @is_active, @department_id)
      `)

    return { success: true, data: { id: result.recordset[0].id } }
  } catch (error) {
    console.error('사용자 생성 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: '사용자를 생성하지 못했습니다.' })
  }
})


