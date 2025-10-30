import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Require authentication - prevents CSRF attacks
  getCurrentUserId(event)

  deleteCookie(event, 'auth-token', { path: '/' })

  return {
    success: true,
    message: 'Logged out successfully',
  }
}) 