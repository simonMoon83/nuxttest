import { getCurrentUser, getCurrentUserId } from '../../utils/auth'
import { getUserPermissions } from '../../utils/permissions'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const user = getCurrentUser(event)
  const permissions = await getUserPermissions(userId)

  // admin 계정은 모든 권한 허용
  if (user?.username === 'admin') {
    return { success: true, permissions: { all: true, ...permissions } }
  }

  return { success: true, permissions }
})


