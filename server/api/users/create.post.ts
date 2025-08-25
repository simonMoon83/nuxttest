import { getDbConnection } from '../../utils/db'

interface UserCreateBody {
  username: string
  email: string
  full_name?: string
  is_active?: boolean
  department_id?: number | null
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as UserCreateBody
    if (!body?.username || !body?.email) {
      throw createError({ statusCode: 400, statusMessage: 'username, email은 필수입니다.' })
    }

    const connection = await getDbConnection()
    const result = await connection.request()
      .input('username', body.username)
      .input('email', body.email)
      .input('full_name', body.full_name || null)
      .input('is_active', body.is_active ?? true)
      .input('department_id', body.department_id ?? null)
      .query(`
        INSERT INTO app_users (username, email, full_name, password, is_active, department_id)
        OUTPUT INSERTED.id
        VALUES (@username, @email, @full_name, '!', @is_active, @department_id)
      `)

    return { success: true, data: { id: result.recordset[0].id } }
  } catch (error) {
    console.error('사용자 생성 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '사용자를 생성하지 못했습니다.' })
  }
})


