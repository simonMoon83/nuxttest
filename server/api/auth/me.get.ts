import { verifyToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'No token provided'
    })
  }

  const payload = verifyToken(token)
  
  if (!payload) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token'
    })
  }

  return {
    user: payload
  }
}) 