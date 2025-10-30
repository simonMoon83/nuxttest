export default defineEventHandler(async (event) => {
  deleteCookie(event, 'auth-token', { path: '/' })
  
  return {
    success: true,
    message: 'Logged out successfully'
  }
}) 