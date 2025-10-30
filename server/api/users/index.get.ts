import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { parsePaginationParams, createPaginatedResponse, getSqlPagination } from '../../utils/pagination'
import { handleError } from '../../utils/error-handler'
import type { PaginatedResponse } from '../../types/api-response'

export default defineEventHandler(async (event): Promise<PaginatedResponse> => {
  try {
    const query = getQuery(event)
    const search = (query.search as string) || ''
    const deptName = (query.dept as string) || ''
    const departmentIdRaw = (query.departmentId as string) || ''
    const departmentId = departmentIdRaw ? Number(departmentIdRaw) : null

    // Parse pagination parameters
    const { page, pageSize, offset } = parsePaginationParams(query)

    const connection = await getDbConnection()

    // Get total count
    const countResult = await connection.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('deptName', sql.NVarChar, `%${deptName}%`)
      .input('departmentId', sql.Int, departmentId)
      .query(`
        SELECT COUNT(*) as total
        FROM app_users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE ((@search = '%%') OR (u.username LIKE @search OR u.email LIKE @search OR u.full_name LIKE @search))
          AND ((@departmentId IS NULL) OR (u.department_id = @departmentId))
          AND ((@deptName = '%%') OR (d.name LIKE @deptName))
      `)

    const total = countResult.recordset[0].total

    // Get paginated data
    const result = await connection.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('deptName', sql.NVarChar, `%${deptName}%`)
      .input('departmentId', sql.Int, departmentId)
      .query(`
        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at, u.updated_at,
               u.department_id, d.name AS department_name
        FROM app_users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE ((@search = '%%') OR (u.username LIKE @search OR u.email LIKE @search OR u.full_name LIKE @search))
          AND ((@departmentId IS NULL) OR (u.department_id = @departmentId))
          AND ((@deptName = '%%') OR (d.name LIKE @deptName))
        ORDER BY u.created_at DESC
        ${getSqlPagination(offset, pageSize)}
      `)

    return createPaginatedResponse(
      result.recordset,
      page,
      pageSize,
      total,
    )
  }
  catch (error) {
    return handleError(error, event)
  }
})


