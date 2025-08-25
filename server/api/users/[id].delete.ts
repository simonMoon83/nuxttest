import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    if (!id) throw createError({ statusCode: 400, statusMessage: '잘못된 id' })

    const connection = await getDbConnection()
    await connection.request()
      .input('id', id)
      .query(`DELETE FROM app_users WHERE id = @id`)

    return { success: true }
  } catch (error) {
    console.error('사용자 삭제 실패:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, statusMessage: '사용자를 삭제하지 못했습니다.' })
  }
})



