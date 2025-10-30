import bcrypt from 'bcryptjs'
import { getDbConnection } from '../../utils/db'
import { generateToken } from '../../utils/jwt'
import { checkLoginRateLimit, rateLimiter } from '../../utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { username, password } = body

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        message: 'Username and password are required',
      })
    }

    // Rate limiting - prevent brute force attacks
    const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    const limit = checkLoginRateLimit(ip)

    if (!limit.allowed) {
      throw createError({
        statusCode: 429,
        message: `Too many login attempts. Try again in ${limit.retryAfter} seconds`,
      })
    }

    const connection = await getDbConnection()
    
    // 사용자 조회 (app_users 테이블 사용)
    const result = await connection.request()
      .input('username', username)
      .query(`
        SELECT id, username, email, password, full_name, is_active, password_changed_at
        FROM app_users 
        WHERE username = @username AND is_active = 1
      `)

    const user = result.recordset[0]
    
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }

    // JWT 토큰 생성
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
    })

    // 로그인 성공 - rate limit 리셋
    rateLimiter.reset(ip)

    // 쿠키에 토큰 설정 (세션 쿠키: 브라우저 닫으면 삭제)
    const forwardedProto = getHeader(event, 'x-forwarded-proto')
    const isHttps = forwardedProto === 'https'
    const cookieSecure
      = process.env.COOKIE_SECURE === 'true'
      || (process.env.NODE_ENV === 'production' && isHttps)

    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      path: '/',
    })

    // Check if password change is required (production only, first login)
    const requirePasswordChange
      = process.env.NODE_ENV === 'production'
      && !user.password_changed_at

    return {
      success: true,
      requirePasswordChange,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}) 