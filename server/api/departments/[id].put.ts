import { getDbConnection } from '../../utils/db'

interface DepartmentUpdateBody {
  name?: string
  code?: string
  description?: string | null
  parent_id?: number | null
  sort_order?: number
  is_active?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    if (!id) throw createError({ statusCode: 400, statusMessage: '잘못된 id' })

    const body = await readBody(event) as DepartmentUpdateBody
    const connection = await getDbConnection()

    await connection.request()
      .input('id', id)
      .input('name', body.name ?? null)
      .input('code', body.code ?? null)
      .input('description', body.description ?? null)
      .input('parent_id', body.parent_id ?? null)
      .input('sort_order', body.sort_order ?? 0)
      .input('is_active', body.is_active ?? true)
      .query(`
        UPDATE departments
        SET 
          name = COALESCE(@name, name),
          code = COALESCE(@code, code),
          description = @description,
          parent_id = @parent_id,
          sort_order = @sort_order,
          is_active = @is_active,
          updated_at = GETDATE()
        WHERE id = @id
      `)

    return { success: true }
  } catch (error) {
    console.error('부서 수정 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '부서를 수정하지 못했습니다.' })
  }
})



