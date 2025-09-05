import { getDbConnection } from '../../utils/db'

interface DepartmentCreateBody {
  name: string
  code: string
  description?: string
  parent_id?: number | null
  sort_order?: number
  is_active?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as DepartmentCreateBody
    if (!body?.name || !body?.code) {
      throw createError({ statusCode: 400, message: 'name, code는 필수입니다.' })
    }

    const connection = await getDbConnection()
    const result = await connection.request()
      .input('name', body.name)
      .input('code', body.code)
      .input('description', body.description || null)
      .input('parent_id', body.parent_id ?? null)
      .input('sort_order', body.sort_order ?? 0)
      .input('is_active', body.is_active ?? true)
      .query(`
        INSERT INTO departments (name, code, description, parent_id, sort_order, is_active)
        OUTPUT INSERTED.id
        VALUES (@name, @code, @description, @parent_id, @sort_order, @is_active)
      `)

    return { success: true, data: { id: result.recordset[0].id } }
  } catch (error) {
    console.error('부서 생성 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: '부서를 생성하지 못했습니다.' })
  }
})



