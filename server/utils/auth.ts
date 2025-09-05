import { verifyToken } from './jwt'

export function getCurrentUser(event: any): any {
  const token = getCookie(event, 'auth-token')
  if (!token) {
    throw createError({ statusCode: 401, message: '인증 토큰이 없습니다.' })
  }
  const payload = verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: '유효하지 않은 토큰입니다.' })
  }
  return payload
}

export function getCurrentUserId(event: any): number {
  const user = getCurrentUser(event)
  const id = (user as any)?.id
  if (!id) {
    throw createError({ statusCode: 401, message: '사용자 식별이 불가합니다.' })
  }
  return Number(id)
}


