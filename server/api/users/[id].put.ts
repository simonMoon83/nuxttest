import { getDbConnection } from '../../utils/db'

interface UserUpdateBody {
  username?: string
  email?: string
  full_name?: string | null
  is_active?: boolean
  department_id?: number | null
}

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    if (!id) throw createError({ statusCode: 400, statusMessage: '잘못된 id' })

    const body = await readBody(event) as UserUpdateBody
    const connection = await getDbConnection()
    await connection.request()
      .input('id', id)
      .input('username', body.username ?? null)
      .input('email', body.email ?? null)
      .input('full_name', body.full_name ?? null)
      .input('is_active', body.is_active ?? true)
      .input('department_id', body.department_id ?? null)
      .query(`
        UPDATE app_users
        SET 
          username = COALESCE(@username, username),
          email = COALESCE(@email, email),
          full_name = @full_name,
          is_active = @is_active,
          department_id = @department_id,
          updated_at = GETDATE()
        WHERE id = @id
      `)

    return { success: true }
  } catch (error) {
    console.error('사용자 수정 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '사용자를 수정하지 못했습니다.' })
  }
})


